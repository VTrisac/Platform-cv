// Bajar una oferta de un portal y dejarla en texto plano. Nada de esto sabe del
// modelo, y por eso vive fuera de api/tailor.js: /api/feed solo necesitaba esto
// de allí, y a cambio cargaba el SDK de OpenAI en cada invocación.
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
