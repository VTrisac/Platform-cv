// Motor del feed de ofertas: consulta tableros públicos y la búsqueda pública de
// LinkedIn, baja la descripción de cada oferta y aplica los filtros baratos —los
// que salen del texto y no cuestan una llamada al modelo.
//
// POST /api/feed  { empresas?, ubicacion?, ventana?, veto?, ...criterios }
//   -> { jobs[], total, descartes{}, parcial, dead[], preset }
//
// Vive en api/ y no en scripts/ porque .vercelignore excluye scripts/ del
// despliegue: aquí el motor se despliega y scripts/feed.js lo importa para el
// CLI. Lo que es exclusivo de terminal (tabla markdown, --check, leer ofertas/)
// se queda allí; esto no sabe nada de ficheros.
//
// El orden importa y es el mismo que ya elegiste para auditar antes de adaptar:
// lo barato primero. Pero DESCARTAR solo descartan tres cosas —ubicación,
// ventana y palabras vetadas—, porque son inequívocas y las escribes tú. Los
// demás criterios ANOTAN (`avisos`, `cumple`) y el orden hace el resto: un
// regex sobre el texto de una oferta no sabe lo suficiente como para borrarla.
// Medido el 28-08-2026, cuando sí borraban: de 534 ofertas, la nota tiraba 430
// y el combo de todos los días dejaba 26. Ver filtrarTexto().
import { gate, fetchOffer, strip } from './tailor.js'
import { dataEN } from '../src/data.js'

export const maxDuration = 300

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// Tokens de empresa verificados con --check el 27-07-2026, y los de Workday y
// Amazon el 19-08-2026. Amenitiz salió de la lista: llevaba en 404 desde el
// 11-08-2026 y solo servía para ensuciar el aviso de "sin resultados".
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
  // Farma y big tech por Workday. Tokens verificados el 19-08-2026 con --check.
  // El cuarto segmento es la BÚSQUEDA, no un filtro de ubicación: estos tableros
  // son globales y traen miles de puestos, así que sin acotar aquí bajarías 60
  // vacantes de Hyderabad y las tiraría todas el filtro de ubicación.
  { name: 'Novartis', ats: 'workday', token: 'novartis|wd3|Novartis_Careers|Barcelona' },
  { name: 'AstraZeneca', ats: 'workday', token: 'astrazeneca|wd3|Careers|Barcelona' },
  { name: 'Roche', ats: 'workday', token: 'roche|wd3|roche-ext|Spain' },
  { name: 'GSK', ats: 'workday', token: 'gsk|wd5|GSKCareers|Spain' },
  { name: 'Sanofi', ats: 'workday', token: 'sanofi|wd3|SanofiCareers|Barcelona' },
  { name: 'Pfizer', ats: 'workday', token: 'pfizer|wd1|PfizerCareers|Spain' },
  { name: 'NVIDIA', ats: 'workday', token: 'nvidia|wd5|NVIDIAExternalCareerSite|Spain' },
  { name: 'Salesforce', ats: 'workday', token: 'salesforce|wd12|External_Career_Site|Spain' },
  { name: 'Adobe', ats: 'workday', token: 'adobe|wd5|external_experienced|Spain' },
  { name: 'Amazon', ats: 'amazon', token: 'engineer|Spain' },
]

export const UBICACION = 'barcelona|madrid|valencia|spain|españa|remote|emea|europe'

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

// Lo mismo que ya sabes hacer, dicho con otras palabras. El CV no se toca: esto
// es el diccionario con el que se LEE la oferta, no lo que el CV afirma saber.
// Sin esto una oferta que solo dice "build LLM agents with RAG" sacaba un 0, y
// es literalmente tu trabajo: medido el 28-08-2026, había ofertas tituladas
// "AI Engineer" puntuando 0/10 y 3/10.
// ponytail: fuera 'prompt' y 'agents' a secas — "prompt response" y "sales
// agents" son inglés normal, no tu stack. Los inequívocos sí entran.
const TAMBIEN_TUYO = [
  'LLM', 'LLMs', 'GenAI', 'generative AI', 'machine learning', 'deep learning',
  'NLP', 'prompt engineering', 'agentic', 'embeddings', 'vector database',
  'fine-tuning', 'chatbot', 'microservices', 'microservicios',
  'Git', 'Linux', 'pandas', 'NumPy', 'CI/CD',
]

// Lo tuyo, para leer ofertas. `keywords` sigue siendo solo lo que dice el CV.
export const MIOS = [...new Set([...keywords, ...TAMBIEN_TUYO])]

// Lo que TÚ no tienes y las ofertas piden. Son DOS listas y no una porque no
// significan lo mismo, y meterlas en el mismo saco era lo que vaciaba el feed:
// que una oferta pida Ruby on Rails significa que no es tu puesto; que pida
// PyTorch o AWS significa que SÍ lo es y hay una herramienta que no has tocado.
// Medido el 28-08-2026: con una sola lista, 113 de 182 ofertas técnicas reales
// —"Senior AI Engineer", "Machine Learning Engineer"— bajaban de 5/10 y se
// descartaban. AWS solo restaba en 43 de ellas.
//
// Otro oficio: SÍ cuenta en el denominador y baja la nota.
// ponytail: 'Go' NO está y no debe volver. Son dos letras y el match es
// case-insensitive, así que casaba con el verbo inglés — "we go beyond",
// "go-to-market", "ready to go?", "GO LIVE" —: 32 ofertas técnicas penalizadas
// por una palabra de relleno. 'Golang' es inequívoco y cubre el caso real.
const OTRO_MUNDO = [
  'Ruby', 'Rails', 'Golang', 'Rust', 'PHP', 'Laravel', 'Symfony', '.NET', 'Scala',
  'Elixir', 'Perl', 'Kotlin', 'Swift', 'Objective-C', 'Angular', 'Svelte', 'Ember',
  'Magento', 'Shopify', 'WordPress', 'Drupal', 'Flutter', 'React Native',
  'Unity', 'Unreal', 'SAP', 'Salesforce',
]

// Tu oficio con una herramienta que no has tocado: NO cuenta en el denominador,
// se devuelve en `falta` para que la veas. Aprender MLflow no te cambia de
// profesión; aprender Rails sí.
const VECINAS = [
  'AWS', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'Kafka', 'RabbitMQ',
  'Spark', 'Hadoop', 'Snowflake', 'Databricks', 'Airflow', 'dbt', 'Tableau',
  'PowerBI', 'Looker', 'PyTorch', 'TensorFlow', 'Keras', 'scikit-learn',
  'Hugging Face', 'Kubeflow', 'MLflow', 'Selenium', 'Cypress', 'Puppeteer',
]

// El vocabulario con el que se lee el stack de una oferta: lo tuyo y lo ajeno.
export const VOCABULARIO = [...new Set([...MIOS, ...OTRO_MUNDO, ...VECINAS])]

// La nota de encaje, de 0 a 10: qué proporción de lo que pide la oferta cubres.
//
// El denominador tiene suelo 4 a propósito. Sin él, una oferta que solo nombra
// "Python" te daría un 10 por una sola coincidencia, y ese 10 no significaría
// nada: no hay señal suficiente para afirmar que encajas. Con el suelo, hacen
// falta al menos cuatro tecnologías tuyas para llegar al 10.
export function notaDe(texto) {
  const hits = match(texto, MIOS)
  const stack = [...hits, ...match(texto, OTRO_MUNDO)]
  const nota = Math.min(10, Math.round((10 * hits.length) / Math.max(stack.length, 4)))
  // `falta` no puntúa en contra: es lo vecino que la oferta pide y no has tocado.
  return { nota, stack, hits, falta: match(texto, VECINAS) }
}

// Fechas: cada fuente la da en su formato (ISO, epoch en milisegundos, o solo
// el día). Todas acaban en YYYY-MM-DD, que es con lo que se compara.
// El día LOCAL, no el UTC. Amazon publica "July 27, 2026", que se parsea como
// medianoche local: en Madrid eso son las 22:00 del 26 en UTC, y un
// .toISOString() pelado devolvía el día anterior. Con una ventana de 24 horas
// eso descarta ofertas publicadas hoy.
export const iso = (v) => {
  if (v == null || v === '') return null
  const d = new Date(typeof v === 'number' ? v : String(v))
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Workday no publica la fecha, publica "Posted Today" / "Posted 5 Days Ago" /
// "Posted 30+ Days Ago". Sin traducirlo a un día, filtrarCabecera() tira TODAS
// sus ofertas por "fuera de la ventana" en cuanto eliges 24h o semana, y la
// fuente parece rota cuando lo que falta es la fecha.
export const desdeHace = (texto, hoy = new Date()) => {
  const t = String(texto ?? '').toLowerCase()
  if (!t.includes('posted')) return null
  const dias = /today/.test(t) ? 0 : /yesterday/.test(t) ? 1 : Number(/(\d+)/.exec(t)?.[1])
  return Number.isFinite(dias) ? new Date(hoy.getTime() - dias * 864e5).toISOString().slice(0, 10) : null
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
      fecha: iso(j.date),
      // La única fuente que NO se serializa entera, y con motivo: `tags` no
      // describe la oferta, es relleno para posicionar. Un "Aviation Maintenance
      // Technician" de FedEx venía con 49 etiquetas, entre ellas react, python,
      // docker y typescript — y con eso puntuaba 8/10 y se colaba por delante de
      // ofertas de verdad. Se puntúa por lo que la oferta dice, no por lo que su
      // SEO quiere vender. Medido: los demás tableros no hacen esto, así que
      // siguen serializándose enteros.
      text: [j.position, j.company, j.description, j.location].filter(Boolean).join('\n'),
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
  // Workday: donde viven las farmacéuticas y buena parte de las grandes.
  // El token son cuatro cosas separadas por "|": inquilino, centro de datos,
  // nombre del sitio y BÚSQUEDA. Los tres primeros salen de la URL de su página
  // de empleo — https://<inquilino>.<dc>.myworkdayjobs.com/<sitio> —, la cuarta
  // la eliges tú ("Barcelona", "Spain", "machine learning").
  //
  // Es la única fuente que va por POST, de ahí init(). Y limit tiene techo 20:
  // con 100 devuelve HTTP 400, así que se pagina como LinkedIn.
  //
  // La tarjeta no trae descripción; la baja detalle() con fetchOffer, que lee su
  // <script ld+json> sin necesidad de un parseo propio de Workday.
  workday: {
    paginas: 3,
    url: (token) => {
      const [inquilino, dc, sitio] = String(token).split('|')
      return `https://${inquilino}.${dc}.myworkdayjobs.com/wday/cxs/${inquilino}/${sitio}/jobs`
    },
    init: (token, _ctx, pagina = 0) => ({
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        appliedFacets: {}, limit: 20, offset: pagina * 20,
        searchText: String(token).split('|')[3] ?? '',
      }),
    }),
    jobs: (d, token) => {
      const [inquilino, dc, sitio] = String(token).split('|')
      return (d.jobPostings ?? []).map((j) => ({
        title: j.title,
        url: `https://${inquilino}.${dc}.myworkdayjobs.com/${sitio}${j.externalPath}`,
        location: j.locationsText ?? '',
        fecha: desdeHace(j.postedOn),
        text: JSON.stringify(j),
        pendiente: true, // la descripción todavía no está: la baja detalle()
      }))
    },
  },
  // Amazon tiene su propio portal con una API pública que además devuelve la
  // descripción ENTERA en el listado: no hace falta paso de detalle.
  // ponytail: country=ESP fijo. `country[]=ESP` a secas NO filtra (devuelve
  // vacantes de US/AU/GB); es la pareja loc_query + country la que funciona.
  // Si algún día buscas fuera de España, el país pasa a ser un tercer segmento.
  amazon: {
    url: (token) => {
      const [puesto = '', donde = 'Spain'] = String(token).split('|')
      return 'https://www.amazon.jobs/en/search.json'
        + `?base_query=${encodeURIComponent(puesto.trim())}&loc_query=${encodeURIComponent(donde.trim())}`
        + '&country=ESP&result_limit=100&sort=recent'
    },
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: `https://www.amazon.jobs${j.job_path}`, company: 'Amazon',
      location: j.normalized_location || j.location || '',
      fecha: iso(j.posted_date), text: JSON.stringify(j),
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
async function pedir(url, init = {}, intento = 0) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, ...init.headers },
    signal: AbortSignal.timeout(15000),
  })
  if (res.status === 429 && intento === 0) {
    await pausa(3000)
    return pedir(url, init, 1)
  }
  return res
}

export async function board(c, ctx = {}) {
  const fuente = ATS[c.ats]
  if (!fuente) return { ...c, error: `ATS desconocido: ${c.ats}`, jobs: [] }
  try {
    const jobs = []
    for (let p = 0; p < (fuente.paginas ?? 1); p++) {
      const res = await pedir(fuente.url(c.token, ctx, p), fuente.init?.(c.token, ctx, p))
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
      // El token viaja a jobs() porque Workday necesita el inquilino para
      // componer la URL de cada oferta. Las demás fuentes lo ignoran.
      const lote = fuente.jobs(fuente.html ? await res.text() : await res.json(), c.token)
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
//
// Y un presupuesto de tiempo, que es lo que faltaba. Medido el 28-08-2026 con
// este mismo código y el mismo día: 159 descripciones en 78 s cuando LinkedIn
// responde, y 3.184 s —53 minutos— cuando te está limitando el ritmo, que es lo
// que pasa al pulsar "Actualizar" dos veces seguidas mientras ajustas criterios.
// Con el techo de 300 s de Vercel eso no era un feed lento: era un 504 y CERO
// ofertas, tirando también las descripciones que ya estaban bajadas. Al agotarse
// el presupuesto, las que quedan se quedan con el texto de su tarjeta —lo mismo
// que ya pasa cuando un fetchOffer falla—.
//
// Muta `jobs` en el sitio, como siempre; devuelve cuántas se quedaron sin bajar.
export async function detalle(jobs, lote = 3, limiteMs = 180000) {
  const fin = Date.now() + limiteMs
  const pendientes = jobs.filter((j) => j.pendiente)
  for (let i = 0; i < pendientes.length; i += lote) {
    if (Date.now() >= fin) return pendientes.length - i
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
  return 0
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

// Lo que necesita la descripción completa. AVISA, no descarta.
//
// Antes cada criterio era un descarte binario y todos juntos eran un AND, así
// que se multiplicaban. Medido el 28-08-2026 sobre las 534 ofertas que pasaban
// ubicación: "remoto" tiraba 388 —casi ninguna oferta escribe la palabra, cosa
// que la propia pantalla de criterios ya admitía—, "descartar las que no
// publican salario" tiraba 392, y exigir Python + JavaScript dejaba 6. El combo
// de todos los días dejaba 26 de 534, y con la ventana de 24 h, cero.
//
// Ahora la oferta entra SIEMPRE, con sus avisos puestos, y el trabajo lo hace el
// orden: arriba lo que cumple todo lo que pediste, abajo lo que no. Un criterio
// que no encuentras es información; un criterio que borra la oferta es un feed
// vacío sin explicación.
export function filtrarTexto(jobs, {
  salarioMin = 0, exigirSalario = false,
  modalidades = [], lenguajes = [], ia = 'indiferente',
} = {}) {
  for (const j of jobs) {
    const texto = j.text ?? ''
    const avisos = []
    let ok = 0
    let de = 0
    const mide = (cumple, aviso) => {
      de++
      if (cumple) ok++
      else avisos.push(aviso)
    }

    j.salario = salarioDe(texto)
    if (exigirSalario || salarioMin > 0) {
      if (j.salario == null) mide(false, 'sin salario publicado')
      else mide(j.salario >= salarioMin, `paga ${Math.round(j.salario / 1000)}k`)
    }
    if (modalidades.length) {
      mide(modalidades.some((m) => MODALIDAD[m]?.test(texto)), 'no dice la modalidad')
    }
    // Uno por lenguaje y no un todo-o-nada: cumplir dos de tres tiene que pesar
    // más que cumplir cero, y con `every` las dos cosas valían lo mismo.
    for (const l of lenguajes) mide(match(texto, [l]).length > 0, `no menciona ${l}`)
    if (ia !== 'indiferente') {
      mide(ia === 'con' ? IA.test(texto) : !IA.test(texto), ia === 'con' ? 'sin IA' : 'con IA')
    }

    Object.assign(j, notaDe(texto), { avisos, cumple: { ok, de } })
  }

  // El texto crudo son decenas de KB por oferta y nadie lo lee al otro lado.
  // Primero lo que cumple más criterios TUYOS; a igual cumplimiento, la nota; y
  // a igual nota, la que cubre más tecnologías: un 8 sobre 10 pedidas pesa más
  // que un 8 sobre 4.
  return {
    pasan: jobs.map(({ text, pendiente, ...j }) => j).sort(
      (a, b) => b.cumple.ok - a.cumple.ok || b.nota - a.nota || b.hits.length - a.hits.length
    ),
    descartes: {},
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
// La misma oferta llega por varios sitios: dos búsquedas de LinkedIn que se
// solapan ("AI Engineer" y "Backend Engineer" pescan la misma), y la paginación
// del guest endpoint repite tarjetas. Se deduplica por el id numérico de
// LinkedIn (estable entre búsquedas y páginas) y por URL en el resto.
// ponytail: no cruza fuentes distintas —la misma oferta en LinkedIn y en el
// tablero de la empresa tiene URLs distintas y no se detecta—. Es raro y no
// vale la pena; si molesta, se añade una clave empresa+puesto normalizada.
export const claveDedup = (j) => {
  const m = /\/jobs\/view\/(?:[^/?]*-)?(\d{6,})/.exec(j.url ?? '')
  return m ? `li:${m[1]}` : (j.url || `${j.company}|${j.title}`.toLowerCase())
}

export function deduplicar(jobs) {
  const vistos = new Set()
  return jobs.filter((j) => {
    const k = claveDedup(j)
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
}

// Los criterios que se aplican de verdad: los tuyos donde los hayas puesto, y
// los de siempre en el resto.
export const presetEfectivo = (preset = {}) => ({
  empresas: preset.empresas ?? COMPANIES,
  ventana: preset.ventana ?? 'todo',
  ubicacion: preset.ubicacion ?? UBICACION,
  veto: preset.veto ?? [],
  salarioMin: preset.salarioMin ?? 0,
  // Renombrado desde `descartarSinSalario`: ya no descarta nada, ordena. Un
  // nombre que miente sobre lo que hace el código es la próxima avería.
  exigirSalario: preset.exigirSalario ?? false,
  modalidades: preset.modalidades ?? [],
  lenguajes: preset.lenguajes ?? [],
  ia: preset.ia ?? 'indiferente',
})

// Lo que la pantalla de criterios necesita saber, sin salir a buscar nada.
export const porDefecto = () => ({
  preset: presetEfectivo(), keywords, empresasPorDefecto: COMPANIES,
})

export async function buscar(preset = {}) {
  const { empresas = COMPANIES, ventana = 'todo' } = preset
  const boards = await Promise.all(empresas.map((c) => board(c, { ventana })))
  const jobs = deduplicar(boards.flatMap((b) => b.jobs))

  // Cabecera -> detalle -> texto. Bajar la descripción es lo caro y lo que se
  // le pide al servidor de otro, así que solo se hace sobre lo que ya ha pasado
  // ubicación, fecha y veto de título.
  const cabecera = filtrarCabecera(jobs, { ...preset, ventana })
  const sinDescripcion = await detalle(cabecera.pasan)
  const texto = filtrarTexto(cabecera.pasan, preset)

  return {
    jobs: texto.pasan,
    total: jobs.length,
    descartes: { ...cabecera.descartes, ...texto.descartes },
    // Cuántas se quedaron con el texto de la tarjeta porque se agotó el
    // presupuesto de tiempo. Su nota es peor de lo que les toca y hay que
    // decirlo: callarlo es volver a descartar en silencio.
    parcial: sinDescripcion,
    // Sin resultados casi siempre significa token caducado, no que no haya
    // ofertas: se devuelve para poder avisar en vez de fallar en silencio.
    dead: boards.filter((b) => b.error || b.jobs.length === 0)
      .map((b) => ({ name: b.name, error: b.error ?? 'sin ofertas', reintentable: b.reintentable ?? false })),
    // La lista de empresas de fábrica, aparte del preset. Sin esto no hay forma
    // de que una empresa nueva llegue a quien ya tiene un preset guardado: ese
    // preset trae SU propia lista de empresas y gana siempre (ver `empresas`
    // arriba), así que COMPANIES deja de existir para él el día que toca un
    // criterio. La pantalla de criterios la usa para ofrecer las que le faltan.
    empresasPorDefecto: COMPANIES,
    // Las keywords viajan por el mismo motivo: la pantalla de criterios ofrece
    // los lenguajes de tu CV para marcarlos como obligatorios, y derivarlas otra
    // vez en el cliente sería duplicar las reglas de parseo en dos sitios.
    keywords,
    // Los criterios efectivos, para que la pantalla pueda partir de ellos sin
    // importar este módulo (arrastraría el SDK de OpenAI al bundle).
    preset: presetEfectivo(preset),
  }
}

export default async function handler(req, res) {
  // needsKey=false: el feed no llama al modelo, solo a APIs públicas. Sin esto
  // devolvería 500 por falta de NVIDIA_API_KEY sin tener nada que ver.
  const blocked = gate(req, res, false)
  if (blocked) return blocked

  try {
    // La pantalla de criterios solo necesita saber qué hay de fábrica, y una
    // búsqueda entera tarda minutos. Sin este atajo, el botón de "añadir las
    // empresas que faltan" no aparecía hasta refrescar el feed — justo cuando
    // no sabes que tienes que hacerlo, porque el tablero se ve igual que ayer.
    if (req.body?.soloPreset) return res.status(200).json(porDefecto())
    res.status(200).json(await buscar(req.body ?? {}))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
