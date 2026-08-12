// Motor del feed de ofertas: consulta tableros públicos y la búsqueda pública de
// LinkedIn, baja la descripción de cada oferta y aplica los filtros baratos —los
// que salen del texto y no cuestan una llamada al modelo.
//
// POST /api/feed  { empresas?, ubicacion?, minHits?, desde?, ...filtros }
//   -> { jobs[], total, descartes{}, dead[], preset }
//
// Vive en api/ y no en scripts/ porque .vercelignore excluye scripts/ del
// despliegue: aquí el motor se despliega y scripts/feed.js lo importa para el
// CLI. Lo que es exclusivo de terminal (tabla markdown, --check, leer ofertas/)
// se queda allí; esto no sabe nada de ficheros.
//
// El orden importa y es el mismo que ya elegiste para auditar antes de adaptar:
// lo barato primero. Aquí se descarta con expresiones regulares sobre el texto;
// lo que necesita criterio de verdad —distinguir "se valora inglés" de "inglés
// imprescindible"— lo decide la auditoría, y solo sobre lo que sobrevive.
import { gate, fetchOffer, strip } from './tailor.js'
import { dataEN } from '../src/data.js'

export const maxDuration = 300

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// Tokens de empresa verificados con --check el 27-07-2026; Amenitiz cayó
// (HTTP 404) el 11-08-2026 y se queda para que --check lo siga señalando.
// ponytail: el token suele ser el slug de la empresa. Míralo en la URL de su
// página de empleo (boards.greenhouse.io/<token>, jobs.lever.co/<token>,
// <token>.workable.com). Si una empresa cambia de ATS desaparece EN SILENCIO:
// pasa --check cada pocos meses.
//
// LinkedIn no es una empresa sino una búsqueda, y usa el mismo campo `token`
// para "palabras clave|ubicación". Un solo modelo de datos para las dos cosas;
// la pantalla de criterios las separa al pintarlas.
export const COMPANIES = [
  { name: 'LinkedIn · AI Engineer', ats: 'linkedin', token: 'AI Engineer|Barcelona, Catalonia, Spain' },
  { name: 'LinkedIn · Backend', ats: 'linkedin', token: 'Backend Engineer|Spain' },
  // Barcelona / España
  { name: 'Typeform', ats: 'greenhouse', token: 'typeform' },
  { name: 'Cabify', ats: 'greenhouse', token: 'cabify' },
  { name: 'Amenitiz', ats: 'greenhouse', token: 'amenitiz' },
  { name: 'New Relic', ats: 'greenhouse', token: 'newrelic' },
  { name: 'Jobandtalent', ats: 'lever', token: 'jobandtalent' },
  { name: 'Exoticca', ats: 'workable', token: 'exoticca' },
  // Remoto / AI-first
  { name: 'Anthropic', ats: 'greenhouse', token: 'anthropic' },
  { name: 'Preply', ats: 'ashby', token: 'preply' },
  { name: 'Weaviate', ats: 'ashby', token: 'weaviate' },
  { name: 'Hugging Face', ats: 'workable', token: 'huggingface' },
  { name: 'Qonto', ats: 'lever', token: 'qonto' },
  { name: 'RemoteOK', ats: 'remoteok', token: '' },
]

export const UBICACION = 'barcelona|madrid|valencia|spain|españa|remote|emea|europe'
export const MIN_HITS = 2

// Los tres valores que acepta la ventana temporal, y su traducción al filtro
// nativo de LinkedIn (f_TPR). Comprobado: r86400 devuelve solo las últimas 24 h.
export const VENTANAS = {
  '24h': { dias: 1, tpr: 'r86400' },
  semana: { dias: 7, tpr: 'r604800' },
  todo: { dias: null, tpr: '' },
}

// --- keywords del CV -------------------------------------------------------
// "Python (Expert)" -> Python | "Java/SpringBoot" -> Java, SpringBoot
// ponytail: >2 caracteres descarta el "CI"/"CD" que salía de partir "CI/CD";
// son universales, no discriminan entre ofertas.
export const keywords = [...new Set(
  [...Object.values(dataEN.skills).flat(), ...dataEN.experience.flatMap((e) => e.tech)]
    .flatMap((s) => s.replace(/\s*\(.*?\)/g, '').split('/'))
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
)]

// Frontera de palabra tolerante con puntos y símbolos: "Java" no debe casar con
// "JavaScript", pero "Node.js" sí dentro de "<p>Node.js</p>".
export const match = (text, terms = keywords) =>
  terms.filter((k) => {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?<![a-z0-9+#.])${esc}(?![a-z0-9+#])`, 'i').test(text)
  })

// Fechas: cada fuente la da en su formato (ISO, epoch en milisegundos, o solo
// el día). Todas acaban en YYYY-MM-DD, que es con lo que se compara.
export const iso = (v) => {
  if (v == null || v === '') return null
  const d = new Date(typeof v === 'number' ? v : String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

// --- fuentes ---------------------------------------------------------------
// text = el objeto entero serializado: ningún ATS necesita parseo específico.
export const ATS = {
  greenhouse: {
    url: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.absolute_url, location: j.location?.name ?? '',
      fecha: iso(j.first_published ?? j.updated_at), text: JSON.stringify(j),
    })),
  },
  lever: {
    url: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    jobs: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      title: j.text, url: j.hostedUrl, location: j.categories?.location ?? '',
      fecha: iso(j.createdAt), text: JSON.stringify(j),
    })),
  },
  ashby: {
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.jobUrl, location: j.location ?? '',
      fecha: iso(j.publishedAt), text: JSON.stringify(j),
    })),
  },
  workable: {
    url: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.url ?? j.shortlink, location: [j.city, j.country].filter(Boolean).join(', '),
      fecha: iso(j.published_on ?? j.created_at), text: JSON.stringify(j),
    })),
  },
  // Tablero global, no de una empresa: el token se ignora y cada oferta trae su
  // propia empresa. El primer elemento del array es el aviso legal, no una
  // oferta; se cae solo al exigir `position`. Sus condiciones piden enlazar de
  // vuelta y citarlos como fuente: la tabla ya enlaza a j.url.
  remoteok: {
    url: () => 'https://remoteok.com/api',
    jobs: (d) => (Array.isArray(d) ? d : []).filter((j) => j.position).map((j) => ({
      title: j.position, url: j.url, company: j.company,
      // Todo lo de RemoteOK es remoto; su `location` es la restricción
      // geográfica. Sin el prefijo no pasaría un filtro que busca "remote".
      location: ['Remote', (j.location ?? '').trim().replace(/,$/, '')].filter(Boolean).join(' · '),
      fecha: iso(j.date), text: JSON.stringify(j),
    })),
  },
  // El token es el término de búsqueda ("ai engineer"), no un slug de empresa.
  // Necesita claves gratuitas: developer.adzuna.com -> .env.local y Vercel.
  adzuna: {
    url: (t) => {
      const { ADZUNA_APP_ID: id, ADZUNA_APP_KEY: key } = process.env
      if (!id || !key) throw new Error('faltan ADZUNA_APP_ID y ADZUNA_APP_KEY')
      return `https://api.adzuna.com/v1/api/jobs/es/search/1?app_id=${id}&app_key=${key}`
        + `&results_per_page=50&content-type=application/json&what=${encodeURIComponent(t)}`
    },
    jobs: (d) => (d.results ?? []).map((j) => ({
      title: j.title, url: j.redirect_url, company: j.company?.display_name,
      location: j.location?.display_name ?? '', fecha: iso(j.created), text: JSON.stringify(j),
    })),
  },
  // Búsqueda pública de LinkedIn: no pide login, pagina de 10 en 10 y filtra por
  // antigüedad en el servidor (f_TPR). Por eso NO hace falta Playwright ni tu
  // sesión — y por tanto tampoco se arriesga tu cuenta.
  // La tarjeta solo trae la cabecera; la descripción se baja después en detalle().
  linkedin: {
    html: true,
    paginas: 3, // 25 ofertas por búsqueda, redondeando a página completa
    url: (token, { ventana = 'todo' } = {}, pagina = 0) => {
      const [keywords = '', location = ''] = String(token).split('|')
      const tpr = VENTANAS[ventana]?.tpr ?? ''
      return 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
        + `?keywords=${encodeURIComponent(keywords.trim())}&location=${encodeURIComponent(location.trim())}`
        + `${tpr ? `&f_TPR=${tpr}` : ''}&start=${pagina * 10}`
    },
    jobs: (html) => String(html).split('<li>').slice(1).map((c) => ({
      title: /base-search-card__title">\s*([^<]+)/.exec(c)?.[1]?.trim(),
      company: /hidden-nested-link[^>]*>\s*([^<]+)/.exec(c)?.[1]?.trim(),
      location: /job-search-card__location">\s*([^<]+)/.exec(c)?.[1]?.trim() ?? '',
      fecha: iso(/datetime="([^"]+)"/.exec(c)?.[1]),
      url: /href="(https:\/\/[^"?]+)/.exec(c)?.[1],
      text: strip(c),
      pendiente: true, // la descripción todavía no está: la baja detalle()
    })).filter((j) => j.title && j.url),
  },
}

// 429 = te están limitando por ritmo, no es que la fuente esté rota. LinkedIn lo
// devuelve si insistes, y pasa de verdad: refrescar el feed varias veces
// seguidas mientras ajustas los criterios basta para provocarlo. Se espera y se
// reintenta una vez; si vuelve, se dice con esas palabras en vez de un "HTTP
// 429" que no le dice nada a nadie.
async function pedir(url, intento = 0) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
  if (res.status === 429 && intento === 0) {
    await pausa(3000)
    return pedir(url, 1)
  }
  return res
}

export async function board(c, ctx = {}) {
  const fuente = ATS[c.ats]
  if (!fuente) return { ...c, error: `ATS desconocido: ${c.ats}`, jobs: [] }
  try {
    const jobs = []
    for (let p = 0; p < (fuente.paginas ?? 1); p++) {
      const res = await pedir(fuente.url(c.token, ctx, p))
      // Un fallo en la primera página es la fuente caída; en las siguientes es
      // simplemente que no hay más resultados.
      if (!res.ok) {
        if (p === 0) {
          return {
            ...c,
            error: res.status === 429 ? 'te ha limitado por ritmo, espera unos minutos' : `HTTP ${res.status}`,
            // Un 429 se cura solo; un 404 es el token muerto. La diferencia
            // importa: el feed se cachea un día entero, y cachear un límite de
            // ritmo te dejaría sin ofertas hasta mañana.
            reintentable: res.status === 429 || res.status >= 500,
            jobs: [],
          }
        }
        break
      }
      const lote = fuente.jobs(fuente.html ? await res.text() : await res.json())
      jobs.push(...lote)
      if (lote.length === 0) break
      if (p + 1 < (fuente.paginas ?? 1)) await pausa(1500) // ritmo, no ráfaga
    }
    // c.name primero: en los tableros de empresa la oferta no trae empresa y la
    // pone esto; en los globales (RemoteOK, LinkedIn) cada oferta trae la suya y
    // debe ganar. Invertir el orden etiquetaría todo LinkedIn como "LinkedIn".
    return { ...c, jobs: jobs.map((j) => ({ company: c.name, ...j })) }
  } catch (e) {
    return { ...c, error: e.message, jobs: [] }
  }
}

// Las tarjetas de LinkedIn no traen descripción, y sin descripción no hay nada
// que filtrar. fetchOffer ya sabe convertir una URL de LinkedIn en su endpoint
// público, así que aquí solo hay que pedirlas por lotes y tolerar fallos: una
// oferta cuya descripción no baja se queda con el texto de la tarjeta en vez de
// desaparecer.
// Lotes de 3 y un segundo entre ellos: con 5 en paralelo y medio segundo,
// LinkedIn responde 429 y te quedas sin fuente. Es el servidor de otro.
export async function detalle(jobs, lote = 3) {
  const pendientes = jobs.filter((j) => j.pendiente)
  for (let i = 0; i < pendientes.length; i += lote) {
    await Promise.all(pendientes.slice(i, i + lote).map(async (j) => {
      try {
        j.text = await fetchOffer(j.url)
      } catch {
        // se queda el texto de la tarjeta
      }
      delete j.pendiente
    }))
    if (i + lote < pendientes.length) await pausa(1000)
  }
  return jobs
}

// --- filtros de nivel 1: texto, gratis ------------------------------------
// Una cifra de dinero de verdad: lleva moneda o sufijo "k". Sin eso, "2026" y
// "3 proyectos" se colarían como sueldos.
const SALARIO = /(?:(\d{2,3})\s*k\b|(?:€|\$)\s*(\d{2,3})[.,](\d{3})|(\d{2,3})[.,](\d{3})\s*(?:€|eur\b)|(\d{2,3})\s*k?\s*(?:€|eur\b))/gi

export function salarioDe(texto) {
  const cifras = []
  for (const m of String(texto).matchAll(SALARIO)) {
    if (m[1]) cifras.push(Number(m[1]) * 1000)
    else if (m[2]) cifras.push(Number(m[2] + m[3]))
    else if (m[4]) cifras.push(Number(m[4] + m[5]))
    else if (m[6]) cifras.push(Number(m[6]) < 500 ? Number(m[6]) * 1000 : Number(m[6]))
  }
  // Un rango "40.000 - 60.000" cumple un mínimo de 50.000: se mira el techo.
  return cifras.length ? Math.max(...cifras) : null
}

const MODALIDAD = {
  remoto: /\b(remote|remoto|teletrabajo|work from home|100% remote)\b/i,
  hibrido: /\b(hybrid|híbrid|hibrid)\w*\b/i,
  presencial: /\b(on-?site|presencial|in office|en oficina)\b/i,
}
const IA = /\b(ai|ia|llm|llms|genai|machine learning|deep learning|inteligencia artificial|nlp|rag)\b/i

// Un contador de descartes por motivo. Un filtro que descarta en silencio es un
// filtro en el que dejas de confiar a la semana.
const cribar = (jobs, prueba) => {
  const pasan = []
  const descartes = {}
  for (const j of jobs) {
    const motivo = prueba(j)
    if (motivo) descartes[motivo] = (descartes[motivo] ?? 0) + 1
    else pasan.push(j)
  }
  return { pasan, descartes }
}

// Lo que se decide con la cabecera, SIN bajar la descripción. Va primero para
// no pedirle a LinkedIn el detalle de ofertas que ya sabemos que no quieres.
export function filtrarCabecera(jobs, { ubicacion = UBICACION, ventana = 'todo', hoy = new Date(), veto = [] } = {}) {
  let re
  try { re = new RegExp(ubicacion || UBICACION, 'i') } catch { re = new RegExp(UBICACION, 'i') }

  const dias = VENTANAS[ventana]?.dias ?? null
  const corte = dias == null ? null : new Date(hoy.getTime() - dias * 864e5).toISOString().slice(0, 10)
  const vetadas = veto.filter((v) => v.trim())
    .map((v) => new RegExp(`\\b${v.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))

  return cribar(jobs, (j) => {
    if (!re.test(j.location ?? '')) return 'ubicación'
    // Sin fecha no se puede saber si es de hoy o de marzo: con ventana activa
    // se descarta, porque colarla sería mentir sobre el criterio que pediste.
    if (corte && (!j.fecha || j.fecha < corte)) return 'fuera de la ventana'
    if (vetadas.some((re) => re.test(j.title ?? ''))) return 'palabra vetada'
    return null
  })
}

// Lo que necesita la descripción completa.
export function filtrarTexto(jobs, {
  minHits = MIN_HITS, salarioMin = 0, descartarSinSalario = false,
  modalidades = [], lenguajes = [], ia = 'indiferente',
} = {}) {
  const { pasan, descartes } = cribar(jobs, (j) => {
    const texto = j.text ?? ''
    j.salario = salarioDe(texto)
    if (salarioMin > 0) {
      if (j.salario == null) { if (descartarSinSalario) return 'sin salario publicado' }
      else if (j.salario < salarioMin) return 'salario bajo'
    }
    if (modalidades.length && !modalidades.some((m) => MODALIDAD[m]?.test(texto))) return 'modalidad'
    if (lenguajes.length && !lenguajes.every((l) => match(texto, [l]).length)) return 'falta lenguaje'
    if (ia === 'con' && !IA.test(texto)) return 'sin IA'
    if (ia === 'sin' && IA.test(texto)) return 'con IA'
    j.hits = match(texto)
    if (j.hits.length < minHits) return 'pocas coincidencias'
    return null
  })

  // El texto crudo son decenas de KB por oferta y nadie lo lee al otro lado.
  return {
    pasan: pasan.map(({ text, pendiente, ...j }) => j).sort((a, b) => b.hits.length - a.hits.length),
    descartes,
  }
}

export function filtrar(jobs, criterios = {}) {
  const cabecera = filtrarCabecera(jobs, criterios)
  const texto = filtrarTexto(cabecera.pasan, criterios)
  return { pasan: texto.pasan, descartes: { ...cabecera.descartes, ...texto.descartes } }
}

// --- búsqueda --------------------------------------------------------------
// Todos los criterios son parámetros con los valores de siempre por defecto:
// sin preset se comporta igual que el CLI de toda la vida.
export async function buscar(preset = {}) {
  const { empresas = COMPANIES, ventana = 'todo' } = preset
  const boards = await Promise.all(empresas.map((c) => board(c, { ventana })))
  const jobs = boards.flatMap((b) => b.jobs)

  // Cabecera -> detalle -> texto. Bajar la descripción es lo caro y lo que se
  // le pide al servidor de otro, así que solo se hace sobre lo que ya ha pasado
  // ubicación, fecha y veto de título.
  const cabecera = filtrarCabecera(jobs, { ...preset, ventana })
  const texto = filtrarTexto(await detalle(cabecera.pasan), preset)

  return {
    jobs: texto.pasan,
    total: jobs.length,
    descartes: { ...cabecera.descartes, ...texto.descartes },
    // Sin resultados casi siempre significa token caducado, no que no haya
    // ofertas: se devuelve para poder avisar en vez de fallar en silencio.
    dead: boards.filter((b) => b.error || b.jobs.length === 0)
      .map((b) => ({ name: b.name, error: b.error ?? 'sin ofertas', reintentable: b.reintentable ?? false })),
    // Las keywords viajan por el mismo motivo: la pantalla de criterios ofrece
    // los lenguajes de tu CV para marcarlos como obligatorios, y derivarlas otra
    // vez en el cliente sería duplicar las reglas de parseo en dos sitios.
    keywords,
    // Los criterios efectivos, para que la pantalla pueda partir de ellos sin
    // importar este módulo (arrastraría el SDK de OpenAI al bundle).
    preset: {
      empresas, ventana,
      ubicacion: preset.ubicacion ?? UBICACION,
      minHits: preset.minHits ?? MIN_HITS,
      veto: preset.veto ?? [],
      salarioMin: preset.salarioMin ?? 0,
      descartarSinSalario: preset.descartarSinSalario ?? false,
      modalidades: preset.modalidades ?? [],
      lenguajes: preset.lenguajes ?? [],
      ia: preset.ia ?? 'indiferente',
      excluirInglesImprescindible: preset.excluirInglesImprescindible ?? false,
    },
  }
}

export default async function handler(req, res) {
  // needsKey=false: el feed no llama al modelo, solo a APIs públicas. Sin esto
  // devolvería 500 por falta de NVIDIA_API_KEY sin tener nada que ver.
  const blocked = gate(req, res, false)
  if (blocked) return blocked

  try {
    res.status(200).json(await buscar(req.body ?? {}))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
