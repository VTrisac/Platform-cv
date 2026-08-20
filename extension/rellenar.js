// Rellena el formulario de candidatura del portal con el paquete que preparó
// CV Studio. Corre en TU navegador y en TU sesión: es la única forma de tocar
// un formulario de otro dominio, porque una web no puede hacerlo.
//
// NO PULSA ENVIAR. Nunca. Deja el formulario listo y un panel con lo que ha
// hecho; confirmar es tuyo.
//
// Sí recorre formularios de varios pasos y altas de cuenta, que es lo que hace
// falta en Workday, SmartRecruiters y el Easy Apply de LinkedIn. Las reglas de
// cuándo se pulsa un botón son tres y no tienen excepciones:
//   - un botón de ENVIAR no se pulsa jamás (la lista está en campos.js);
//   - uno de ABRIR solo antes de haber escrito nada;
//   - uno de SIGUIENTE solo con el paso relleno y CERO campos obligatorios
//     pendientes. Si queda uno naranja, se para y te espera.

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

  // El hueco del CV suele estar OCULTO detrás de un botón con estilo, así que
  // controles() —que exige que se vea— no lo encuentra nunca. Un input de fichero
  // escondido sí se puede rellenar: lo que no se puede es abrir el diálogo del
  // sistema, y para esto no hace falta.
  let cvAdjunto = puestos.some((e) => campoPara(e) === 'cv')
  if (!cvAdjunto && cv) {
    const libres = [...document.querySelectorAll('input[type="file"]')]
      .filter((el) => !el.disabled && el.files.length === 0)
    // El que se llama como un CV; si solo hay uno, es ese. Con varios sin nombre
    // reconocible no se adivina: colar el PDF en el hueco de la carta es peor que
    // dejarlo vacío y decirlo.
    const hueco = libres.find((el) => campoPara(`${el.name ?? ''} ${el.id ?? ''}`) === 'cv')
      ?? (libres.length === 1 ? libres[0] : null)
    if (hueco && adjuntar(hueco, cv)) {
      cvAdjunto = true
      puestos.push('CV (hueco oculto)')
    }
  }

  return { puestos, pendientes, cvAdjunto }
}

// --- el panel ------------------------------------------------------------------
// Lo que se pinta viene del portal —el texto de sus botones, sus etiquetas— y
// entra por innerHTML. Es su página y ya puede meter en ella lo que quiera, pero
// no a través de nosotros.
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

// En un shadow root para que el CSS del portal no lo deforme.
function panel(html, trabajando = false) {
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
    /* Rellenar un formulario largo son varios segundos y una llamada al modelo:
       sin esto el panel parecía colgado. Mismo raíl que la app. */
    .r { height: 3px; border-radius: 3px; background: #E9E3D2; overflow: hidden;
         margin-top: 10px; position: relative }
    .r::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 30%;
         border-radius: 3px; background: #5F7A56;
         animation: cvs 1.4s cubic-bezier(.4,0,.2,1) infinite }
    @keyframes cvs { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }
    @media (prefers-reduced-motion: reduce) {
      .r::after { animation: none; width: 100% }
    }
  </style><div class="p"><button title="Cerrar">×</button>${html}${trabajando ? '<div class="r"></div>' : ''}</div>`
  root.querySelector('button').onclick = () => host.remove()
}

// --- los botones ---------------------------------------------------------------
// El texto visible de un botón, que es lo único que significa lo mismo en
// Greenhouse, en Workday y en LinkedIn. La clasificación está en campos.js.
const textoBoton = (el) =>
  (el.tagName === 'INPUT' ? el.value : texto(el)) || el.getAttribute('aria-label') || ''

const botones = () =>
  [...document.querySelectorAll('button,input[type="submit"],input[type="button"],[role="button"],a')]
    .filter((el) => !el.disabled && el.offsetParent !== null)

// Pulsa el primer botón de alguna de las clases pedidas y devuelve su texto, o
// null si no hay ninguno. 'enviar' no se acepta aquí a propósito: esa lista
// existe para reconocer ese botón y NO tocarlo.
function pulsar(clases) {
  if (clases.includes('enviar')) throw new Error('el botón de enviar no se pulsa')
  for (const el of botones()) {
    const t = textoBoton(el)
    if (clases.includes(botonPara(t))) { el.click(); return t.trim() }
  }
  return null
}

// --- arranque -------------------------------------------------------------------
// La página es una SPA: ni el formulario ni el paso siguiente existen todavía
// cuando esto corre. Una sola primitiva de espera con techo — mejor decir "no lo
// he visto" que quedarse observando para siempre.
function esperarA(prueba, ms) {
  return new Promise((listo) => {
    if (prueba()) return listo(true)
    const obs = new MutationObserver(() => { if (prueba()) { obs.disconnect(); clearTimeout(t); listo(true) } })
    obs.observe(document.documentElement, { childList: true, subtree: true })
    const t = setTimeout(() => { obs.disconnect(); listo(false) }, ms)
  })
}

const hayFormulario = () => controles().some((el) => campoPara(etiquetaDe(el)) !== undefined)

// Un formulario servido ya montado y luego HIDRATADO por React —Greenhouse hace
// justo eso— se reescribe entero unos segundos después de cargar. Si rellenas
// antes, React descarta tus valores al hidratar y el panel acaba diciendo "9
// campos rellenados" sobre un formulario en blanco.
//
// Medido contra una oferta real de Greenhouse: 9 puestos, 0 con valor al mirar
// después, y la consola del portal escupiendo "React recovered from an error
// during hydration". No se puede detectar la hidratación desde fuera, pero sí que
// el DOM deje de moverse, que es la misma señal y no depende del framework.
function esperarQuietud(quieto = 1200, techo = 8000) {
  return new Promise((listo) => {
    let reloj
    let limite
    const fin = () => { obs.disconnect(); clearTimeout(reloj); clearTimeout(limite); listo() }
    const obs = new MutationObserver(() => { clearTimeout(reloj); reloj = setTimeout(fin, quieto) })
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    reloj = setTimeout(fin, quieto)
    limite = setTimeout(fin, techo) // un portal que nunca para (un carrusel) no bloquea
  })
}

// Después de pulsar "siguiente": un campo NUEVO, sin rellenar y reconocible. Si no
// aparece ninguno, o esto era el final o es una pantalla que no entendemos; en los
// dos casos lo que toca es parar, no seguir pulsando.
const hayPasoNuevo = () => controles().some((el) =>
  el.dataset.cvStudio !== 'ok' && vacio(el) && campoPara(etiquetaDe(el)) !== undefined)

const MAX_PASOS = 6

// Una vuelta completa sobre el paso que hay EN PANTALLA: la tabla primero, y lo
// que la tabla no supo y el formulario exige, al modelo — que sí ha leído la
// oferta y el CV.
async function vuelta(paquete) {
  let { puestos, pendientes, cvAdjunto } = await rellenar(paquete)
  let gaps = []

  if (pendientes.length) {
    panel(`<b>CV Studio</b><div class="m">${puestos.length} campos rellenados. `
      + `Preguntando al modelo por ${pendientes.length}…</div>`, true)
    const r = await chrome.runtime.sendMessage({ tipo: 'answers', preguntas: pendientes })
    if (r?.respuestas) {
      const segunda = await rellenar(paquete, r.respuestas, puestos)
      puestos = [...puestos, ...segunda.puestos]
      pendientes = segunda.pendientes
      cvAdjunto = cvAdjunto || segunda.cvAdjunto
      for (const el of controles()) if (!vacio(el)) el.style.outline = ''
    }
    gaps = r?.gaps ?? []
    if (r?.error) gaps = [`no he podido preguntar al modelo: ${r.error}`]
  }

  return { puestos, pendientes, gaps, cvAdjunto }
}

async function main() {
  const paquete = await chrome.runtime.sendMessage({ tipo: 'paquete', url: location.href })
  if (!paquete) return // esta pestaña no viene de un "Aplicar"

  // El formulario puede estar detrás de un botón: Greenhouse esconde el suyo tras
  // "Apply for this job" y en LinkedIn el Easy Apply es un modal que no existe
  // hasta pulsarlo. Se pulsa AQUÍ y solo aquí, con la página todavía sin tocar:
  // si eso resultara ser el envío de un formulario vacío, no hay nada que enviar.
  let hay = await esperarA(hayFormulario, 6000)
  if (!hay) {
    const abierto = pulsar(['abrir', 'alta'])
    if (abierto) {
      panel(`<b>CV Studio</b><div class="m">He pulsado «${esc(abierto)}». Esperando el formulario…</div>`, true)
      hay = await esperarA(hayFormulario, 12000)
    }
  }
  if (!hay) {
    return panel('<b>CV Studio</b><div class="m">No he encontrado el formulario en esta página. '
      + 'Si hay que darle a «Apply» antes, hazlo y recarga.</div>')
  }

  // El formulario existe, pero puede que todavía no sea el definitivo.
  panel('<b>CV Studio</b><div class="m">Esperando a que el formulario acabe de cargar…</div>', true)
  await esperarQuietud()

  let puestos = []
  let pendientes = []
  let gaps = []
  let usoPassword = false
  let cvAdjunto = false
  let ultimo = null // el botón de "siguiente" que se pulsó, para poder contarlo

  // Un formulario largo o un alta son varias pantallas. El techo y el contador
  // viven en la sesión de la pestaña (sw.js) porque un alta de verdad NAVEGA: esta
  // página muere y el content script arranca de cero en la siguiente.
  while (true) {
    const r = await vuelta(paquete)
    puestos = [...puestos, ...r.puestos]
    pendientes = r.pendientes
    gaps = r.gaps
    cvAdjunto = cvAdjunto || r.cvAdjunto

    // La contraseña es la del paquete, la misma en toda la pestaña: es lo que
    // permite que "Password" y "Verify Password" —en la misma pantalla o en dos
    // distintas— reciban lo mismo y el alta llegue a completarse.
    if (r.puestos.some((e) => campoPara(e) === 'password')) {
      usoPassword = true
      chrome.runtime.sendMessage({
        tipo: 'credencial', host: location.host, email: paquete.perfil.email, password: paquete.password,
      })
    }

    // Queda algo obligatorio sin resolver: se para. Avanzar dejaría un campo en
    // naranja detrás y no lo verías hasta el final.
    if (pendientes.length) break
    // Un paso que no ha rellenado nada es una pantalla que no entendemos, o una de
    // revisión. No se pulsa a ciegas.
    if (!r.puestos.length) break

    const { paso } = await chrome.runtime.sendMessage({ tipo: 'paso' })
    if (paso >= MAX_PASOS) break

    panel(`<b>CV Studio · paso ${paso}</b><div class="m">${puestos.length} campos rellenados. `
      + 'Pasando al siguiente…</div>', true)
    // Sin pisar el anterior si esta vuelta no encuentra botón: el panel dice por
    // dónde ha pasado, y un null al final borraba el único paso que sí se dio.
    const siguiente = pulsar(['siguiente', 'alta'])
    if (!siguiente) break // no hay siguiente: o es el final, o el botón es de enviar
    ultimo = siguiente
    // Si el paso navega, esto no vuelve: el content script arranca solo en la
    // página nueva y sigue por donde iba. Si es una SPA, seguimos aquí.
    if (!(await esperarA(hayPasoNuevo, 4000))) break
  }

  // Sin hueco donde soltar el PDF, al menos se señala dónde está el botón de
  // subir: es lo único que queda por hacer a mano.
  if (!cvAdjunto && paquete.cv) {
    const zona = document.querySelector('[class*="file-upload"],[class*="upload"],[class*="attach"],input[type="file"]')
    if (zona) {
      zona.style.outline = '2px solid #C08A2E'
      zona.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }
  }

  panel(
    `<b>CV Studio · ${puestos.length} campos rellenados</b>`
    // Decía "CV adaptado adjunto" siempre que el paquete traía un PDF, se hubiera
    // adjuntado o no. Medido contra una oferta real de Greenhouse: el panel lo
    // afirmaba con CERO campos de fichero en la página. Es la mentira más cara de
    // todas — la que te hace enviar una candidatura sin CV.
    + (cvAdjunto
      ? '<div class="m">CV adaptado adjunto.</div>'
      : `<div class="m w">${paquete.cv
        ? 'El CV NO se ha podido adjuntar: este portal abre el selector de ficheros al pulsar (marcado en naranja). Adjúntalo tú.'
        : 'Sin PDF: adjúntalo tú.'}</div>`)
    + (ultimo ? `<div class="m">He pasado por «${esc(ultimo)}».</div>` : '')
    + (pendientes.length
      ? `<div class="m">Faltan ${pendientes.length}, marcados en naranja:</div>`
        + `<ul>${pendientes.slice(0, 6).map((p) => `<li>${esc(p.etiqueta)}</li>`).join('')}</ul>`
      : '')
    + (gaps.length ? `<div class="m w">Sin respaldo en tu CV: ${esc(gaps.join(' · '))}.</div>` : '')
    + (usoPassword ? '<div class="m">Cuenta creada con contraseña nueva (está en el popup). '
      + '<b>El correo de verificación lo abres tú.</b></div>' : '')
    + '<div class="m">Revísalo y <b>envía tú</b>: yo no toco ese botón.</div>'
  )
}

main()
