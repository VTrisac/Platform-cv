// Motor del feed de ofertas: consulta los tableros públicos de
// Greenhouse/Lever/Ashby/Workable y puntúa cada oferta por solapamiento con las
// skills del CV (src/data.js). Sin dependencias y sin API keys.
//
// POST /api/feed  { empresas?, ubicacion?, minHits? }  -> { jobs[], dead[] }
//
// Vive en api/ y no en scripts/ porque .vercelignore excluye scripts/ del
// despliegue: aquí el motor se despliega y scripts/feed.js lo importa para el
// CLI. Lo que es exclusivo de terminal (tabla markdown, --check, leer ofertas/)
// se queda allí; esto no sabe nada de ficheros.
import { gate } from './tailor.js'
import { dataEN } from '../src/data.js'

export const maxDuration = 300

// Todos verificados con --check el 27-07-2026.
// ponytail: el token suele ser el slug de la empresa. Míralo en la URL de su
// página de empleo (boards.greenhouse.io/<token>, jobs.lever.co/<token>,
// <token>.workable.com). Si una empresa cambia de ATS desaparece EN SILENCIO:
// pasa --check cada pocos meses.
export const COMPANIES = [
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
  // Tablero global: trae ofertas de muchas empresas, no de una.
  { name: 'RemoteOK', ats: 'remoteok', token: '' },
]

export const UBICACION = 'barcelona|madrid|valencia|spain|españa|remote|emea|europe'
export const MIN_HITS = 2

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

// --- fetchers --------------------------------------------------------------
// text = el objeto entero serializado: ningún ATS necesita parseo específico.
export const ATS = {
  greenhouse: {
    url: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.absolute_url, location: j.location?.name ?? '', text: JSON.stringify(j),
    })),
  },
  lever: {
    url: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    jobs: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      title: j.text, url: j.hostedUrl, location: j.categories?.location ?? '', text: JSON.stringify(j),
    })),
  },
  ashby: {
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.jobUrl, location: j.location ?? '', text: JSON.stringify(j),
    })),
  },
  workable: {
    url: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.url ?? j.shortlink, location: [j.city, j.country].filter(Boolean).join(', '), text: JSON.stringify(j),
    })),
  },
  // Tablero global, no de una empresa: el token se ignora y cada oferta trae su
  // propia empresa. El primer elemento del array es el aviso legal, no una
  // oferta; se cae solo al exigir `position`. Sus condiciones piden enlazar de
  // vuelta y citarlos como fuente: la tabla ya enlaza a j.url.
  remoteok: {
    url: () => 'https://remoteok.com/api',
    jobs: (d) => (Array.isArray(d) ? d : []).filter((j) => j.position).map((j) => ({
      title: j.position,
      url: j.url,
      company: j.company,
      // Todo lo de RemoteOK es remoto; su `location` es la restricción
      // geográfica. Sin el prefijo no pasaría un filtro que busca "remote".
      location: ['Remote', (j.location ?? '').trim().replace(/,$/, '')].filter(Boolean).join(' · '),
      text: JSON.stringify(j),
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
      title: j.title,
      url: j.redirect_url,
      company: j.company?.display_name,
      location: j.location?.display_name ?? '',
      text: JSON.stringify(j),
    })),
  },
}

export async function board(c) {
  const fuente = ATS[c.ats]
  if (!fuente) return { ...c, error: `ATS desconocido: ${c.ats}`, jobs: [] }
  try {
    const res = await fetch(fuente.url(c.token), { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return { ...c, error: `HTTP ${res.status}`, jobs: [] }
    // c.name primero: en los tableros de empresa la oferta no trae empresa y la
    // pone esto; en los globales (RemoteOK, Adzuna) cada oferta trae la suya y
    // debe ganar. Invertir el orden etiquetaría todo RemoteOK como "RemoteOK".
    return { ...c, jobs: fuente.jobs(await res.json()).map((j) => ({ company: c.name, ...j })) }
  } catch (e) {
    return { ...c, error: e.message, jobs: [] }
  }
}

// --- búsqueda --------------------------------------------------------------
// Los tres criterios son parámetros con los valores de siempre por defecto: sin
// preset se comporta exactamente igual que el CLI de toda la vida.
export async function buscar({ empresas = COMPANIES, ubicacion = UBICACION, minHits = MIN_HITS } = {}) {
  // Una regex mala viene del panel de presets, no del código: no debe tumbar la
  // búsqueda entera, así que se cae al filtro por defecto.
  let re
  try {
    re = new RegExp(ubicacion || UBICACION, 'i')
  } catch {
    re = new RegExp(UBICACION, 'i')
  }

  const boards = await Promise.all(empresas.map(board))
  // `text` (el objeto del ATS entero) se usa para puntuar y se tira: son
  // decenas de KB por oferta que nadie va a leer al otro lado.
  const enZona = boards
    .flatMap((b) => b.jobs)
    .filter((j) => re.test(j.location))
    .map(({ text, ...j }) => ({ ...j, hits: match(text) }))

  return {
    jobs: enZona.filter((j) => j.hits.length >= minHits).sort((a, b) => b.hits.length - a.hits.length),
    total: enZona.length, // para poder decir cuántas se descartaron por pocas coincidencias
    // Sin resultados casi siempre significa token caducado, no que no haya
    // ofertas: se devuelve para poder avisar en vez de fallar en silencio.
    dead: boards.filter((b) => b.error || b.jobs.length === 0).map((b) => ({ name: b.name, error: b.error ?? 'sin ofertas' })),
    // Los criterios efectivos, para que el panel de la app pueda partir de
    // ellos sin importar este módulo (arrastraría el SDK de OpenAI al bundle).
    // re.source, no `ubicacion`: si la regex era inválida se usó la de por
    // defecto, y el panel debe enseñar la que de verdad ha filtrado.
    preset: { empresas, ubicacion: re.source, minHits },
  }
}

export default async function handler(req, res) {
  // needsKey=false: el feed no llama al modelo, solo a APIs públicas. Sin esto
  // devolvería 500 por falta de NVIDIA_API_KEY sin tener nada que ver.
  const blocked = gate(req, res, false)
  if (blocked) return blocked

  try {
    const { empresas, ubicacion, minHits } = req.body ?? {}
    res.status(200).json(await buscar({ empresas, ubicacion, minHits }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
