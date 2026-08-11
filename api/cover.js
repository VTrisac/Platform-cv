// Carta de presentación para una oferta concreta.
// POST /api/cover  { text, lang }  -> { carta, gaps, inventions }
//
// Va aparte de /api/tailor y no como un campo más de su esquema: adaptar el CV
// ya tarda ~35 s y no toda oferta merece carta. Aquí no hay nada que filtrar
// contra el CV maestro —una carta es texto libre de principio a fin—, así que
// la única red posible es findInventions: si el modelo declara un gap y luego
// lo escribe en la carta, se contradice, y eso se avisa.
import { gate, client, MODEL, findInventions } from './tailor.js'
import { dataES, dataEN } from '../src/data.js'

export const maxDuration = 300

const schema = {
  type: 'object',
  properties: {
    // Sin minLength: con json_schema estricto un mínimo de longitud hace que el
    // modelo rellene hasta alcanzarlo y degenere en bucle. Visto en /api/audit.
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

// "detailed thinking off" es el interruptor de razonamiento de nemotron. Aquí
// hace falta: con él encendido se gastaba los 8000 tokens deliberando y volvía
// cortado (502) a los 295 s. La auditoría y la adaptación no lo necesitan —sus
// esquemas son rígidos y las anclan—, pero una carta es texto libre y sin esto
// divaga hasta agotar el presupuesto. Medido.
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

    const mensajes = [
      { role: 'system', content: SYSTEM },
      {
        // El idioma al final del mensaje de usuario, no en el system: enterrado
        // allí lo ignora y copia el idioma de la oferta (probado en tailor y audit).
        role: 'user',
        content: `CV DEL CANDIDATO:\n${JSON.stringify(resumen, null, 2)}\n\n---\n\nOFERTA:\n${oferta.slice(0, 40000)}\n\n---\n\n`
          + `IDIOMA OBLIGATORIO DE SALIDA: ${lang === 'es' ? 'ESPAÑOL' : 'INGLÉS'}. `
          + `Escribe la carta en ${lang === 'es' ? 'español' : 'inglés'} aunque la oferta esté en otro idioma. `
          + `Los nombres de tecnologías y empresas no se traducen.`,
      },
    ]

    // Medido sobre la oferta de Landbot: cuando sale bien son 256 tokens y 33 s;
    // cuando el modelo se pone a divagar consume TODO el presupuesto y vuelve
    // cortado. Con 8000 eso costaba 276-295 s y no cabía ni en el techo de 300.
    //
    // Así que el presupuesto es bajo a propósito: no porque la carta necesite
    // poco (que también), sino para que la divagación muera pronto y el
    // reintento salga barato. Tres intentos de ~40 s cabe; uno de 295 s no.
    let choice, completion
    for (let intento = 0; intento < 3; intento++) {
      completion = await client().chat.completions.create({
        model: MODEL,
        max_tokens: 1200,
        messages: mensajes,
        response_format: { type: 'json_schema', json_schema: { name: 'carta', strict: true, schema } },
      })
      choice = completion.choices?.[0]
      if (choice?.finish_reason !== 'length') break
    }
    if (choice?.finish_reason === 'length') {
      return res.status(502).json({ error: 'El modelo no ha conseguido escribir la carta en tres intentos. Vuelve a probar.' })
    }
    const { carta, gaps } = JSON.parse(choice.message.content)

    res.status(200).json({
      carta: carta.trim(),
      gaps,
      // Dos redes distintas: una para lo que se contradice con sus propios
      // gaps, otra para las cifras de dinero que no debería haber escrito.
      inventions: [...findInventions(cv, gaps, carta), ...findFigures(carta)],
      usage: { input: completion.usage?.prompt_tokens, output: completion.usage?.completion_tokens },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
