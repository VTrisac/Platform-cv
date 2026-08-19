// Llama a un endpoint pidiendo la contraseña la primera vez y recordándola.
// Compartido por el modal de nueva oferta y el editor: el flujo del 401 estaba
// duplicado y era cuestión de tiempo que divergieran.
export async function apiPost(path, body, retryKey) {
  const key = retryKey ?? localStorage.getItem('tailorKey') ?? ''
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tailor-key': key },
    body: JSON.stringify(body),
  })
  // .catch: cuando la función se pasa del techo de tiempo, Vercel devuelve una
  // página de error en HTML, no JSON, y el res.json() pelado reventaba con un
  // "Unexpected token '<'" en vez de decir qué había pasado.
  const json = await res.json().catch(() => ({}))
  if (res.status === 401) {
    const asked = window.prompt('Contraseña de la app:')
    if (!asked) throw new Error('Hace falta la contraseña.')
    localStorage.setItem('tailorKey', asked)
    return apiPost(path, body, asked)
  }
  if (!res.ok) throw new Error(json.error ?? (res.status === 504
    ? 'La llamada ha tardado demasiado y el servidor la ha cortado. Vuelve a probar.'
    : `Error ${res.status}`))
  return json
}

// Una URL suelta se scrapea; cualquier otra cosa es el texto de la oferta.
export const auditar = (entrada, lang) =>
  apiPost('/api/audit', { [/^https?:\/\//i.test(entrada.trim()) ? 'url' : 'text']: entrada.trim(), lang })

// Sin preset, el servidor usa los valores de siempre.
export const buscarFeed = (preset) => apiPost('/api/feed', preset ?? {})

// Manda el HTML del CV ya renderizado a que Chromium lo imprima limpio y
// devuelve el PDF. No usa apiPost porque la respuesta es binaria, no JSON, pero
// repite el mismo baile del 401.
//
// Devuelve el blob y no la descarga porque hay dos usos: bajarlo al disco y
// adjuntarlo al formulario del portal.
export async function pdfBlob({ html, styles, css, filename }, retryKey) {
  const key = retryKey ?? localStorage.getItem('tailorKey') ?? ''
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tailor-key': key },
    body: JSON.stringify({ html, styles, css, filename }),
  })
  if (res.status === 401) {
    const asked = window.prompt('Contraseña de la app:')
    if (!asked) throw new Error('Hace falta la contraseña.')
    localStorage.setItem('tailorKey', asked)
    return pdfBlob({ html, styles, css, filename }, asked)
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`)
  return res.blob()
}

// --- el nombre del fichero ---------------------------------------------------
// Antes era `nombre || cv.name` dentro del editor, y `nombre` estaba vacío
// siempre que no hubieras pulsado "Guardar variante" —o sea, casi siempre—, así
// que TODOS los PDF salían llamándose como tú y se pisaban en la carpeta.
const slug = (s, max = 45) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-').slice(0, max).replace(/^-+|-+$/g, '')

export const nombrePdf = (empresa, puesto, lang) =>
  ['CV', slug(empresa) || 'Oferta', slug(puesto), String(lang).toUpperCase()]
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
