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
// La puerta y las vías viven fuera: así /api/feed y /api/pdf pueden exigir la
// contraseña sin cargar el SDK de OpenAI que se importa aquí arriba.
import { gate, vias } from '../src/acceso.js'
// El scrape vive fuera por el mismo motivo que la puerta: /api/feed lo usa y no
// tiene por qué cargar el SDK del modelo para bajarse una oferta.
import { fetchOffer } from '../src/scrape.js'

// NVIDIA NIM habla el protocolo de OpenAI, de ahí el SDK. El modelo es abierto,
// no es Claude. NO se usa json_schema: ver pedirJSON(), su decodificación
// restringida se atasca y devuelve la respuesta cortada.
// Medido 01-09-2026 adaptando la oferta de Chery (Big Data, que el CV no cubre):
//   minimaxai/minimax-m3         48-83s  ✓ 3 de 3, ~1.050 tokens, adapta el título
//   nvidia/nemotron-3-super-120b   107s  ✓ pero 6.574 tokens y NO tocó el título
//   moonshotai/kimi-k3             112s  ✓ 1.305 tokens
//   deepseek-v4-flash, gemma-4-31b-it, nemotron-3.5-lightning-30b, deepseek-v4-pro,
//   mistral-nemotron                     ✗ timeout, en solitario y sin concurrencia
// El anterior, nemotron-3-super, encima se pasaba del timeout auditando (149s).
// Cámbialo con TAILOR_MODEL. El auditor va aparte: AUDIT_MODEL, en audit.js.
// Es el modelo de la vía NIM; el de la vía gateway se elige en MODELOS, abajo.
const MODEL = process.env.TAILOR_MODEL || 'minimaxai/minimax-m3'

export const maxDuration = 300


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

// --- lo que el modelo puede LEER --------------------------------------------
// El CV entero tal y como se le enseña para EVALUARLO: incluye estudios, idiomas
// y certificaciones, que no se pueden reescribir pero sí evaluar. Lo usan
// /api/audit y /api/cover. No confundir con `editable` del handler de abajo, que
// es lo único que se le deja TOCAR.
//
// Estaba escrito dos veces, idéntico salvo por las certificaciones, que la carta
// no veía sin motivo: son diez y todas de IA.
export const resumenCV = (cv) => ({
  titulo: cv.title,
  perfil: cv.profile,
  experiencia: cv.experience.map((e) => ({
    empresa: e.project, puesto: e.role, fechas: e.dates, descripcion: e.description,
    logros: e.achievements, tecnologias: e.tech,
  })),
  skills: cv.skills,
  estudios: cv.education.map((e) => `${e.degree} — ${e.center} (${e.dates})`),
  idiomas: cv.languages,
  certificaciones: cv.certifications.map((c) => c.name),
})

// El encaje que YA calculó /api/audit, en un bloque para el prompt del que adapta
// y del que escribe la carta.
//
// Sin esto los dos reciben el TEXTO CRUDO de la oferta y vuelven a deducir a
// ciegas qué cubre el CV y qué no: dos modelos clasificando lo mismo por
// separado, y el segundo sin ver el trabajo del primero, que ya está pagado. De
// ahí salían `gaps` que contradecían al informe que acabas de leer en pantalla.
//
// ponytail: no es un artefacto nuevo ni una llamada más — es el dato que ya viaja
// en `a`. Sin requisitos devuelve '' y el prompt es exactamente el de antes, así
// que los dos endpoints siguen siendo llamables sueltos.
//
// Medido el 07-09-2026 sobre la oferta de Chery, la misma llamada con y sin:
//   con brief   4 gaps, los MISMOS cuatro que la auditoría marcó "no", 0 inventions
//   sin brief   6 gaps inventados de cero, y "ELT" declarado gap y escrito en el CV
// Sin él además sacaba el inglés como gap, que normalizar() mantiene fuera de las
// decisiones a propósito: el adaptador a ciegas lo reintroducía por detrás.
export function brief(requisitos = []) {
  const de = (e) => requisitos.filter((r) => r.encaje === e).map((r) => r.texto)
  const [si, parcial, no] = ['si', 'parcial', 'no'].map(de)
  if (!si.length && !parcial.length && !no.length) return ''
  const bloque = (titulo, xs) => (xs.length ? `\n\n${titulo}\n- ${xs.join('\n- ')}` : '')
  return '\n\n---\n\nENCAJE YA AUDITADO. No lo recalcules: úsalo.'
    + bloque('CUBIERTO — hazlo visible, con el vocabulario de la oferta:', si)
    + bloque('PARCIAL — descríbelo con su alcance REAL. No subas nivel, años ni responsabilidad:', parcial)
    + bloque('NO CUBIERTO — va en "gaps" y NO se menciona:', no)
}

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

// Modelos por vía. En el gateway el primero es el que se usa y los demás son su
// red: precios del catálogo el 03-09-2026, por millón de tokens (entrada/salida).
//   openai/gpt-oss-120b      0,10 / 0,50  -> ~0,1 céntimos por auditoría
//   deepseek-v4-flash-0731   0,08 / 0,15
//   minimax/minimax-m3-free  0,00 / 0,00  -> gratis, de última red
// El de pago va primero a propósito: lo que se compra aquí es velocidad, y 100
// auditorías cuestan 12 céntimos. Cámbialos sin desplegar con las variables.
export const MODELOS = {
  gateway: (process.env.TAILOR_MODEL_GW || 'openai/gpt-oss-120b,minimax/minimax-m3-free').split(','),
  nim: MODEL,
}

// --- el presupuesto de tiempo ------------------------------------------------
// La función tiene 300 s (maxDuration). El handler fija el final ANTES del
// scrape, así que lo que este gasta se descuenta solo.
export const PRESUPUESTO = 300000
const RESERVA = 15000 // para responder al navegador sin morir contra el techo
const MINIMO = 20000  // por debajo de esto no da tiempo ni a intentarlo

// Lo que puede durar un intento por esta vía, o 0 si ya no cabe.
export function reparto(via, hasta, ahora = Date.now()) {
  const queda = hasta - ahora - RESERVA
  return queda < MINIMO ? 0 : Math.min(queda, via.techo)
}

// maxRetries: 0 — el reintento lo gobierna pedirJSON(), que además CAMBIA DE
// VÍA. El del SDK repetía contra el mismo servicio atascado y duplicaba la espera.
export const client = (via) => new OpenAI({ apiKey: process.env[via.env], baseURL: via.baseURL, maxRetries: 0 })

// La única forma de pedirle JSON al modelo, compartida por /api/tailor,
// /api/audit, /api/cover y /api/answers.
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
// `valida(datos)` es opcional: devuelve false y la respuesta se trata como un
// fallo de esa vía, así que se reintenta o se pasa a la siguiente. Sin esto, un
// modelo que contesta rápido pero con la forma equivocada se colaba hasta el
// endpoint —medido en /api/cover: 1 de cada 2 cartas llegaba inservible—.
export async function pedirJSON({ system, user, schema, max_tokens = 8000, modelos = MODELOS, valida, hasta = Date.now() + PRESUPUESTO }) {
  const disponibles = vias()
  if (!disponibles.length) throw new Error('No hay ninguna vía al modelo configurada.')
  const fallos = []

  for (const via of disponibles) {
    const lista = [].concat(modelos[via.nombre] ?? []).filter(Boolean)
    if (!lista.length) continue

    // Dos pasadas como mucho. La segunda solo si merece la pena:
    //   - el fallo fue instantáneo: NIM devuelve 401/404/503 espurios en menos
    //     de un segundo con la clave buena, y repetirlo no gasta presupuesto;
    //   - o fue de contenido: el modelo contestó, pero con JSON roto o con una
    //     forma que no sirve, y otra tirada suele salir bien.
    // Un timeout NO se repite aquí: ya se comió su parte y lo que toca es
    // cambiar de vía, que es de lo que iba todo esto.
    for (let intento = 0; intento < 2; intento++) {
      const timeout = reparto(via, hasta)
      if (!timeout) { fallos.push(`${via.nombre}: sin tiempo`); break }
      const t0 = Date.now()
      try {
        return await unaVez({ via, modelos: lista, system, user, schema, max_tokens, timeout, valida })
      } catch (e) {
        const seg = Math.round((Date.now() - t0) / 1000)
        // El SDK dice "Request timed out." y nada más; en castellano y con el
        // tiempo delante se entiende sin abrir los logs.
        fallos.push(`${via.nombre} ${seg}s: ${/timed? ?out/i.test(e.message) ? 'no ha respondido a tiempo' : e.message}`)
        if (Date.now() - t0 > 10000 && !e.contenido) break
        // Un 429 o un 503 se pasan solos en un segundo; repetir en el mismo
        // instante es tirar el segundo intento. Medido: NIM devuelve el 429 en
        // 0 s, así que sin esta pausa los dos intentos son el mismo momento.
        await new Promise((sigue) => setTimeout(sigue, 1000))
      }
    }
  }

  // Se dice contra qué se estaba hablando y cuánto se esperó: "el modelo no ha
  // respondido" a secas mandó a rotar una clave que estaba perfecta.
  throw new Error(`No se ha podido generar (${fallos.join(' · ')}). Vuelve a probar.`)
}

// Un fallo de contenido se marca para que pedirJSON sepa que reintentar sirve.
const deContenido = (mensaje) => Object.assign(new Error(mensaje), { contenido: true })

async function unaVez({ via, modelos, system, user, schema, max_tokens, timeout, valida }) {
  const completion = await client(via).chat.completions.create({
    model: modelos[0],
    max_tokens,
    messages: [
      { role: 'system', content: `${system}\n\nDevuelve SOLO un objeto JSON, sin texto alrededor, con este esquema exacto:\n${JSON.stringify(schema)}` },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    // Solo el gateway los entiende; NIM ignoraría el campo, pero no se le manda.
    // sort ttft = de los proveedores que sirven este modelo, el que antes
    // responde, que es exactamente lo que aquí falla. models = su red de abajo.
    ...(via.nombre === 'gateway' && {
      providerOptions: { gateway: { sort: 'ttft', ...(modelos.length > 1 && { models: modelos }) } },
    }),
  }, { timeout })

  const choice = completion.choices?.[0]
  // Algún modelo envuelve el JSON en ```json … ```. Quitarlo es una línea.
  const crudo = String(choice?.message?.content ?? '').trim().replace(/^```(?:json)?|```$/g, '').trim()
  let datos
  try {
    datos = JSON.parse(crudo)
  } catch {
    // Se lanza para que pedirJSON reintente o pruebe la vía siguiente: otro
    // proveedor puede devolver JSON bueno donde este devolvió prosa.
    throw deContenido(choice?.finish_reason === 'length'
      ? 'respuesta cortada (prueba con una oferta más corta)'
      : 'no ha devuelto JSON válido')
  }
  if (valida && !valida(datos)) throw deContenido('la respuesta no sirve')
  return { datos, usage: completion.usage }
}

export default async function handler(req, res) {
  const blocked = gate(req, res)
  if (blocked) return blocked

  // El reloj arranca aquí, ANTES del scrape: lo que ese gasta se le descuenta
  // solo al modelo, en vez de sumarse por fuera y pasarse del techo de la función.
  const hasta = Date.now() + PRESUPUESTO

  try {
    // `requisitos` es la auditoría ya pagada. Opcional: sin ella brief() da ''
    // y el prompt es el de siempre.
    const { url, text, lang = 'en', requisitos = [] } = req.body ?? {}
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
      hasta,
      // El idioma va aquí y al final, no en el system: enterrado allí lo
      // ignoraba y devolvía inglés con el CV en español (probado).
      user: `CV actual:\n${JSON.stringify(editable, null, 2)}\n\n---\n\nOFERTA:\n${offer.slice(0, 40000)}`
        + `${brief(requisitos)}\n\n---\n\n`
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
