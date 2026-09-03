// Carta de presentación para una oferta concreta.
// POST /api/cover  { text, lang }  -> { carta, gaps, inventions }
//
// Va aparte de /api/tailor y no como un campo más de su esquema: adaptar el CV
// ya tarda ~35 s y no toda oferta merece carta. Aquí no hay nada que filtrar
// contra el CV maestro —una carta es texto libre de principio a fin—, así que
// la única red posible es findInventions: si el modelo declara un gap y luego
// lo escribe en la carta, se contradice, y eso se avisa.
import { gate, pedirJSON, findInventions, PRESUPUESTO } from './tailor.js'
import { dataES, dataEN } from '../src/data.js'

export const maxDuration = 300

const schema = {
  type: 'object',
  properties: {
    // Sin minLength: un mínimo de longitud hace que el modelo rellene hasta
    // alcanzarlo y degenere en bucle. Visto en /api/audit.
    carta: {
      type: 'string',
      description: 'La carta entera, en párrafos separados por una línea en blanco. Sin encabezado ni firma.',
    },
    gaps: {
      type: 'array',
      description: 'Lo que la oferta pide y el CV NO respalda. Nunca se menciona en la carta.',
      items: { type: 'string' },
    },
  },
  required: ['carta', 'gaps'],
  additionalProperties: false,
}

// "detailed thinking off" es el interruptor de razonamiento de nemotron. Se
// queda porque no estorba, pero medido hoy NO lo apaga: el modelo razona
// igual, 4.400-9.200 caracteres antes de escribir una línea de carta. Es la
// razón de que el presupuesto de tokens de abajo tenga que ser holgado.
const SYSTEM = `detailed thinking off

Escribes la carta de presentación de un candidato para una oferta concreta.

REGLA ABSOLUTA: no inventas nada. Solo puedes usar hechos que YA están en el CV.
Si la oferta pide algo que el CV no respalda, va en "gaps" y NO aparece en la carta.

- Tres o cuatro párrafos. Nada de rellenos ni fórmulas de cortesía largas.
- Primer párrafo: qué puesto y por qué él, en concreto. Nada de "me dirijo a ustedes".
- Cuerpo: dos o tres hechos del CV que respondan a lo que la oferta pide, citando
  la empresa o el proyecto real. Es lo único que convence.
- Cierre: una frase. Sin "quedo a su entera disposición".
- Sin encabezado, sin fecha, sin "Estimado equipo", sin "Estimados señores" y sin
  firma: empieza directamente por la primera frase del primer párrafo.
- No repitas el CV entero: la carta explica lo que el CV no puede decir solo.
- Nada de métricas, años ni porcentajes que no estén ya en el CV.

NUNCA menciones dinero. Ni pretensión salarial, ni rango, ni expectativas, ni
disponibilidad, ni fecha de incorporación, ni preaviso. No los sabes, y una cifra
inventada le compromete en una negociación real. Si la oferta pregunta por el
salario, la carta lo ignora.`

// Sin decodificación restringida, "carta" no siempre es un string: hay modelos
// que la devuelven partida en párrafos. Visto con minimax-m3 el 03-09-2026, y
// `carta?.trim()` reventaba con un "carta?.trim is not a function" que no dice
// nada. Un array se une; cualquier otra cosa se trata como carta vacía, nunca
// como "[object Object]" colado en la carta que mandas.
export const textoCarta = (carta) => (Array.isArray(carta)
  ? carta.filter((p) => typeof p === 'string').join('\n\n')
  : typeof carta === 'string' ? carta : '')

// El prompt le prohíbe hablar de dinero y aun así se inventó "65.000-70.000 €
// brutos anuales" en la primera prueba real. Una cifra salarial inventada le
// compromete en una negociación, así que no basta con pedirlo: se detecta.
// findInventions no sirve aquí — solo caza términos declarados en gaps, y un
// número no es un término.
export function findFigures(carta) {
  const re = /(?:\d[\d.,]*\s*(?:€|\$|EUR|USD|euros?|dólares?|k\b)|(?:€|\$)\s*\d[\d.,]*)/gi
  return [...new Set((carta.match(re) ?? []).map((s) => s.trim()))]
}

export default async function handler(req, res) {
  const blocked = gate(req, res)
  if (blocked) return blocked
  const hasta = Date.now() + PRESUPUESTO

  try {
    const { text, lang = 'es' } = req.body ?? {}
    const oferta = text?.trim()
    if (!oferta) return res.status(400).json({ error: 'Falta el texto de la oferta.' })

    const cv = lang === 'es' ? dataES : dataEN
    const resumen = {
      titulo: cv.title,
      perfil: cv.profile,
      experiencia: cv.experience.map((e) => ({
        empresa: e.project, puesto: e.role, fechas: e.dates, descripcion: e.description,
        logros: e.achievements, tecnologias: e.tech,
      })),
      skills: cv.skills,
      estudios: cv.education.map((e) => `${e.degree} — ${e.center} (${e.dates})`),
      idiomas: cv.languages,
    }

    // El idioma al final del mensaje de usuario, no en el system: enterrado
    // allí lo ignora y copia el idioma de la oferta (probado en tailor y audit).
    const user = `CV DEL CANDIDATO:\n${JSON.stringify(resumen, null, 2)}\n\n---\n\nOFERTA:\n${oferta.slice(0, 40000)}\n\n---\n\n`
      + `IDIOMA OBLIGATORIO DE SALIDA: ${lang === 'es' ? 'ESPAÑOL' : 'INGLÉS'}. `
      + `Escribe la carta en ${lang === 'es' ? 'español' : 'inglés'} aunque la oferta esté en otro idioma. `
      + `Los nombres de tecnologías y empresas no se traducen.`

    // El presupuesto se mide contra lo que el modelo gasta ANTES de escribir: la
    // carta son ~500 tokens, pero razona 1.000-2.000 más primero. Medido sobre
    // la oferta de Preply, dos intentos por presupuesto:
    //   2000  0 de 2  (se corta en pleno razonamiento)
    //   3000  2 de 2
    //   4000  2 de 2, 15-30 s
    // 4000 por margen, no por necesidad. Sigue siendo bajo a propósito para que
    // un intento fallido muera pronto: tres de ~30 s caben en el techo de 300.
    // El bucle de tres intentos que había aquí se ha subido a pedirJSON(), que
    // además cambia de proveedor entre uno y otro y respeta el presupuesto.
    // La carta inservible se trata como fallo de la llamada, no como respuesta:
    // así se reintenta sola en vez de llegar aquí y morir en un 502. Medido el
    // 03-09-2026: 1 de cada 2 pasadas de minimax-m3 la devolvía con otra forma.
    const { datos: { carta, gaps }, usage } = await pedirJSON({
      system: SYSTEM, user, schema, max_tokens: 4000, hasta, valida: (d) => textoCarta(d.carta).trim().length > 0,
    })
    const texto = textoCarta(carta)
    if (!texto.trim()) {
      // Qué llegó exactamente, en los logs: "carta vacía" a secas dejaba a
      // ciegas cuando el modelo devolvía la carta con otra forma.
      console.error('cover: carta no utilizable ->', JSON.stringify(carta)?.slice(0, 300))
      return res.status(502).json({ error: 'El modelo ha devuelto una carta vacía. Vuelve a probar.' })
    }

    res.status(200).json({
      carta: texto.trim(),
      gaps: gaps ?? [],
      // Dos redes distintas: una para lo que se contradice con sus propios
      // gaps, otra para las cifras de dinero que no debería haber escrito.
      inventions: [...findInventions(cv, gaps, texto), ...findFigures(texto)],
      usage: { input: usage?.prompt_tokens, output: usage?.completion_tokens },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
