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
import { scryptSync, timingSafeEqual } from 'node:crypto'
import OpenAI from 'openai'
import { dataES, dataEN } from '../src/data.js'

// NVIDIA NIM habla el protocolo de OpenAI, de ahí el SDK. El modelo es abierto,
// no es Claude. NO se usa json_schema: ver pedirJSON(), su decodificación
// restringida se atasca con este modelo y devuelve la respuesta cortada.
// Medido contra la oferta de Factorial con este mismo código:
//   nemotron-3-super-120b-a12b  17-24s  ✓ (MoE, 12B activos: por eso vuela)
//   meta/llama-3.3-70b-instruct    112s  ✗ texto corrupto, perfil en otro idioma
//   openai/gpt-oss-120b            565s  ✗ inviable en serverless
// Cámbialo con TAILOR_MODEL si quieres reevaluar.
const MODEL = process.env.TAILOR_MODEL || 'nvidia/nemotron-3-super-120b-a12b'
const BASE_URL = 'https://integrate.api.nvidia.com/v1'

export const maxDuration = 300

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

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'
const bajar = (url) => fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })

// Ashby y compañía son React puro: el HTML no trae ni una línea de la oferta,
// y strip() devolvía menos de 400 caracteres, así que el scrape moría con un
// "pide login" que era mentira. Pero sí publican la oferta entera en el
// <script type="application/ld+json"> de schema.org, que strip() borraba junto
// con el resto de scripts. Es un estándar, no un apaño para un portal: lo
// sirven Ashby, Greenhouse, Indeed, InfoJobs y cualquiera que quiera salir en
// Google for Jobs.
export function jobPosting(html) {
  for (const [, crudo] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      // Algunos lo envuelven en @graph o en un array; se aplana y se busca.
      const d = JSON.parse(crudo)
      const nodos = [d, ...(d['@graph'] ?? []), ...(Array.isArray(d) ? d : [])]
      const j = nodos.find((n) => n?.['@type'] === 'JobPosting' && n.description)
      if (j) return strip([j.title, j.hiringOrganization?.name, j.jobLocation?.address?.addressLocality, j.description].filter(Boolean).join('\n'))
    } catch {
      // Un ld+json roto no debe tumbar el scrape: se prueba el siguiente.
    }
  }
  return null
}

// Workable sirve una cáscara vacía SIN ld+json, pero tiene API pública. La
// cuenta no está en el enlace corto (/j/<code>), solo aparece tras la
// redirección — de ahí que se mire res.url y no la URL que te pasaron.
const WORKABLE = /apply\.workable\.com\/([^/]+)\/j\/([^/?]+)/

export async function fetchOffer(url) {
  const m = LINKEDIN_ID.exec(url)
  const res = await bajar(m ? GUEST + m[1] : url)
  if (!res.ok) throw new Error(`El portal respondió ${res.status}. Pega el texto de la oferta a mano.`)
  const html = await res.text()

  const wk = WORKABLE.exec(res.url)
  // El JSON de la API no lleva etiquetas, pero la descripción de dentro sí:
  // strip() la limpia igual que haría con una página.
  if (wk) {
    const api = strip(await (await bajar(`https://apply.workable.com/api/v2/accounts/${wk[1]}/jobs/${wk[2]}`)).text())
    if (api.length >= 400) return api
  }

  // Se queda el más largo de los dos, no el ld+json siempre: en RemoteOK el
  // ld+json trae 1.000 caracteres y la página 13.000. El modelo tolera el ruido
  // de una página entera mucho mejor que la falta de media oferta.
  const plano = strip(html)
  const ld = jobPosting(html) ?? ''
  const text = ld.length > plano.length ? ld : plano

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
  // Sin decodificación restringida el parche puede venir incompleto (un puesto
  // de menos, skills sin una categoría). Antes lo garantizaba el esquema; ahora
  // lo garantiza esto: lo que falte se queda como está en el CV maestro, que es
  // el comportamiento correcto de un parche.
  const original = (i) => ({ description: cv.experience[i].description, achievements: cv.experience[i].achievements, tech: cv.experience[i].tech })
  const puesto = (i) => ({ ...original(i), ...(patch.experience?.[i] ?? {}) })
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
    title: patch.title || cv.title,
    profile: patch.profile || cv.profile,
    experience: cv.experience.map((e, i) => {
      const p = puesto(i)
      return {
        ...e, // project, role y dates intactos por construcción
        description: p.description,
        achievements: (p.achievements ?? e.achievements).slice(0, 3),
        tech: keepKnown(p.tech ?? [], e.tech),
      }
    }),
    skills: Object.fromEntries(
      Object.entries(cv.skills).map(([k, v]) => [k, keepKnown(patch.skills?.[k] ?? [], v)])
    ),
  }
  return { data, dropped: [...new Set(dropped)] }
}

// El texto libre no se puede validar contra una lista como tech y skills. Pero
// hay una señal barata y precisa: si el modelo declara algo en "gaps" y acto
// seguido lo escribe, se está contradiciendo a sí mismo, y eso es exactamente
// una invención. Medido: con nemotron ocurre a la primera ("Spec-Driven
// Development", "evals").
//
// `written` es el texto a vigilar, lo junta quien llama: en /api/tailor son los
// campos reescritos del CV; en /api/cover, la carta entera.
export function findInventions(cv, gaps, written) {
  const STOP = new Set(['No', 'Not', 'No explicit', 'The', 'A', 'An', 'Factorial', 'I'])
  // Frases en Mayúscula Inicial y siglas: "Spec-Driven Development", "MCP".
  const terms = new Set()
  for (const g of gaps ?? []) {
    for (const raw of g.match(/\b[A-Z][A-Za-z0-9.+#-]*(?:[ -][A-Z][A-Za-z0-9.+#-]*)*/g) ?? []) {
      // El '.' va en la clase para no partir "Node.js", así que se cuela el
      // punto final de la frase: se recorta solo al final, nunca en medio.
      const m = raw.replace(/[.\-+]+$/, '')
      if (m.length > 2 && !STOP.has(m)) terms.add(m)
    }
  }
  // Lo que ya estaba en tu CV es legítimo, aunque el modelo lo liste como gap.
  const master = JSON.stringify(cv)
  const has = (hay, needle) => hay.toLowerCase().includes(needle.toLowerCase())

  return [...terms].filter((t) => has(written, t) && !has(master, t))
}

// Verifica una contraseña contra un hash `salt:derivado` (hex) de scrypt, en
// tiempo constante. scrypt es stdlib: ni bcrypt ni ninguna dependencia. El
// mismo formato que genera scripts/set-password.js.
export function verifyPassword(password, stored) {
  const [salt, hex] = String(stored).split(':')
  if (!salt || !hex) return false
  const esperado = Buffer.from(hex, 'hex')
  const recibido = scryptSync(String(password), salt, esperado.length)
  // Longitudes distintas harían petar timingSafeEqual: se descarta antes.
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
}

// Puerta compartida por /api/tailor, /api/audit, /api/feed y /api/cover. Devuelve
// null si todo va bien, o el error ya enviado; el llamante solo hace return.
//
// La URL de Vercel es pública y cada llamada gasta créditos de tu cuenta.
// ponytail: un secreto compartido, no OAuth. Un solo usuario, un solo secreto.
// En producción se exige SIEMPRE: si falta el secreto, no se atiende a nadie
// (fallar cerrado). En local es opcional para poder probar sin fricción.
//
// El secreto se guarda hasheado en TAILOR_PASSWORD_HASH; TAILOR_PASSWORD en
// claro sigue valiendo como camino de compatibilidad, para que un despliegue no
// te deje fuera mientras migras. Pon el hash, comprueba, y borra la clave clara.
//
// needsKey=false para los endpoints que no llaman al modelo (/api/feed): la
// contraseña se sigue exigiendo igual, pero faltar la clave de NVIDIA no es
// motivo para negarles servicio.
export function gate(req, res, needsKey = true) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' })

  const hash = process.env.TAILOR_PASSWORD_HASH
  const claro = process.env.TAILOR_PASSWORD
  if (process.env.VERCEL || hash || claro) {
    if (!hash && !claro) {
      return res.status(500).json({ error: 'Falta TAILOR_PASSWORD_HASH en el entorno: el endpoint queda cerrado.' })
    }
    const enviada = req.headers['x-tailor-key'] ?? ''
    const ok = hash ? verifyPassword(enviada, hash) : enviada === claro
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta.' })
  }

  if (needsKey && !process.env.NVIDIA_API_KEY) {
    return res.status(500).json({
      error: 'Falta NVIDIA_API_KEY. En local: ponla en .env.local. Desplegado: vercel env add NVIDIA_API_KEY.',
    })
  }
  return null
}

// timeout y maxRetries explícitos: por defecto el SDK reintenta dos veces y
// espera 10 minutos, así que una llamada atascada se comía el techo de 300 s de
// la función sin que nadie viera por qué. Mejor fallar a los 100 s y decirlo.
export const client = () => new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY, baseURL: BASE_URL, timeout: 120000, maxRetries: 1,
})
export { MODEL }

// La única forma de pedirle JSON al modelo, compartida por /api/tailor,
// /api/audit y /api/cover.
//
// NO usa response_format json_schema. La decodificación restringida de NIM se
// atasca con este modelo: deja de emitir a mitad del objeto y RELLENA CON
// ESPACIOS hasta agotar max_tokens, así que la llamada vuelve con
// finish_reason "length" y el JSON incompleto. Es la tercera vez que la
// decodificación restringida rompe algo aquí (antes fue el minLength que
// degeneraba el veredicto en un bucle). Medido sobre la misma oferta:
//   json_schema strict:true    0 de 6 respuestas buenas
//   json_schema strict:false   0 de 2   (NIM la restringe igual)
//   json_object                5 de 5, y además más rápido
// El esquema viaja en el prompt —con sus `description`, que es donde el modelo
// lee cuánto escribir en cada campo— y el JSON se valida aquí. La garantía
// anti-invención nunca fue el esquema: es applyPatch, que es código.
export async function pedirJSON({ system, user, schema, max_tokens = 8000 }) {
  let completion
  try {
    completion = await client().chat.completions.create({
      model: MODEL,
      max_tokens,
      messages: [
        { role: 'system', content: `${system}\n\nDevuelve SOLO un objeto JSON, sin texto alrededor, con este esquema exacto:\n${JSON.stringify(schema)}` },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    })
  } catch (e) {
    // El SDK dice "Request timed out." y nada más. Aquí se sabe contra qué se
    // estaba hablando, así que se dice.
    throw new Error(/timed? ?out/i.test(e.message)
      ? 'El modelo no ha respondido a tiempo (NVIDIA va lento ahora mismo). Vuelve a probar.'
      : e.message)
  }
  const choice = completion.choices?.[0]
  // Algún modelo envuelve el JSON en ```json … ```. Quitarlo es una línea.
  const crudo = String(choice?.message?.content ?? '').trim().replace(/^```(?:json)?|```$/g, '').trim()
  try {
    return { datos: JSON.parse(crudo), usage: completion.usage }
  } catch {
    throw new Error(choice?.finish_reason === 'length'
      ? 'La respuesta del modelo se ha cortado. Prueba con una oferta más corta.'
      : 'El modelo no ha devuelto JSON válido. Vuelve a intentarlo.')
  }
}

export default async function handler(req, res) {
  const blocked = gate(req, res)
  if (blocked) return blocked

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

    const { datos: patch, usage } = await pedirJSON({
      system: SYSTEM,
      schema: schema(cv.experience.length),
      // El idioma va aquí y al final, no en el system: enterrado allí lo
      // ignoraba y devolvía inglés con el CV en español (probado).
      user: `CV actual:\n${JSON.stringify(editable, null, 2)}\n\n---\n\nOFERTA:\n${offer.slice(0, 40000)}\n\n---\n\n`
        + `IDIOMA OBLIGATORIO DE SALIDA: ${lang === 'es' ? 'ESPAÑOL' : 'INGLÉS'}. `
        + `Escribe title, profile, description y achievements en ${lang === 'es' ? 'español' : 'inglés'}, `
        + `aunque la oferta esté en otro idioma. Los nombres de tecnologías no se traducen.`,
    })

    const { data, dropped } = applyPatch(cv, patch)

    res.status(200).json({
      data,
      role: patch.role,
      company: patch.company,
      gaps: patch.gaps ?? [],
      dropped, // tech inventada: bloqueada automáticamente
      // texto libre: NO se puede bloquear como tech/skills, solo avisar
      // Se vigila el CV YA aplicado, no el parche: si el parche vino incompleto
      // lo que acaba en el PDF es data, y es eso lo que hay que revisar.
      inventions: findInventions(cv, patch.gaps, [data.title, data.profile,
        ...data.experience.flatMap((e) => [e.description, ...e.achievements])].join('\n')),
      usage: { input: usage?.prompt_tokens, output: usage?.completion_tokens },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
