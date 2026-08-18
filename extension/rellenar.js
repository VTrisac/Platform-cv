// Rellena el formulario de candidatura del portal con el paquete que preparó
// CV Studio. Corre en TU navegador y en TU sesión: es la única forma de tocar
// un formulario de otro dominio, porque una web no puede hacerlo.
//
// NO PULSA ENVIAR. Nunca. Deja el formulario listo y un panel con lo que ha
// hecho; confirmar es tuyo.

const PANEL_ID = 'cv-studio-panel'
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// --- escribir de forma que React se entere -----------------------------------
// `el.value = x` se pierde en el siguiente render: React guarda su propio valor
// en el nodo y no ve la asignación. Hay que llamar al setter nativo del
// prototipo y disparar los eventos a mano. Greenhouse, Lever y Ashby son React,
// así que sin esto el formulario parece relleno y se envía vacío.
function escribir(el, valor) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// --- de dónde sale la etiqueta de un campo -----------------------------------
const texto = (n) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim()

function etiquetaDe(el) {
  const porFor = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
  const porAria = el.getAttribute('aria-labelledby')
    ?.split(/\s+/).map((id) => texto(document.getElementById(id))).filter(Boolean).join(' ')
  return texto(porFor)
    || porAria
    || el.getAttribute('aria-label')
    || texto(el.closest('label'))
    || el.placeholder
    || el.name
    || el.id
    || ''
}

// Un radio o una casilla lleva por etiqueta su propia opción ("Yes"), no la
// pregunta. La pregunta está más arriba: en la leyenda del fieldset o en el
// primer ancestro que tenga texto propio.
function preguntaDe(el) {
  const legend = texto(el.closest('fieldset')?.querySelector('legend'))
  if (legend) return legend
  const grupo = el.closest('[role="radiogroup"],[role="group"]')
  const etiquetado = grupo?.getAttribute('aria-label') || texto(document.getElementById(grupo?.getAttribute('aria-labelledby')))
  if (etiquetado) return etiquetado

  // Se sube buscando un contenedor con la pregunta, saltándose la etiqueta de
  // la propia opción: en Lever cada casilla va envuelta en su <label>He/him</label>
  // y el "Pronouns" de verdad está seis niveles más arriba.
  const propia = normalizar(etiquetaDe(el))
  let n = el.parentElement
  for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
    const candidatos = [...n.querySelectorAll('label,legend,.label,[class*="label"],[class*="question"]')]
      // Si el candidato lleva un control dentro es la etiqueta de UNA opción
      // ("She/her") o el contenedor con todas: la pregunta nunca envuelve a su
      // propio campo.
      .filter((c) => !c.querySelector('input,select,textarea')
        // Y tiene que ir ANTES del campo: subiendo lo bastante siempre acabas
        // encontrando el "First Name" de arriba del formulario, que no es la
        // pregunta de este campo sino la del primero.
        && (c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
        && texto(c).length > 3 && normalizar(texto(c)) !== propia)
    // La última de las que van antes: la más cercana por arriba, que es la que
    // un humano lee como la etiqueta de este campo.
    if (candidatos.length) return texto(candidatos[candidatos.length - 1]).slice(0, 200)
  }
  return etiquetaDe(el)
}

// "cards[8c37…][field0]", "opportunityLocationId": eso es el name del input, no
// una pregunta. Ni se rellena a ciegas ni se le manda al modelo para que se
// invente qué le están preguntando.
const esTecnica = (t) => !/\s/.test(t) && (/[[\]{}]|_|[a-z][A-Z]/.test(t) || t.length > 24)

const visible = (el) =>
  el.type !== 'hidden' && !el.disabled && !el.readOnly && el.offsetParent !== null

// Todas las opciones que comparten name: son UNA pregunta.
const grupoDe = (el) => el.name
  ? [...document.querySelectorAll(`input[type="${el.type}"][name="${CSS.escape(el.name)}"]`)]
  : [el]

// Para un grupo, "vacío" es que no haya NINGUNA marcada, no que no lo esté esta.
// Mirando solo `el` la segunda pasada volvía a pulsar el grupo y desmarcaba la
// respuesta que ya había puesto la primera.
const vacio = (el) =>
  el.type === 'radio' || el.type === 'checkbox' ? !grupoDe(el).some((c) => c.checked)
    : el.type === 'file' ? el.files.length === 0
      : !String(el.value ?? '').trim()

// --- rellenar cada tipo de control -------------------------------------------
function ponerSelect(el, valor) {
  const opciones = [...el.options]
  const quiere = opcionPara(valor, opciones.map((o) => o.textContent))
  const elegida = opciones.find((o) => o.textContent === quiere)
  if (!elegida) return false
  el.value = elegida.value
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

const esCombo = (el) =>
  el.getAttribute('role') === 'combobox' || el.getAttribute('aria-autocomplete') === 'list'

// react-select (Greenhouse, Ashby) y compañía: por fuera es un <input> de texto,
// por dentro una lista que solo aparece al abrirla. Escribirle el valor a pelo
// deja el campo con pinta de relleno y el formulario se envía vacío, así que
// hay que abrir, filtrar si la lista es larga, y hacer clic en la opción.
// Un clic sintético que React se crea. `view: window` es lo que marca la
// diferencia: sin él, el mousedown llega pero react-select no abre el menú.
// Medido en el formulario de Typeform el 18-08.
const clic = (n, tipo) => n.dispatchEvent(new MouseEvent(tipo, {
  bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, view: window,
}))

async function ponerCombo(el, valor) {
  // Sin el.focus() antes: con el input ya enfocado, react-select se traga el
  // mousedown y el menú NO abre. Medido en el formulario de Typeform: enfocar
  // primero falla siempre, el mousedown pelado sobre el contenedor abre.
  clic(el.closest('[class*="control"],[class*="value-container"]') ?? el, 'mousedown')
  await pausa(300)
  if (el.getAttribute('aria-expanded') !== 'true') {
    // Segundo intento, la otra forma que sí abre: la secuencia entera sobre el
    // propio input. Los dos caminos existen porque cada portal monta el suyo.
    el.focus()
    for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click']) clic(el, t)
    await pausa(300)
  }

  // aria-controls solo existe con el menú abierto, y solo él acota las opciones
  // a ESTE desplegable. Sin él no se toca nada: en esa misma página hay 244
  // [role="option"] sueltos que son la lista de prefijos telefónicos, y elegir
  // a ciegas ahí te cambia el teléfono en vez de responder la pregunta.
  // Es preferible dejarlo pendiente y marcado en naranja.
  const lista = el.getAttribute('aria-controls')
  if (!lista) return false
  const opciones = () => [...document.querySelectorAll(`#${CSS.escape(lista)} [role="option"]`)]

  let ops = opciones()
  // Listas largas (los países son 244) se filtran escribiendo.
  if (ops.length > 12 && typeof valor === 'string') {
    escribir(el, valor)
    await pausa(450)
    ops = opciones()
  }
  const quiere = opcionPara(valor, ops.map((o) => o.textContent))
  const elegida = ops.find((o) => o.textContent === quiere)
  if (!elegida) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    el.blur()
    return false
  }
  for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click']) clic(elegida, t)
  await pausa(150)
  return true
}

// Vale para radios y para grupos de casillas: en los dos hay que casar el texto
// de cada opción. Nunca pulsar "la primera": los pronombres de Lever son diez
// casillas con el mismo name y marcar la primera te pone "He/him" a ciegas.
function ponerOpcion(grupo, valor) {
  const etiquetas = grupo.map((r) => etiquetaDe(r))
  const quiere = opcionPara(valor, etiquetas)
  const elegido = grupo[etiquetas.indexOf(quiere)]
  if (!elegido) return false
  elegido.click() // click y no .checked: React escucha el evento, no la propiedad
  return true
}

// Un <input type="file"> no acepta una ruta, solo un FileList, y un FileList no
// se construye a mano. DataTransfer es la puerta de atrás que sí existe.
function adjuntar(el, { nombre, tipo, base64 }) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const dt = new DataTransfer()
  dt.items.add(new File([bytes], nombre, { type: tipo }))
  el.files = dt.files
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return el.files.length === 1
}

// --- el recorrido -------------------------------------------------------------
function controles() {
  return [...document.querySelectorAll('input,textarea,select')]
    .filter((el) => !['submit', 'button', 'reset', 'image'].includes(el.type) && visible(el))
}

// Sí/no en un campo de texto: "false" no es una respuesta. El idioma sale de la
// propia pregunta, que es más fiable que el <html lang> de un portal global.
const siNo = (valor, etiqueta) =>
  /[áéíóúñ¿]|\b(el|la|los|las|tu|que|trabajo|cuando)\b/i.test(etiqueta)
    ? (valor ? 'Sí' : 'No')
    : (valor ? 'Yes' : 'No')

async function rellenar(paquete, respuestas = {}, hechas = []) {
  const { perfil, carta, cv, password } = paquete
  const puestos = []
  const pendientes = []
  const vistos = new Set()
  // Una pregunta con tres radios es UNA pregunta. El name no sirve para
  // agruparlas —Lever los llama cards[uuid][fieldN]—, la etiqueta sí.
  const yaDicho = new Set()
  const anotar = (etiqueta, extra) => {
    // Ni repetida ni ya resuelta: una pregunta con dos controles se rellena por
    // el primero y el segundo falla, y salía a la vez como hecha y pendiente.
    if (yaDicho.has(etiqueta) || puestos.includes(etiqueta) || hechas.includes(etiqueta)) return
    yaDicho.add(etiqueta)
    pendientes.push({ etiqueta, ...extra })
  }

  for (const el of controles()) {
    // Un combo relleno deja su <input> vacío —el valor lo pinta un div—, así que
    // sin esta marca la segunda vuelta lo volvería a abrir.
    if (el.dataset.cvStudio === 'ok' || !vacio(el)) continue
    const esOpcion = el.type === 'radio' || el.type === 'checkbox'
    let etiqueta = esOpcion ? preguntaDe(el) : etiquetaDe(el)
    // Sin etiqueta humana, o con el name del input por etiqueta, se busca la
    // pregunta hacia arriba. Lever no pone <label for> en sus preguntas.
    if (!etiqueta || esTecnica(etiqueta)) etiqueta = preguntaDe(el)
    if (esOpcion && el.name && vistos.has(el.name)) continue
    // react-select monta inputs internos sin etiqueta ninguna. Sin etiqueta no
    // hay nada que decidir, y menos que preguntarle al modelo.
    if (!etiqueta || esTecnica(etiqueta) || el.getAttribute('aria-hidden') === 'true') continue

    // La etiqueta humana primero y el nombre técnico después: el botón de subir
    // el CV de Greenhouse se llama "Attach" y solo el id (resume / cover_letter)
    // dice cuál de los dos es.
    let clave = campoPara(etiqueta)
    if (clave === undefined) clave = campoPara(`${el.name ?? ''} ${el.id ?? ''}`)
    if (clave === null) continue // conocido y a propósito sin tocar

    // El CV se resuelve aquí y no abajo: valorPara('cv') devuelve undefined a
    // propósito —un fichero no es un valor de texto— y el hueco de subida se
    // caía por la rama de "no sé qué es esto" sin adjuntar nada.
    if (clave === 'cv') {
      if (cv && adjuntar(el, cv)) puestos.push(etiqueta)
      continue
    }
    // Otro hueco de fichero (la carta en PDF, un portfolio) es tuyo: no tenemos
    // ese fichero, y marcarlo como fallo sería ruido.
    if (el.type === 'file') continue

    // Lo que el modelo ya respondió en una vuelta anterior manda sobre la tabla.
    const valor = respuestas[etiqueta] ?? (clave ? valorPara(clave, { perfil, carta, password }) : undefined)

    if (valor === undefined) {
      // Solo se manda al modelo lo que el formulario exige. Un campo opcional
      // que no sabemos qué es se deja en blanco: es lo que harías tú.
      if (el.required || el.getAttribute('aria-required') === 'true') {
        anotar(etiqueta, {
          tipo: el.tagName === 'SELECT' || esOpcion ? 'opcion' : el.tagName === 'TEXTAREA' ? 'texto largo' : 'texto',
          opciones: el.tagName === 'SELECT' ? [...el.options].map((o) => o.textContent.trim()).filter(Boolean) : undefined,
        })
        el.style.outline = '2px solid #C08A2E'
      }
      continue
    }

    let ok = false
    if (el.tagName === 'SELECT') ok = ponerSelect(el, valor)
    else if (esCombo(el)) ok = await ponerCombo(el, typeof valor === 'boolean' ? valor : String(valor))
    else if (esOpcion) {
      // Un grupo (varias con el mismo name) se resuelve por el texto de la
      // opción; una casilla suelta —el típico "acepto"— solo se marca si la
      // respuesta es que sí.
      const grupo = grupoDe(el)
      if (el.name) vistos.add(el.name)
      ok = grupo.length > 1 ? ponerOpcion(grupo, valor) : (valor === true ? (el.click(), true) : false)
    }
    else { escribir(el, typeof valor === 'boolean' ? siNo(valor, etiqueta) : String(valor)); ok = true }

    if (ok) { el.dataset.cvStudio = 'ok'; puestos.push(etiqueta) }
    else anotar(etiqueta, { tipo: 'no se ha podido rellenar' })
  }

  return { puestos, pendientes }
}

// --- el panel ------------------------------------------------------------------
// En un shadow root para que el CSS del portal no lo deforme.
function panel(html) {
  const host = document.getElementById(PANEL_ID) ?? document.body.appendChild(
    Object.assign(document.createElement('div'), { id: PANEL_ID })
  )
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  root.innerHTML = `<style>
    :host { all: initial }
    .p { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 300px;
         font: 13px/1.45 -apple-system, system-ui, sans-serif; color: #24261C;
         background: #FDFBF4; border: 1px solid #DCD6C4; border-radius: 14px;
         box-shadow: 0 8px 28px rgba(0,0,0,.14); padding: 14px 16px }
    b { font-weight: 650 } ul { margin: 6px 0 0; padding-left: 18px; color: #6C6F5C }
    li { margin: 2px 0 } .m { color: #6C6F5C; font-size: 12px; margin-top: 8px }
    .w { color: #8A4A3C } button { position: absolute; top: 10px; right: 12px; border: 0;
         background: none; font-size: 15px; cursor: pointer; color: #8A8C7E }
  </style><div class="p"><button title="Cerrar">×</button>${html}</div>`
  root.querySelector('button').onclick = () => host.remove()
}

// --- arranque -------------------------------------------------------------------
// La página es una SPA: el formulario puede no existir todavía. Se espera a que
// aparezca un campo reconocible, con techo — mejor decir "no he visto formulario"
// que quedarse observando para siempre.
function esperarFormulario(ms = 12000) {
  return new Promise((listo) => {
    const hay = () => controles().some((el) => campoPara(etiquetaDe(el)) !== undefined)
    if (hay()) return listo(true)
    const obs = new MutationObserver(() => { if (hay()) { obs.disconnect(); clearTimeout(t); listo(true) } })
    obs.observe(document.documentElement, { childList: true, subtree: true })
    const t = setTimeout(() => { obs.disconnect(); listo(false) }, ms)
  })
}

async function main() {
  const paquete = await chrome.runtime.sendMessage({ tipo: 'paquete', url: location.href })
  if (!paquete) return // esta pestaña no viene de un "Aplicar"

  if (!(await esperarFormulario())) {
    return panel('<b>CV Studio</b><div class="m">No he encontrado el formulario en esta página. '
      + 'Si hay que darle a «Apply» antes, hazlo y recarga.</div>')
  }

  // Contraseña para las altas de cuenta: se genera aunque no haya campo, y solo
  // se guarda si de verdad se ha usado.
  const password = `Cv-${crypto.randomUUID().slice(0, 12)}!7`
  let { puestos, pendientes } = await rellenar({ ...paquete, password })

  const usoPassword = puestos.some((e) => campoPara(e) === 'password')
  if (usoPassword) {
    const email = paquete.perfil.email
    chrome.runtime.sendMessage({ tipo: 'credencial', host: location.host, email, password })
  }

  // Segunda vuelta: lo que la tabla no supo y el formulario exige se lo
  // preguntamos al modelo, que sí ha leído la oferta y el CV.
  let gaps = []
  if (pendientes.length) {
    panel(`<b>CV Studio</b><div class="m">${puestos.length} campos rellenados. `
      + `Preguntando al modelo por ${pendientes.length}…</div>`)
    const r = await chrome.runtime.sendMessage({ tipo: 'answers', preguntas: pendientes })
    if (r?.respuestas) {
      const segunda = await rellenar({ ...paquete, password }, r.respuestas, puestos)
      puestos = [...puestos, ...segunda.puestos]
      pendientes = segunda.pendientes
      for (const el of controles()) if (!vacio(el)) el.style.outline = ''
    }
    gaps = r?.gaps ?? []
    if (r?.error) gaps = [`no he podido preguntar al modelo: ${r.error}`]
  }

  panel(
    `<b>CV Studio · ${puestos.length} campos rellenados</b>`
    + (paquete.cv ? '<div class="m">CV adaptado adjunto.</div>' : '<div class="m w">Sin PDF: adjúntalo tú.</div>')
    + (pendientes.length
      ? `<div class="m">Faltan ${pendientes.length}, marcados en naranja:</div>`
        + `<ul>${pendientes.slice(0, 6).map((p) => `<li>${p.etiqueta}</li>`).join('')}</ul>`
      : '')
    + (gaps.length ? `<div class="m w">Sin respaldo en tu CV: ${gaps.join(' · ')}.</div>` : '')
    + (usoPassword ? '<div class="m">Cuenta creada con contraseña nueva (está en el popup). '
      + '<b>El correo de verificación lo abres tú.</b></div>' : '')
    + '<div class="m">Revísalo y <b>envía tú</b>: yo no toco ese botón.</div>'
  )
}

main()
