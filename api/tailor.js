// Función serverless: oferta (URL o texto) -> CV adaptado.
// POST /api/tailor  { url?, text?, lang: "es"|"en" }
//
// ponytail: el modelo NO devuelve el CV entero, devuelve un parche con los
// únicos campos que puede reescribir (title, profile, descripciones, logros,
// orden de tecnologías). Empresas, fechas, puestos, estudios, certificaciones y
// contacto ni se le envían para que los reescriba ni se aceptan de vuelta: es
// imposible que invente un empleo aunque el prompt falle. Y las tecnologías se
// filtran contra las del CV maestro, así que tampoco puede añadir un stack que
// no tienes.
import OpenAI from 'openai'
import { dataES, dataEN } from '../src/data.js'

// NVIDIA NIM habla el protocolo de OpenAI, de ahí el SDK. El modelo es abierto,
// no es Claude. Verificado contra la API real: llama-3.3-70b acepta
// response_format json_schema con strict:true, así que el JSON viene garantizado
// por el servidor y no hacen falta reintentos de parseo.
// Medido contra la oferta de Factorial con este mismo código:
//   nemotron-3-super-120b-a12b  17-24s  ✓ (MoE, 12B activos: por eso vuela)
//   meta/llama-3.3-70b-instruct    112s  ✗ texto corrupto, perfil en otro idioma
//   openai/gpt-oss-120b            565s  ✗ inviable en serverless
// Cámbialo con TAILOR_MODEL si quieres reevaluar.
const MODEL = process.env.TAILOR_MODEL || 'nvidia/nemotron-3-super-120b-a12b'
const BASE_URL = 'https://integrate.api.nvidia.com/v1'

export const maxDuration = 60

const LINKEDIN_ID = /(?:currentJobId=|\/jobs\/view\/(?:[^/?]*-)?)(\d{6,})/
const GUEST = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/'

// Sin dependencia de parseo: quitar scripts y etiquetas basta para dárselo al
// modelo, que tolera el ruido mucho mejor que un selector CSS el rediseño de
// un portal.
export const strip = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

async function fetchOffer(url) {
  const m = LINKEDIN_ID.exec(url)
  const target = m ? GUEST + m[1] : url
  const res = await fetch(target, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`El portal respondió ${res.status}. Pega el texto de la oferta a mano.`)
  const text = strip(await res.text())
  if (text.length < 400) throw new Error('Apenas se ha extraído texto: la oferta pide login. Pega el texto a mano.')
  return text
}

// --- lo único que el modelo puede escribir ---------------------------------
const schema = (n) => ({
  type: 'object',
  properties: {
    title: { type: 'string' },
    profile: { type: 'string' },
    experience: {
      type: 'array', minItems: n, maxItems: n,
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          achievements: { type: 'array', items: { type: 'string' }, maxItems: 3 },
          tech: { type: 'array', items: { type: 'string' } },
        },
        required: ['description', 'achievements', 'tech'],
        additionalProperties: false,
      },
    },
    skills: {
      type: 'object',
      properties: {
        backend: { type: 'array', items: { type: 'string' } },
        frontend: { type: 'array', items: { type: 'string' } },
        ai_devops: { type: 'array', items: { type: 'string' } },
        databases: { type: 'array', items: { type: 'string' } },
      },
      required: ['backend', 'frontend', 'ai_devops', 'databases'],
      additionalProperties: false,
    },
    role: { type: 'string', description: 'Rol exacto de la oferta' },
    company: { type: 'string' },
    gaps: {
      type: 'array',
      description: 'Lo que la oferta pide y el CV NO respalda. Nunca se añade al CV.',
      items: { type: 'string' },
    },
  },
  required: ['title', 'profile', 'experience', 'skills', 'role', 'company', 'gaps'],
  additionalProperties: false,
})

const SYSTEM = `Eres un recruiter técnico senior adaptando un CV a una oferta concreta.

REGLA ABSOLUTA: no inventas nada. Solo puedes reordenar, reformular y enfatizar
hechos que YA están en el CV. Si la oferta pide algo que el CV no respalda, va en
"gaps", nunca en el CV.

- title: alinéalo con el rol de la oferta SOLO si la experiencia real lo sostiene.
- profile: 3-4 frases, con el vocabulario de la oferta, solo hechos del CV.
- experience: mismo orden y número de puestos. Reescribe description y ordena los
  achievements de más a menos relevante para esta oferta (máximo 3 por puesto).
  En "tech" solo reordenas: pon primero lo que pide la oferta.
- skills: solo reordenar dentro de cada categoría.
- No metas métricas, años ni porcentajes que no estén ya en el CV.`

// --- red de seguridad -------------------------------------------------------
// Aunque el modelo devuelva basura, de aquí no sale nada que no esté en el CV
// maestro. Es la garantía real del "no inventes": código, no prompt.
export function applyPatch(cv, patch) {
  const dropped = []
  // Compara ignorando el matiz entre paréntesis ("Python (Expert)" ≡ "Python")
  // pero devuelve SIEMPRE el string del CV maestro, nunca el del modelo: así
  // reordenar funciona sin que se pierdan los matices que tú escribiste.
  const norm = (s) => s.replace(/\s*\(.*?\)/g, '').trim().toLowerCase()
  const keepKnown = (proposed, allowed) => {
    const byNorm = new Map(allowed.map((t) => [norm(t), t]))
    const ordered = []
    for (const p of proposed) {
      const hit = byNorm.get(norm(p))
      if (!hit) dropped.push(p)
      else if (!ordered.includes(hit)) ordered.push(hit)
    }
    return [...ordered, ...allowed.filter((t) => !ordered.includes(t))] // reordena, nunca pierde
  }

  // ponytail: `data` se construye antes del return. En un objeto literal las
  // propiedades se evalúan en orden, así que `dropped` se copiaría vacío.
  const data = {
    ...cv,
    title: patch.title,
    profile: patch.profile,
    experience: cv.experience.map((e, i) => ({
      ...e, // project, role y dates intactos por construcción
      description: patch.experience[i].description,
      achievements: patch.experience[i].achievements.slice(0, 3),
      tech: keepKnown(patch.experience[i].tech, e.tech),
    })),
    skills: Object.fromEntries(
      Object.entries(cv.skills).map(([k, v]) => [k, keepKnown(patch.skills[k] ?? [], v)])
    ),
  }
  return { data, dropped: [...new Set(dropped)] }
}

// Los campos de texto libre (profile, title, description, achievements) no se
// pueden validar contra una lista como tech y skills. Pero hay una señal barata
// y precisa: si el modelo declara algo en "gaps" y acto seguido lo escribe en el
// CV, se está contradiciendo a sí mismo, y eso es exactamente una invención.
// Medido: con nemotron ocurre a la primera ("Spec-Driven Development", "evals").
export function findInventions(cv, patch) {
  const STOP = new Set(['No', 'Not', 'No explicit', 'The', 'A', 'An', 'Factorial', 'I'])
  // Frases en Mayúscula Inicial y siglas: "Spec-Driven Development", "MCP".
  const terms = new Set()
  for (const g of patch.gaps ?? []) {
    for (const raw of g.match(/\b[A-Z][A-Za-z0-9.+#-]*(?:[ -][A-Z][A-Za-z0-9.+#-]*)*/g) ?? []) {
      // El '.' va en la clase para no partir "Node.js", así que se cuela el
      // punto final de la frase: se recorta solo al final, nunca en medio.
      const m = raw.replace(/[.\-+]+$/, '')
      if (m.length > 2 && !STOP.has(m)) terms.add(m)
    }
  }
  const written = [patch.title, patch.profile,
    ...patch.experience.flatMap((e) => [e.description, ...e.achievements])].join('\n')
  // Lo que ya estaba en tu CV es legítimo, aunque el modelo lo liste como gap.
  const master = JSON.stringify(cv)
  const has = (hay, needle) => hay.toLowerCase().includes(needle.toLowerCase())

  return [...terms].filter((t) => has(written, t) && !has(master, t))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' })

  // La URL de Vercel es pública y cada llamada gasta créditos de tu cuenta.
  // ponytail: un secreto compartido, no OAuth. Un solo usuario, un solo secreto.
  // En producción se exige SIEMPRE: si falta la variable, no se atiende a nadie
  // (fallar cerrado). En local es opcional para poder probar sin fricción.
  const expected = process.env.TAILOR_PASSWORD
  if (process.env.VERCEL || expected) {
    if (!expected) {
      return res.status(500).json({ error: 'Falta TAILOR_PASSWORD en el entorno: el endpoint queda cerrado.' })
    }
    if (req.headers['x-tailor-key'] !== expected) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' })
    }
  }

  if (!process.env.NVIDIA_API_KEY) {
    return res.status(500).json({
      error: 'Falta NVIDIA_API_KEY. En local: ponla en .env.local. Desplegado: vercel env add NVIDIA_API_KEY.',
    })
  }

  try {
    const { url, text, lang = 'en' } = req.body ?? {}
    const offer = text?.trim() || (url ? await fetchOffer(url) : null)
    if (!offer) return res.status(400).json({ error: 'Pasa la URL de la oferta o su texto.' })

    const cv = lang === 'es' ? dataES : dataEN
    // Solo se le manda lo que puede tocar.
    const editable = {
      title: cv.title,
      profile: cv.profile,
      experience: cv.experience.map((e) => ({
        empresa: e.project, puesto: e.role, description: e.description, achievements: e.achievements, tech: e.tech,
      })),
      skills: cv.skills,
    }

    const client = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: BASE_URL })
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          // El idioma va aquí y al final, no en el system: enterrado allí lo
          // ignoraba y devolvía inglés con el CV en español (probado).
          role: 'user',
          content: `CV actual:\n${JSON.stringify(editable, null, 2)}\n\n---\n\nOFERTA:\n${offer.slice(0, 40000)}\n\n---\n\n`
            + `IDIOMA OBLIGATORIO DE SALIDA: ${lang === 'es' ? 'ESPAÑOL' : 'INGLÉS'}. `
            + `Escribe title, profile, description y achievements en ${lang === 'es' ? 'español' : 'inglés'}, `
            + `aunque la oferta esté en otro idioma. Los nombres de tecnologías no se traducen.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'cv_patch', strict: true, schema: schema(cv.experience.length) },
      },
    })
    const choice = completion.choices?.[0]
    if (choice?.finish_reason === 'length') {
      return res.status(502).json({ error: 'La respuesta se ha cortado. Prueba con una oferta más corta.' })
    }
    const patch = JSON.parse(choice.message.content)

    const { data, dropped } = applyPatch(cv, patch)

    res.status(200).json({
      data,
      role: patch.role,
      company: patch.company,
      gaps: patch.gaps,
      dropped, // tech inventada: bloqueada automáticamente
      inventions: findInventions(cv, patch), // texto libre: NO se puede bloquear, se avisa
      usage: { input: completion.usage?.prompt_tokens, output: completion.usage?.completion_tokens },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
