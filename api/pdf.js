// Convierte el CV que se ve en el editor en un PDF limpio.
// POST /api/pdf  { html, styles: [href], filename }  -> application/pdf
//
// Por qué en el servidor y no en el navegador: window.print() estampa la
// cabecera y el pie del navegador (fecha, URL) y no hay CSS que los quite —eso
// es lo que salía "no correcto"—. Y no vale una librería que rasterice el DOM a
// imagen: el diseño ATS necesita TEXTO extraíble, así que tiene que renderizarlo
// un navegador de verdad. Aquí lo hace Chromium headless, el mismo motor que
// scripts/pdf.py, pero recibiendo el HTML del CV YA adaptado (que solo existe en
// el navegador, no en data.js).
import { gate } from './tailor.js'

export const maxDuration = 300

// Chromium se lanza distinto según dónde corra: en Vercel, el binario empacado
// de @sparticuz; en local (Mac), el Chrome que ya tienes instalado. El import de
// @sparticuz es dinámico para no cargar 50 MB cuando se prueba en local.
async function navegador() {
  const puppeteer = (await import('puppeteer-core')).default
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }
  // Local: Chrome del sistema. Si no está en la ruta típica de macOS, puppeteer
  // lo busca por el canal 'chrome'.
  return puppeteer.launch({ channel: 'chrome', headless: true })
}

export default async function handler(req, res) {
  // needsKey=false: no llama al modelo, pero sí gasta CPU cara en una URL
  // pública, así que la contraseña se sigue exigiendo.
  const blocked = gate(req, res, false)
  if (blocked) return blocked

  const { html, styles = [], css = '', filename = 'CV.pdf' } = req.body ?? {}
  if (!html) return res.status(400).json({ error: 'Falta el HTML del CV.' })

  // Los estilos llegan de dos formas para funcionar tanto desplegado como en
  // local: `styles` son los <link> del build (Chromium los baja), `css` es el
  // texto de los <style> inline que Vite inyecta en dev. El div.studio replica
  // el contexto donde los diseños leen sus variables CSS (--s-*). @page fija los
  // márgenes que el navegador no ponía.
  const enlaces = styles.map((h) => `<link rel="stylesheet" href="${h}">`).join('')
  const doc = `<!doctype html><html><head><meta charset="utf-8">${enlaces}`
    + `<style>${css}</style>`
    + `<style>@page{size:A4;margin:5mm}html,body{margin:0;padding:0;background:#fff}</style>`
    + `</head><body><div class="studio">${html}</div></body></html>`

  let browser
  try {
    browser = await navegador()
    const page = await browser.newPage()
    // 'print' para que se apliquen las @media print (incluido .print-ats).
    await page.emulateMediaType('print')
    await page.setContent(doc, { waitUntil: 'networkidle0', timeout: 30000 })
    const pdf = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' },
    })
    res.setHeader('content-type', 'application/pdf')
    res.setHeader('content-disposition', `attachment; filename="${filename.replace(/[^\w.\- ]/g, '_')}"`)
    res.status(200).send(Buffer.from(pdf))
  } catch (e) {
    res.status(500).json({ error: `No se pudo generar el PDF: ${e.message}` })
  } finally {
    await browser?.close()
  }
}
