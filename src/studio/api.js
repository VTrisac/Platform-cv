import { dataES } from '../data.js'

// Quien firma el CV. Del maestro y no escrito a mano aquí: si algún día cambia,
// cambia en un sitio.
const NOMBRE = dataES.name

// El baile del 401, una sola vez: pide la contraseña, la recuerda y repite la
// llamada. `hacer(key)` es lo único que cambia entre los dos llamantes —uno
// espera JSON y el otro un binario—, así que lo demás no tiene por qué estar
// escrito dos veces. Lo estuvo, y es exactamente cómo divergió TailorPanel.
async function conClave(hacer) {
  const res = await hacer(localStorage.getItem('tailorKey') ?? '')
  if (res.status !== 401) return res
  const pedida = window.prompt('Contraseña de la app:')
  if (!pedida) throw new Error('Hace falta la contraseña.')
  localStorage.setItem('tailorKey', pedida)
  return hacer(pedida)
}

// `signal` es opcional y llega hasta el fetch: es lo que permite al editor
// cortar una auditoría de 240 s sin esperarla. AbortController es nativo, no hace
// falta nada más. Sin señal se comporta exactamente igual que antes, que es lo
// que necesitan la Cola y el resto de llamantes.
const pedir = (path, key, body, signal) => fetch(path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-tailor-key': key },
  body: JSON.stringify(body),
  signal,
})

export async function apiPost(path, body, signal) {
  const res = await conClave((key) => pedir(path, key, body, signal))
  // .catch: cuando la función se pasa del techo de tiempo, Vercel devuelve una
  // página de error en HTML, no JSON, y el res.json() pelado reventaba con un
  // "Unexpected token '<'" en vez de decir qué había pasado.
  const json = await res.json().catch(() => ({}))
  if (res.status === 401) throw new Error(json.error ?? 'Contraseña incorrecta.')
  if (!res.ok) throw new Error(json.error ?? (res.status === 504
    ? 'La llamada ha tardado demasiado y el servidor la ha cortado. Vuelve a probar.'
    : `Error ${res.status}`))
  return json
}

// Una URL suelta se scrapea; cualquier otra cosa es el texto de la oferta.
export const auditar = (entrada, lang, signal) =>
  apiPost('/api/audit', { [/^https?:\/\//i.test(entrada.trim()) ? 'url' : 'text']: entrada.trim(), lang }, signal)

// Sin preset, el servidor usa los valores de siempre.
export const buscarFeed = (preset) => apiPost('/api/feed', preset ?? {})

// Solo los criterios de fábrica y la lista de empresas: no sale a buscar, así
// que es inmediato. Lo usa la pantalla de criterios para poder ofrecerte las
// empresas que tu preset guardado no tiene.
export const criteriosPorDefecto = () => apiPost('/api/feed', { soloPreset: true })

// Manda el HTML del CV ya renderizado a que Chromium lo imprima limpio y
// devuelve el PDF. No pasa por apiPost porque la respuesta es binaria, pero el
// 401 sí es el mismo y sale de conClave().
//
// Devuelve el blob y no la descarga porque hay dos usos: bajarlo al disco y
// adjuntarlo al formulario del portal.
export async function pdfBlob({ html, styles, css, filename }) {
  const res = await conClave((key) => pedir('/api/pdf', key, { html, styles, css, filename }))
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`)
  return res.blob()
}

// --- el nombre del fichero ---------------------------------------------------
// Es lo que ve el recruiter: el mismo nombre viaja al portal en el paquete de la
// extensión. Tres piezas y nada más — tú, el puesto y el idioma.
//
// Antes llevaba también la empresa y el puesto ENTERO, y salían cosas como
// `CV_Amazon_Business-Intelligence-Engineer-Data-and-Analy_EN.pdf`: 58
// caracteres con la última palabra partida por la mitad.
const slug = (s, max = 45) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-').slice(0, max).replace(/^-+|-+$/g, '')

// "VÍCTOR TRISAC" en un nombre de fichero grita. Capital inicial ANTES de
// limpiar, para que el slug reciba "Víctor Trisac" y devuelva "Victor-Trisac".
const capital = (s) => String(s ?? '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

// Lo que alarga el nombre es la coletilla del puesto: el modelo devuelve
// "Business Intelligence Engineer, Data and Analytics Platform". Se corta por el
// primer separador, que es justo donde los títulos la meten.
//
// El guion solo corta ENTRE ESPACIOS y la barra no corta nunca: si no,
// "Full-Stack Developer" se quedaría en "Full" y "AI/ML Engineer" en "AI".
const SEPARADOR = /\s*[,|(:·–—]|\s+-\s+/

// ponytail: sin la empresa, dos ofertas del MISMO puesto en sitios distintos dan
// el mismo fichero, y getFileHandle(create:true) sobrescribe sin preguntar. Se
// acepta a cambio del nombre corto; si algún día molesta, la empresa vuelve como
// tercera pieza entre el nombre y el puesto.
export const nombrePdf = (puesto, lang) =>
  [slug(capital(NOMBRE)), slug(String(puesto ?? '').split(SEPARADOR)[0], 40), String(lang).toUpperCase()]
    .filter(Boolean).join('_') + '.pdf'

// --- la carpeta de destino ---------------------------------------------------
// Una web NO puede escribir en una ruta absoluta: no hay forma de decirle
// "guarda en ~/Desktop/Oferta" por código. Lo que sí hay es la File System
// Access API, nativa: eliges la carpeta una vez, el navegador se queda con el
// permiso, y a partir de ahí cada PDF cae ahí solo y sin diálogo.
//
// El handle no cabe en localStorage —no es JSON—, así que va a IndexedDB, que
// sí serializa objetos estructurados. Son quince líneas de IndexedDB a pelo:
// una dependencia para esto sería peso muerto.
const idb = (modo, fn) => new Promise((listo, fallo) => {
  const req = indexedDB.open('cvStudio', 1)
  req.onupgradeneeded = () => req.result.createObjectStore('fs')
  req.onerror = () => fallo(req.error)
  req.onsuccess = () => {
    const r = fn(req.result.transaction('fs', modo).objectStore('fs'))
    r.onsuccess = () => listo(r.result)
    r.onerror = () => fallo(r.error)
  }
})

const permitida = async (dir) => {
  const opciones = { mode: 'readwrite' }
  return (await dir.queryPermission(opciones)) === 'granted'
    || (await dir.requestPermission(opciones)) === 'granted'
}

// null = este navegador no la soporta, o has cancelado el selector: quien llama
// se cae a la descarga de toda la vida.
// ponytail: el selector exige un gesto de usuario reciente (5 s en Chrome). Por
// eso se pide ANTES de generar el PDF, que tarda; al revés caducaría. Si algún
// día el permiso se pierde a mitad, el catch te devuelve la descarga normal.
async function carpeta() {
  if (!window.showDirectoryPicker) return null
  try {
    const guardada = await idb('readonly', (s) => s.get('carpeta'))
    if (guardada) return (await permitida(guardada)) ? guardada : null
    const dir = await window.showDirectoryPicker({ id: 'cv-ofertas', mode: 'readwrite', startIn: 'desktop' })
    await idb('readwrite', (s) => s.put(dir, 'carpeta'))
    return dir
  } catch {
    return null
  }
}

// Olvida la carpeta elegida, para poder cambiarla desde la pantalla de perfil.
export const olvidarCarpeta = () => idb('readwrite', (s) => s.delete('carpeta'))

// Devuelve el nombre de la carpeta donde ha caído, o null si ha ido a Descargas.
export async function descargarPdf(args) {
  const dir = await carpeta() // primero: necesita el gesto del clic todavía vivo
  const blob = await pdfBlob(args)

  if (dir) {
    const fichero = await dir.getFileHandle(args.filename, { create: true })
    const escritor = await fichero.createWritable()
    await escritor.write(blob)
    await escritor.close()
    return dir.name
  }

  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: args.filename })
  // Colgado del documento y revocado después: un <a> suelto no dispara la
  // descarga fuera de Chrome, y revocar en la misma vuelta la aborta.
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return null
}

export const base64 = (blob) => new Promise((listo, fallo) => {
  const fr = new FileReader()
  fr.onload = () => listo(String(fr.result).split(',')[1])
  fr.onerror = () => fallo(new Error('No se ha podido leer el PDF.'))
  fr.readAsDataURL(blob)
})

// --- la extensión ------------------------------------------------------------
// Rellenar un formulario de OTRO dominio es imposible desde aquí: lo prohíbe el
// navegador. Lo hace la extensión de extension/, y se habla con ella por
// postMessage a través de su content script (bridge.js), que además deja este
// atributo en el <html> para poder saber si está instalada.
export const hayExtension = () => document.documentElement.dataset.cvStudio === '1'

export const INSTALAR = 'Falta la extensión de CV Studio. Ábrela en chrome://extensions, '
  + 'activa el modo desarrollador y pulsa «Cargar descomprimida» sobre la carpeta extension/.'

export function extension(mensaje, ms = 8000) {
  return new Promise((listo, fallo) => {
    const id = crypto.randomUUID()
    const oir = (e) => {
      if (e.source !== window || e.data?.para !== 'cv-studio-app' || e.data.id !== id) return
      clearTimeout(reloj)
      window.removeEventListener('message', oir)
      listo(e.data.respuesta)
    }
    const reloj = setTimeout(() => {
      window.removeEventListener('message', oir)
      fallo(new Error('La extensión no responde. Recarga la página.'))
    }, ms)
    window.addEventListener('message', oir)
    window.postMessage({ para: 'cv-studio-ext', id, mensaje }, location.origin)
  })
}

// Abre la oferta en una pestaña y deja que la extensión la rellene.
export async function aplicar(paquete) {
  if (!hayExtension()) throw new Error(INSTALAR)
  const r = await extension({ tipo: 'aplicar', paquete })
  if (r?.error) throw new Error(r.error)
  return r
}
