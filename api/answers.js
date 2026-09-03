// Las preguntas del formulario que la tabla de la extensión no sabe responder.
// POST /api/answers  { preguntas:[{etiqueta,tipo,opciones?}], text, lang, carta, perfil }
//   -> { respuestas: { etiqueta: valor }, gaps, inventions }
//
// Quién llama: el service worker de la extensión, no la web. Un formulario real
// pregunta cosas que ningún perfil fijo puede prever ("¿cuántos años con
// Kubernetes?", "cuéntanos un proyecto de agentes que hayas puesto en
// producción"), y el modelo sí ha leído la oferta y el CV.
//
// La red anti-invención es la misma de siempre y aquí importa más que en
// ninguna parte: una carta con una exageración se nota poco; un formulario
// donde declaras tres años de algo que no has tocado te cuesta la entrevista.
// No hace falta CORS: la extensión llama desde su service worker, que con
// host_permissions no pasa por la comprobación de origen del navegador.
import { gate, pedirJSON, findInventions, PRESUPUESTO } from './tailor.js'
import { dataES, dataEN } from '../src/data.js'

export const maxDuration = 300

const schema = {
  type: 'object',
  properties: {
    respuestas: {
      type: 'object',
      description: 'Una entrada por pregunta. La clave es el NÚMERO de la pregunta como cadena '
        + '("1", "2", "3"…). El valor es la respuesta, como cadena. Cadena vacía si el CV no la respalda.',
    },
    gaps: {
      type: 'array',
      description: 'Las preguntas que has dejado vacías y por qué el CV no las respalda.',
      items: { type: 'string' },
    },
  },
  required: ['respuestas', 'gaps'],
  additionalProperties: false,
}

const SYSTEM = `detailed thinking off

Respondes las preguntas de un formulario de candidatura en nombre de un candidato,
a partir de su CV y de la oferta.

REGLA ABSOLUTA: no inventas nada. Solo hechos que YA están en el CV.
Si una pregunta pide un dato que el CV no respalda —una tecnología que no aparece,
un título que no tiene, unos años que no cuadran con sus fechas— la respuesta es
cadena vacía y la pregunta va a "gaps". Vacío es una respuesta correcta; inventar no.

- Los años de experiencia se CUENTAN sobre las fechas del CV. No se estiman.
- Preguntas de sí/no: responde exactamente "Yes" o "No" (o "Sí"/"No" si la pregunta
  está en español). Si te dan opciones, usa una de ellas literalmente.
- Preguntas abiertas: dos o tres frases, concretas, con el proyecto o la cifra del CV.
  Nada de "soy un profesional apasionado".
- No repitas la carta de presentación palabra por palabra si te la dan; úsala como
  material.
- Las claves de "respuestas" son los NÚMEROS de las preguntas, tal cual: "1", "2", "3".
  No pongas la pregunta como clave, ni la reformules, ni le añadas el tipo.`

export default async function handler(req, res) {
  const blocked = gate(req, res)
  if (blocked) return blocked
  const hasta = Date.now() + PRESUPUESTO

  try {
    const { preguntas = [], text = '', lang = 'en', carta = null, perfil = null } = req.body ?? {}
    if (!preguntas.length) return res.status(400).json({ error: 'No hay preguntas que responder.' })

    const cv = lang === 'es' ? dataES : dataEN
    const lista = preguntas.map((p, i) => {
      const { etiqueta, tipo = 'texto', opciones } = typeof p === 'string' ? { etiqueta: p } : p
      return `${i + 1}. [${tipo}] ${etiqueta}`
        + (opciones?.length ? `\n   opciones válidas: ${opciones.join(' | ')}` : '')
    }).join('\n')

    // Los años totales van en el prompt porque el modelo los cuenta fatal solo:
    // con las mismas fechas contestó "1 año y 2 meses" a los años con Python.
    // Con el total delante, reparte bien "cuántos años con X".
    const anios = perfil?.aniosExperiencia
    const { datos, usage } = await pedirJSON({
      system: SYSTEM + (anios ? `\n\nEl candidato tiene ${anios} años de experiencia profesional en total. `
        + 'Los años con una tecnología concreta se cuentan sumando la duración de los puestos del CV '
        + 'donde aparece, y nunca pueden pasar del total.' : ''),
      user: `CV del candidato:\n${JSON.stringify(cv)}\n\n`
        + (text ? `Oferta:\n${text.slice(0, 12000)}\n\n` : '')
        + (carta ? `Carta ya escrita para esta oferta:\n${carta}\n\n` : '')
        + `Preguntas del formulario:\n${lista}`,
      schema,
      max_tokens: 4000,
      hasta,
    })

    // El modelo devuelve las respuestas por número: pedirle que copie la
    // etiqueta palabra por palabra no funciona —la reformula y le pega el tipo
    // delante—, y entonces la extensión no encuentra ninguna. Aquí se vuelven a
    // colgar de su etiqueta, que es lo que el otro lado sabe buscar.
    const etiquetaDe = (p) => (typeof p === 'string' ? p : p.etiqueta)
    const crudas = datos.respuestas ?? {}
    const respuestas = {}
    for (const [clave, valor] of Object.entries(crudas)) {
      if (!String(valor ?? '').trim()) continue // vacío = no lo respalda el CV
      const n = Number.parseInt(clave, 10)
      const p = Number.isInteger(n) && preguntas[n - 1]
        ? preguntas[n - 1]
        // Por si se salta el contrato: la pregunta cuya etiqueta esté dentro de
        // la clave que ha inventado.
        : preguntas.find((q) => clave.includes(etiquetaDe(q).slice(0, 40)))
      if (p) respuestas[etiquetaDe(p)] = String(valor)
    }

    const gaps = datos.gaps ?? []
    res.status(200).json({
      respuestas,
      gaps,
      inventions: findInventions(cv, gaps, JSON.stringify(respuestas)),
      usage,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
