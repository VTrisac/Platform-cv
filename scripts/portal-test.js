// Prueba la extensión ENTERA contra formularios de candidatura REALES.
//
//   node scripts/portal-test.js            -> Greenhouse y Lever
//   node scripts/portal-test.js lever      -> solo esa fuente
//
// Por qué existe: apply-test.js prueba la tabla de campos (lógica pura) y eso es
// lo que se rompe más a menudo, pero NUNCA se había ejecutado rellenar.js dentro
// de un Chrome con la extensión cargada de verdad. Todo lo que hay entre el
// manifest y el DOM de un portal —que el content script se inyecte, que el
// service worker sirva el paquete, que react-select abra— no lo cubría nada.
//
// Fuera de `npm test` a propósito: necesita navegador, red y los servidores de
// otros. Un test que depende de que Greenhouse esté en pie no puede bloquear un
// commit.
//
// Las URLs no van a pelo: se piden a los mismos tableros que usa el feed, con
// board() de api/feed.js. Una URL fija en el código se muere en semanas y el test
// pasa a fallar por el motivo equivocado.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'
import { board } from '../api/feed.js'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const EXT = new URL('../extension', import.meta.url).pathname
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// De dónde sacar una oferta viva. Los tokens son los mismos de COMPANIES.
const FUENTES = {
  greenhouse: { name: 'Greenhouse', ats: 'greenhouse', token: 'anthropic' },
  lever: { name: 'Lever', ats: 'lever', token: 'qonto' },
}

// El paquete que arma el editor al pulsar "Aplicar", con un PDF mínimo pero
// válido: adjuntar() solo necesita bytes y un nombre.
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
  + '2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
).toString('base64')

const paquete = (url) => ({
  url,
  origin: 'http://localhost:5173',
  key: '',
  lang: 'en',
  perfil: {
    nombre: 'Víctor', apellidos: 'Trisac', email: 'victor@example.com', telefono: '600000000',
    ubicacion: 'Barcelona, España', pais: 'Spain', linkedin: 'https://www.linkedin.com/in/x',
    github: '', web: 'https://example.com',
    autorizado: true, necesitaVisado: false,
    salarioObjetivo: '63.000 € brutos/año', preaviso: '15 días', disponibilidad: 'Inmediata',
    aniosExperiencia: '6', fuente: 'LinkedIn', eeo: 'decline',
  },
  carta: 'Estimados, me interesa el puesto porque…',
  oferta: { empresa: 'Prueba', puesto: 'Engineer', texto: 'Texto de la oferta.' },
  cv: { nombre: 'CV_Prueba_EN.pdf', tipo: 'application/pdf', base64: PDF },
})

// Un clic en cualquier mundo dispara un evento que SÍ ve un listener del mundo
// principal: los content scripts tienen sus propios globals, pero el DOM y sus
// oyentes son los mismos. Parchear HTMLElement.prototype.click no valdría.
const GRABADOR = () => {
  window.__clics = []
  document.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest?.('button,[role="button"],input[type="submit"],a') ?? e.target
      const t = (b.innerText || b.value || b.getAttribute?.('aria-label') || '').replace(/\s+/g, ' ').trim()
      if (t) window.__clics.push(t.slice(0, 60))
    },
    true
  )
}

async function ofertaViva(fuente) {
  const { jobs, error } = await board(fuente)
  if (error) throw new Error(`${fuente.name}: la fuente falló (${error})`)
  const j = jobs.find((x) => x.url)
  if (!j) throw new Error(`${fuente.name}: no hay ofertas abiertas ahora mismo`)
  return j
}

async function probar(browser, fuente) {
  const oferta = await ofertaViva(fuente)
  console.log(`\n${fuente.name}: ${oferta.title}\n  ${oferta.url}`)

  const page = await browser.newPage()
  await page.evaluateOnNewDocument(GRABADOR)
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 45000 })

  // El service worker es quien guarda el paquete por pestaña. Se le pide que haga
  // exactamente lo que hace aplicar(), pero sobre la pestaña que ya tenemos
  // instrumentada — abrir otra desde la extensión nos dejaría sin el grabador.
  // El service worker de MV3 es perezoso: no existe como target hasta que alguien
  // le habla. Quien lo despierta es el content script de esta misma página al
  // pedir su paquete, así que se espera DESPUÉS de cargarla, nunca antes.
  const worker = await browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 30000 })
  const sw = await worker.worker()
  const puesto = await sw.evaluate(async (url, p) => {
    const [tab] = await chrome.tabs.query({ url: url.split('?')[0] + '*' })
    if (!tab) return 'no encuentro la pestaña'
    await chrome.storage.session.set({
      [`paquete:${tab.id}`]: { ...p, password: `Cv-${crypto.randomUUID().slice(0, 12)}!7`, paso: 0 },
    })
    return 'ok'
  }, oferta.url, paquete(oferta.url))
  assert.equal(puesto, 'ok', 'el service worker no ha podido guardar el paquete')

  // Con el paquete ya en sitio, el content script arranca y se pone a rellenar.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 })
  await pausa(20000) // esperar formulario + dos vueltas + la llamada al modelo si la hay

  // Por MARCOS, no solo el principal: Greenhouse sirve el formulario dentro de un
  // iframe y el content script corre ahí (all_frames: true en el manifest).
  // Mirando solo document.* salían 0 campos con el panel diciendo 9 — el fallo
  // habría sido del test, no del código.
  const porMarco = await Promise.all(page.frames().map((f) => f.evaluate(() => {
    const host = document.getElementById('cv-studio-panel')
    const visible = (el) => el.type !== 'hidden' && el.offsetParent !== null
    // Una casilla sin marcar tiene `value` ("He/him") y colaba como campo relleno:
    // Lever tiene diez de pronombres y salían las diez.
    const conValor = (el) =>
      el.type === 'file' ? el.files.length
        : el.type === 'checkbox' || el.type === 'radio' ? el.checked
          : String(el.value ?? '').trim()
    return {
      panel: host?.shadowRoot?.querySelector('.p')?.innerText ?? null,
      rellenos: [...document.querySelectorAll('input,textarea,select')]
        .filter((el) => visible(el) && conValor(el))
        .map((el) => `${el.name || el.id || el.type}=${el.type === 'file' ? el.files[0].name : String(el.value).slice(0, 34)}`),
      ficheros: [...document.querySelectorAll('input[type=file]')].filter((el) => el.files.length).length,
      clics: window.__clics ?? [],
    }
  }).catch(() => ({ panel: null, rellenos: [], ficheros: 0, clics: [] }))))

  const r = {
    panel: porMarco.map((m) => m.panel).find(Boolean) ?? null,
    rellenos: porMarco.flatMap((m) => m.rellenos),
    ficheros: porMarco.reduce((n, m) => n + m.ficheros, 0),
    clics: porMarco.flatMap((m) => m.clics),
  }

  console.log(`  campos con valor: ${r.rellenos.length}`)
  console.log(`  ${r.rellenos.slice(0, 12).join('\n  ')}`)
  console.log(`  ficheros adjuntos: ${r.ficheros}`)
  console.log(`  clics: ${r.clics.length ? r.clics.join(' · ') : '(ninguno)'}`)
  console.log(`  panel: ${r.panel ? r.panel.replace(/\n/g, ' | ').slice(0, 200) : 'NO HA APARECIDO'}`)

  // --- lo que se afirma ------------------------------------------------------
  // 1. La regla que no se negocia: NINGÚN clic en un botón de enviar.
  const ENVIAR = /\bsubmit\b|send application|^send$|^enviar|finalizar|^finish$/i
  const prohibidos = r.clics.filter((t) => ENVIAR.test(t))
  assert.deepEqual(prohibidos, [], `SE HA PULSADO UN BOTÓN DE ENVIAR: ${prohibidos.join(', ')}`)

  // 2. La extensión ha llegado a engancharse: sin panel, no se ha inyectado nada
  //    y todo lo demás daría un falso negativo silencioso.
  assert.ok(r.panel, 'el panel de la extensión no ha aparecido: el content script no se ha inyectado')

  // 3. Ha rellenado algo de verdad. Un panel que dice "0 campos" es un fallo.
  assert.ok(r.rellenos.length >= 2, `solo ${r.rellenos.length} campos con valor`)

  // 4. El CV. No se puede exigir que quede adjunto siempre: el Greenhouse nuevo
  //    no tiene <input type=file> en el DOM —abre el selector del sistema al
  //    pulsar «Attach»— y una extensión no puede rellenar ese diálogo. Lo que SÍ
  //    se exige es que el panel no mienta: o está adjunto, o lo dice.
  const dicheAdjunto = /CV adaptado adjunto/.test(r.panel)
  assert.equal(dicheAdjunto, r.ficheros >= 1,
    r.ficheros >= 1
      ? 'ha adjuntado el CV pero el panel no lo dice'
      : 'el panel dice que el CV está adjunto y no hay ningún fichero puesto')
  if (!r.ficheros) console.log('  (este portal no expone input[type=file]: el CV lo adjunta él, y el panel lo avisa)')

  await page.close()
  return { fuente: fuente.name, campos: r.rellenos.length, ficheros: r.ficheros }
}

const perfil = mkdtempSync(join(tmpdir(), 'cv-portal-'))
let browser
try {
  // Perfil temporal y NO el tuyo: Chrome no deja depurar el perfil por defecto
  // («DevTools remote debugging requires a non-default data directory»), y aunque
  // dejara, una prueba no debe correr dentro de tu sesión de LinkedIn.
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false, // una extensión MV3 necesita cabeza: sin ella no hay service worker
    userDataDir: perfil,
    args: ['--no-first-run'],
    // Puppeteer añade --disable-extensions por defecto. Con él, loadUnpacked
    // devuelve un id y la extensión NO corre: ni content script, ni service
    // worker, y chrome://extensions dice que el modo desarrollador «lo gestiona
    // tu administrador». Dos horas de diagnóstico por una bandera implícita.
    ignoreDefaultArgs: ['--disable-extensions'],
  })

  // --load-extension ya no hace nada en Chrome 151: el switch sigue en el binario
  // pero es inerte (medido: cero targets de extensión). Se carga por CDP, que es
  // lo mismo que hace el botón "Cargar descomprimida".
  //
  // Y este es el sitio donde se cae un manifest inválido, con el motivo exacto.
  // Pasó de verdad: un comodín en medio del host
  // ("https://cv-victor-trisac-*.vercel.app/*") hacía que Chrome rechazara la
  // extensión ENTERA con "Invalid host wildcard". Nunca llegó a cargarse en
  // ningún navegador, y por eso "Aplicar" nunca hizo nada.
  const cdp = await browser.target().createCDPSession()
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: EXT }).catch((e) => {
    throw new Error(`Chrome ha rechazado la extensión: ${e.message.split('\n')[0]}`)
  })
  console.log(`extensión cargada · id ${id}`)

  const cuales = process.argv.slice(2).filter((a) => FUENTES[a])
  const fuentes = (cuales.length ? cuales : Object.keys(FUENTES)).map((k) => FUENTES[k])

  const resultados = []
  for (const f of fuentes) resultados.push(await probar(browser, f))

  console.log(`\nok — ${resultados.length} portales reales; ningún botón de enviar pulsado`)
} finally {
  await browser?.close()
  rmSync(perfil, { recursive: true, force: true })
}
