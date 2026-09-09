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
import { pedirJSON, PRESUPUESTO, resumenCV } from './tailor.js'
import { gate } from '../src/acceso.js'
import { fetchOffer } from '../src/scrape.js'
// La misma regex que ya usa el feed para la columna "salario": si la oferta
// publica cifra, no hay nada que estimar.
import { salarioDe, rangoSalarial } from './feed.js'
import { dataES, dataEN } from '../src/data.js'

export const maxDuration = 300

// Auditar y adaptar no piden lo mismo. Adaptar quiere velocidad y un modelo que
// se atreva a reescribir; auditar quiere el que menos "sí" regale. Medido
// 01-09-2026 contra la oferta de Chery (Big Data: el CV no tiene nada de esa
// pila) — ninguno se inventó un "sí" sobre ella, la diferencia está en el resto:
//   kimi-k3           102s  11 requisitos  3 sí / 3 parcial / 5 no  1.034 tokens
//   minimax-m3         77s  13 requisitos  4 / 6 / 3               1.242
//   deepseek-v4-flash  91s  14 requisitos  2 / 5 / 7               1.612 (+1 reint.)
//   nemotron-3-super  149s  ✗ se pasa del timeout del cliente      4.598
// kimi-k3 es el más severo y el más barato de salida. deepseek-v4-flash saca más
// requisitos pero se quedó sin responder adaptando, así que no se fía de él aquí.
// En el gateway el primero es el que se usa y el segundo es su red. gpt-oss-120b
// sacó 10 requisitos donde kimi-k3 sacaba 12, y cuesta 0,10/0,50 $ por millón
// frente a 3,00/15,00: para auditar es el cambio bueno. Ajústalos con
// AUDIT_MODEL_GW (gateway) y AUDIT_MODEL (NVIDIA) sin tocar el código.
//
// 09-09-2026, y la lección importa más que los modelos: NIM está vaciando su
// catálogo gratis. gpt-oss-120b llegó a su EOL el 03-09 y minimax-m3 el 09-09 a
// las 09:00Z —en mitad de esta misma sesión: auditaba a las 10:58 y devolvía 410
// a las 11:15—, y kimi-k3 sigue listado pero no responde (dos "Di OK" con
// max_tokens 16, 120 s y 90 s, sin un solo byte). Por eso la vía NIM lleva
// LISTA y no un modelo suelto: con uno solo, el día que muere se lleva la app.
//
// Medido hoy sobre la oferta de Chery (Big Data, el CV no tiene esa pila) y la
// de Erni, con el presupuesto real de 285 s:
//   deepseek-v4-pro-0813   123s  12 requisitos  1 sí / 8 parcial / 3 no  12/12 con cita
//   gpt-oss-20b            136s   7 requisitos                           7/7  con cita, 4.459 tok
//   nemotron-3-super-120b  ✗ se come los 285 s sin responder
//   nemotron-3.5-lightning ✗ igual, aunque el "Di OK" volvía en 16 s
// El ping corto no predice nada: los dos nemotron contestaban en 1 y 16 s y
// mueren con una auditoría de verdad. deepseek-v4-pro saca casi el doble de
// requisitos que gpt-oss-20b y gasta la mitad de tokens, así que va primero y
// gpt-oss-20b queda de suplente.
const MODELOS = {
  gateway: (process.env.AUDIT_MODEL_GW || 'openai/gpt-oss-120b,deepseek/deepseek-v4-flash-0731').split(','),
  // Lista y no un modelo suelto: el segundo es el suplente del segundo intento.
  nim: (process.env.AUDIT_MODEL || 'deepseek-ai/deepseek-v4-pro-0813,openai/gpt-oss-20b').split(','),
}

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
          // Lo único que ata el requisito a la oferta. `evidencia` dice qué del
          // CV lo cubre; sin esto no hay forma de comprobar que el requisito
          // existe de verdad y no se lo ha inventado el modelo. Se verifica
          // contra el texto en normalizar(), así que aquí solo se pide.
          cita: {
            type: 'string',
            description: 'El fragmento LITERAL de la oferta que exige esto: cópialo y pégalo tal cual, sin traducir, resumir ni reescribir. SE COMPRUEBA contra el texto de la oferta y se descarta si no coincide palabra por palabra, así que una paráfrasis se pierde. Si no puedes copiarlo exacto, deja la cadena vacía.',
          },
        },
        required: ['texto', 'tipo', 'encaje', 'evidencia', 'cita'],
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
    // Planos, no un objeto anidado: con json_object el modelo acierta mucho más
    // con tres claves sueltas que con una estructura dentro de otra.
    bandaMin: {
      type: 'number',
      description: 'Suelo de mercado en € BRUTOS ANUALES para ese rol, seniority y ubicación. Un número, sin puntos ni símbolos.',
    },
    bandaMax: {
      type: 'number',
      description: 'Techo de mercado, mismo criterio y mismas unidades.',
    },
    baseSalarial: {
      type: 'string',
      description: 'Una frase: sobre qué mercado y qué señales de la oferta estimas esa banda.',
    },
  },
  // "recomendacion" NO la pide el modelo: la calcula recomendar() a partir de
  // los encajes. Medido: devolvía "descartar" con el 100% de imprescindibles
  // cumplidos. El enum le obligaba a un valor válido, no a uno coherente.
  required: ['rol', 'empresa', 'ubicacion', 'modalidad', 'seniority', 'requisitos', 'veredicto',
    'bandaMin', 'bandaMax', 'baseSalarial'],
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

LA BANDA SALARIAL
- Es la banda de MERCADO para ese rol, ese seniority y esa ubicación, en euros
  brutos anuales. No la del candidato ni la que te gustaría que le pagaran.
- Barcelona y Madrid no pagan lo mismo que un remoto para EE. UU.; una startup
  de 20 personas no paga como una farmacéutica. Usa lo que diga la oferta.
- Si la propia oferta publica un rango, ese es el mercado: repítelo.

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

// La recomendación se calcula, no se le pregunta al modelo: devolvía
// "descartar" con el 100% de los imprescindibles cumplidos.
export function recomendar({ imprescindibles, bloqueantes }) {
  if (bloqueantes.length >= 2) return 'descartar'
  if (imprescindibles !== null && imprescindibles < 50) return 'descartar'
  // El 80 es el "8/10" del plan de flujo: pasa a adaptación lo que cubre al menos
  // cuatro de cada cinco imprescindibles y no falla ninguno. Era 75. No es una
  // escala nueva — es el mismo número, con el corte donde estaba el 8.
  if (bloqueantes.length === 1 || (imprescindibles !== null && imprescindibles < 80)) {
    return 'aplicar_con_reservas'
  }
  return 'aplicar'
}

// Cuánto pedir. La BANDA sale de la oferta si la publica —dato real— y del
// modelo si no; el PUNTO dentro de ella lo calcula esto, por el mismo motivo por
// el que recomendar() no se le pregunta: los números ya contienen la respuesta y
// el modelo se contradice a sí mismo cuando se le deja decidir.
//
// Devuelve null cuando no hay nada honesto que decir. Una cifra inventada aquí no
// se queda en la pantalla: te la llevas a la negociación.
//
// La curva era más baja (0,8 / 0,55 / 0,3, y 0,5 con bloqueante) y pedía poco:
// cumplir el 80 % de lo imprescindible te dejaba en el tercio bajo de la banda,
// que no es lo que hace un recruiter contigo. Cumplir cuatro de cada cinco
// requisitos es un buen candidato, y un buen candidato pide arriba y negocia
// hacia abajo.
export function pedirSalario(a, encaje, publicado = null, rango = null) {
  const min = Number(a?.bandaMin)
  const max = Number(a?.bandaMax)
  // Cordura sobre la banda del modelo. Sin esto, uno que la devuelve en euros
  // MENSUALES (pasa) te pinta "pide 3.500 €/año".
  const estimada = Number.isFinite(min) && Number.isFinite(max)
    && min < max && min >= 15000 && max <= 300000

  // Si la oferta publica una banda, MANDA ella: es lo que están dispuestos a
  // pagar, no una estimación de mercado. Antes se usaba solo como tope.
  const banda = rango ?? (estimada ? { min, max } : null)
  if (!banda && publicado == null) return null

  // 100 % de imprescindibles -> arriba del todo. Por debajo del 60 % el tercio
  // bajo: pedir el techo con la mitad de los requisitos sin cubrir es como te
  // descartan en la primera llamada.
  const { imprescindibles: imp, bloqueantes } = encaje
  let punto = imp === null ? 0.6 : imp >= 100 ? 0.85 : imp >= 80 ? 0.7 : imp >= 60 ? 0.5 : 0.3
  // Con un bloqueante, nunca arriba: pero 0,6 y no 0,5, porque un requisito que
  // falta no te convierte en un candidato del montón.
  if (bloqueantes.length) punto = Math.min(punto, 0.6)

  const redondear = (n) => Math.round(n / 1000) * 1000
  const dentro = (p) => (banda ? redondear(banda.min + (banda.max - banda.min) * p) : null)

  // Una cifra suelta del texto solo tapa si es plausible como sueldo de esta
  // oferta: por debajo del suelo de la banda no es el sueldo —es un descuento,
  // un "10k usuarios" o el presupuesto de otra cosa— y bajarte la petición por
  // ella, sin decirlo, es lo que hacía que una banda de 50-80 acabara en 53.
  const tope = rango ? null : (publicado != null && (!banda || publicado >= banda.min) ? publicado : null)
  const pedir = dentro(punto) == null ? tope : Math.min(dentro(punto), tope ?? Infinity)

  return {
    min: banda ? redondear(banda.min) : null,
    max: banda ? redondear(banda.max) : null,
    punto,
    pedir,
    // Dónde te levantas de la mesa. Pedir sin saber tu mínimo es la mitad de la
    // información, y es la mitad que se usa cuando llaman a negociar. Un quinto
    // de banda por debajo, y con tope inferior: el suelo NUNCA puede acabar por
    // encima de lo que pides, que es lo que pasaba con un mínimo fijo del 35 %
    // cuando el punto caía al 30 %.
    suelo: dentro(Math.max(0.2, punto - 0.2)),
    publicado,
    // De dónde sale la banda, que cambia cuánto te la puedes creer.
    publica: !!rango,
    base: String(a?.baseSalarial ?? '').trim() || null,
  }
}

export default async function handler(req, res) {
  const blocked = gate(req, res)
  if (blocked) return blocked
  // Antes del scrape: lo que este gasta sale del presupuesto del modelo.
  const hasta = Date.now() + PRESUPUESTO

  try {
    const { url, text, lang = 'es' } = req.body ?? {}
    const oferta = text?.trim() || (url ? await fetchOffer(url) : null)
    if (!oferta) return res.status(400).json({ error: 'Pasa la URL de la oferta o su texto.' })

    const cv = lang === 'es' ? dataES : dataEN
    // El CV entero: para auditar necesita ver estudios, idiomas y certificaciones,
    // no solo lo que se puede reescribir. Compartido con /api/cover.
    const resumen = resumenCV(cv)

    const { datos: a, usage } = await pedirJSON({
      system: SYSTEM,
      schema,
      modelos: MODELOS,
      hasta,
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
        + `Los nombres de tecnologías, empresas y puestos no se traducen. `
        + `La "cita" TAMPOCO: va copiada literal de la oferta, en el idioma en que esté escrita.`,
    })

    a.requisitos = normalizar(a.requisitos, oferta)
    const encaje = puntuar(a.requisitos)
    // Fuera de la respuesta: los tres campos crudos se resumen en `salario` y
    // esto se guarda entero con la oferta en localStorage.
    const { bandaMin, bandaMax, baseSalarial, ...resto } = a

    res.status(200).json({
      ...resto,
      encaje,
      salario: pedirSalario(a, encaje, salarioDe(oferta), rangoSalarial(oferta)),
      veredicto: limpiarVeredicto(a.veredicto, encaje),
      recomendacion: recomendar(encaje),
      texto: oferta, // para el paso 3, sin volver a scrapear
      usage: { input: usage?.prompt_tokens, output: usage?.completion_tokens },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const IDIOMA = /\b(ingl[ée]s|english)\b/i

// Los enums (`tipo`, `encaje`) los garantizaba la decodificación restringida.
// Ahora los garantiza esto. Importa más de lo que parece: puntuar() haría NaN
// con un encaje desconocido y la pantalla de auditoría reventaría al buscar su
// icono. Ante la duda, "parcial" e "imprescindible": la lectura prudente, que
// es la que pide el prompt.
export function normalizar(requisitos, oferta = '') {
  // Sin tildes: el modelo escribe en español y devuelve "Sí" tanto como "si".
  const uno = (v, validos, porDefecto) => {
    const s = String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return validos.find((x) => x === s || s.startsWith(x)) ?? porDefecto
  }
  // Una cita que no está en la oferta es una cita inventada, y es exactamente lo
  // que ese campo existe para evitar. Se COMPRUEBA contra el texto en vez de
  // pedirse por favor: mismo criterio que applyPatch con tech — la garantía es
  // código, no prompt. Si no aparece se queda vacía, que es honesto; pintarla
  // sería peor que no tenerla, porque la lees como si fuera de la oferta.
  //
  // Se comparan solo letras y números: el modelo recopia el fragmento con otros
  // saltos de línea, y la oferta scrapeada trae viñetas, asteriscos de negrita y
  // barras. Medido sobre la oferta de Chery: sin esto, "Grado universitario o
  // superior" NO casaba con "**Grado universitario o superior**". Lo que sigue
  // exigiéndose es la SECUENCIA DE PALABRAS, que es la garantía que importa: una
  // paráfrasis que quita o añade una palabra sigue cayéndose, y son la mayoría.
  //
  // La cadena vacía se descarta aparte: está contenida en cualquier texto y
  // colaría siempre.
  //
  // Medido el 07-09-2026 sobre la oferta de Chery: comparando espacios y
  // mayúsculas solamente, 4 de 10 citas sobrevivían; ignorando también el markup,
  // y diciéndole en la `description` que la cita SE COMPRUEBA, 12 de 12. Cero
  // citas falsas en las dos pasadas.
  const aplanar = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const plano = aplanar(oferta)
  const literal = (c) => {
    const q = String(c ?? '').replace(/\s+/g, ' ').trim()
    const clave = aplanar(q)
    return clave && plano.includes(clave) ? q : ''
  }
  return (Array.isArray(requisitos) ? requisitos : [])
    .filter((r) => r && String(r.texto ?? '').trim())
    .map((r) => ({
      texto: String(r.texto).trim(),
      evidencia: String(r.evidencia ?? '').trim(),
      cita: literal(r.cita),
      // El idioma NUNCA es imprescindible, lo diga la oferta o lo diga el modelo.
      // Aquí y no en un filtro aparte porque este es el embudo por el que pasan
      // todos los requisitos antes de puntuar(), recomendar() y pedirSalario():
      // un "English C1 required" clasificado como imprescindible bajaba el % de
      // encaje, entraba en bloqueantes y hacía que la oferta naciera descartada
      // sin llegar a adaptar el CV. Sigue viéndose en la lista de valorables:
      // saber que lo piden es útil, frenar la candidatura por ello no.
      tipo: IDIOMA.test(r.texto) ? 'valorable' : uno(r.tipo, ['imprescindible', 'valorable'], 'imprescindible'),
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
