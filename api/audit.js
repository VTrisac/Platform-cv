// Paso 1 y 2 del flujo: scrapea la oferta y la audita contra el CV maestro,
// SIN tocar el CV. Devuelve un listado de requisitos con encaje real para que
// decidas si merece la pena aplicar antes de gastar una adaptación.
//
// POST /api/audit  { url?, text?, lang }
//   -> { oferta, requisitos[], veredicto, recomendacion, encaje, texto }
//
// `texto` es la oferta ya scrapeada: el paso 3 la reenvía a /api/tailor tal
// cual, así no se baja dos veces ni se arriesga a que el portal cambie entre
// una llamada y la otra.
import { fetchOffer, gate, pedirJSON } from './tailor.js'
import { dataES, dataEN } from '../src/data.js'

export const maxDuration = 300

const schema = {
  type: 'object',
  properties: {
    rol: { type: 'string' },
    empresa: { type: 'string' },
    ubicacion: { type: 'string' },
    modalidad: { type: 'string', enum: ['presencial', 'híbrido', 'remoto', 'no especificado'] },
    seniority: { type: 'string' },
    requisitos: {
      type: 'array',
      minItems: 4,
      maxItems: 14,
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'El requisito, en una línea' },
          tipo: { type: 'string', enum: ['imprescindible', 'valorable'] },
          encaje: { type: 'string', enum: ['si', 'parcial', 'no'] },
          evidencia: {
            type: 'string',
            description: 'Qué del CV lo respalda, citando empresa o tecnología concreta. Si el encaje es "no", di qué falta.',
          },
        },
        required: ['texto', 'tipo', 'encaje', 'evidencia'],
        additionalProperties: false,
      },
    },
    // Sin minLength: con decodificación restringida, un mínimo de longitud hacía
    // que el modelo rellenase hasta alcanzarlo y degenerase en bucle ("si si si
    // si…"). Observado en producción. La longitud se corrige en código, no aquí.
    // La `description` sí importa y mucho: es lo único que sostiene el largo del
    // veredicto ahora que el esquema viaja en el prompt. Sin ella el modelo
    // contesta con una palabra y limpiarVeredicto() acaba sustituyéndolo
    // siempre por el resumen calculado (medido: 2, 4 y 11 caracteres).
    veredicto: {
      type: 'string',
      description: 'Dos o tres FRASES completas explicando el encaje. No una palabra suelta.',
    },
  },
  // "recomendacion" NO la pide el modelo: la calcula recomendar() a partir de
  // los encajes. Medido: devolvía "descartar" con el 100% de imprescindibles
  // cumplidos. El enum le obligaba a un valor válido, no a uno coherente.
  required: ['rol', 'empresa', 'ubicacion', 'modalidad', 'seniority', 'requisitos', 'veredicto'],
  additionalProperties: false,
}

const SYSTEM = `Eres un recruiter técnico senior evaluando si un candidato encaja
en una oferta. NO reescribes su CV: solo auditas.

EXTRAER LOS REQUISITOS
- Incluye SIEMPRE, como requisito propio, cada tecnología, lenguaje o framework
  que la oferta nombre como su stack. Si dice "trabajamos con Ruby on Rails",
  "Ruby on Rails" es un requisito, aunque además diga que son flexibles.
- Separa imprescindibles de valorables. "Bonus", "se valora", "nice to have" y
  "no es estrictamente necesario" son valorables. El resto, imprescindible.

DECIDIR EL ENCAJE — calibra así, es la parte que más se falla:
- "si" SOLO si el CV nombra la tecnología o la tarea de forma explícita. Si
  necesitas razonar o interpretar para justificarlo, NO es "si".
- "parcial" si hay algo adyacente pero no lo mismo: pide LangGraph y tiene
  LangChain; pide "evals en producción" y tiene "pipelines de evaluación".
  Ante la duda entre "si" y "parcial", elige "parcial".
- "no" si nada del CV lo respalda. Que el candidato aprenda rápido no cuenta
  como cumplirlo.
- Rasgos genéricos ("aprender rápido", "trabajo en equipo", "mentalidad de
  producto") no son requisitos técnicos: si los incluyes, casi siempre son
  "parcial", porque un CV no demuestra un rasgo.

EVIDENCIA
- Cita la empresa, el puesto o la tecnología concreta del CV. Si el encaje es
  "no", di exactamente qué falta. No adornes ni rellenes.

Un informe optimista le hace perder semanas en procesos que no va a pasar. Es
más útil un "no" temprano que un "sí" amable.`

// El veredicto es texto libre y a veces degenera en un bucle de tokens
// ("si no parcial si si si si…"). Detectarlo es trivial —muy pocas palabras
// distintas para lo largo que es— y siempre hay un resumen honesto que dar a
// partir de los números, que no dependen del modelo.
export function limpiarVeredicto(v, encaje) {
  const palabras = String(v ?? '').trim().split(/\s+/)
  const variedad = new Set(palabras.map((p) => p.toLowerCase())).size / (palabras.length || 1)
  const degenerado = palabras.length > 25 && variedad < 0.25
  if (v && v.trim().length >= 40 && !degenerado) return v.trim()

  const { imprescindibles: imp, bloqueantes } = encaje
  return [
    imp === null ? 'La oferta no enumera requisitos imprescindibles claros.' : `Cumples el ${imp}% de los imprescindibles.`,
    bloqueantes.length
      ? `Te falta por completo: ${bloqueantes.join('; ')}.`
      : 'No hay ningún requisito imprescindible que no cubras.',
    'Revisa el listado de abajo antes de decidir.',
  ].join(' ')
}

// "No quiero ofertas donde el inglés sea imprescindible" no se puede resolver
// con palabras clave: "English" aparece en casi toda oferta técnica, la mitad de
// las veces como "English is a plus". La diferencia entre eso y "English C1
// required" es criterio, y la auditoría ya lo ha aplicado al clasificar cada
// requisito como imprescindible o valorable. Aquí solo se lee esa clasificación.
//
// Bloquea cuando el inglés es imprescindible, se cumpla o no: es lo que pediste.
// Si algún día prefieres que solo bloquee cuando NO lo cumples, es añadir
// `&& r.encaje !== 'si'`.
export function bloqueaIngles(requisitos = []) {
  const IDIOMA = /\b(ingl[ée]s|english)\b/i
  return requisitos.find((r) => r.tipo === 'imprescindible' && IDIOMA.test(r.texto))?.texto ?? null
}

// La recomendación se calcula, no se le pregunta al modelo: devolvía
// "descartar" con el 100% de los imprescindibles cumplidos.
export function recomendar({ imprescindibles, bloqueantes }) {
  if (bloqueantes.length >= 2) return 'descartar'
  if (imprescindibles !== null && imprescindibles < 50) return 'descartar'
  if (bloqueantes.length === 1 || (imprescindibles !== null && imprescindibles < 75)) {
    return 'aplicar_con_reservas'
  }
  return 'aplicar'
}

export default async function handler(req, res) {
  const blocked = gate(req, res)
  if (blocked) return blocked

  try {
    const { url, text, lang = 'es' } = req.body ?? {}
    const oferta = text?.trim() || (url ? await fetchOffer(url) : null)
    if (!oferta) return res.status(400).json({ error: 'Pasa la URL de la oferta o su texto.' })

    const cv = lang === 'es' ? dataES : dataEN
    // Se le manda el CV entero: para auditar necesita ver estudios, idiomas y
    // certificaciones, no solo lo que se puede reescribir.
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
      certificaciones: cv.certifications.map((c) => c.name),
    }

    const { datos: a, usage } = await pedirJSON({
      system: SYSTEM,
      schema,
      // Una auditoría son hasta 14 requisitos con su evidencia, y el modelo
      // razona 1.000-2.000 tokens antes de escribir el primero. Con 8000 se
      // cortaba en ofertas normales de LinkedIn (medido). Ver pedirJSON.
      max_tokens: 16000,
      // Mismo problema y misma cura que en tailor.js: un "responde en X"
      // suelto lo ignoraba y copiaba los requisitos literales de la oferta.
      user: `CV DEL CANDIDATO:\n${JSON.stringify(resumen, null, 2)}\n\n---\n\nOFERTA:\n${oferta.slice(0, 40000)}\n\n---\n\n`
        + `IDIOMA OBLIGATORIO DE SALIDA: ${lang === 'es' ? 'ESPAÑOL' : 'INGLÉS'}. `
        + `Escribe en ${lang === 'es' ? 'español' : 'inglés'} el texto de cada requisito, la evidencia y el veredicto, `
        + `aunque la oferta esté en otro idioma: tradúcelos, no los copies literales. `
        + `Los nombres de tecnologías, empresas y puestos no se traducen.`,
    })

    a.requisitos = normalizar(a.requisitos)
    const encaje = puntuar(a.requisitos)

    res.status(200).json({
      ...a,
      encaje,
      veredicto: limpiarVeredicto(a.veredicto, encaje),
      recomendacion: recomendar(encaje),
      // El texto del requisito, no un booleano: si te descarta una oferta,
      // quieres leer exactamente qué exigía antes de fiarte del filtro.
      ingles: bloqueaIngles(a.requisitos),
      texto: oferta, // para el paso 3, sin volver a scrapear
      usage: { input: usage?.prompt_tokens, output: usage?.completion_tokens },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Los enums (`tipo`, `encaje`) los garantizaba la decodificación restringida.
// Ahora los garantiza esto. Importa más de lo que parece: puntuar() haría NaN
// con un encaje desconocido y la pantalla de auditoría reventaría al buscar su
// icono. Ante la duda, "parcial" e "imprescindible": la lectura prudente, que
// es la que pide el prompt.
export function normalizar(requisitos) {
  // Sin tildes: el modelo escribe en español y devuelve "Sí" tanto como "si".
  const uno = (v, validos, porDefecto) => {
    const s = String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return validos.find((x) => x === s || s.startsWith(x)) ?? porDefecto
  }
  return (Array.isArray(requisitos) ? requisitos : [])
    .filter((r) => r && String(r.texto ?? '').trim())
    .map((r) => ({
      texto: String(r.texto).trim(),
      evidencia: String(r.evidencia ?? '').trim(),
      tipo: uno(r.tipo, ['imprescindible', 'valorable'], 'imprescindible'),
      encaje: uno(r.encaje, ['si', 'parcial', 'no'], 'parcial'),
    }))
}

// Los imprescindibles mandan: cumplir extras valorables no compensa fallar un
// requisito bloqueante, así que se puntúan por separado y nunca se promedian.
export function puntuar(requisitos) {
  const peso = { si: 1, parcial: 0.5, no: 0 }
  const de = (t) => requisitos.filter((r) => r.tipo === t)
  const pct = (rs) => (rs.length ? Math.round((rs.reduce((s, r) => s + peso[r.encaje], 0) / rs.length) * 100) : null)
  const imp = de('imprescindible')
  return {
    imprescindibles: pct(imp),
    valorables: pct(de('valorable')),
    bloqueantes: imp.filter((r) => r.encaje === 'no').map((r) => r.texto),
  }
}
