// Service worker: guarda el paquete que manda CV Studio, abre la pestaña del
// portal y se lo sirve al content script que rellena.
//
// También es quien llama a /api/answers. No puede hacerlo el content script:
// corre bajo la CSP del portal y esa petición se la comería. El worker no tiene
// CSP de página y sí tiene host_permissions.

// portalCubierto() vive en campos.js, que es lógica pura y ya la carga el content
// script. Aquí se trae con importScripts para no tener dos copias de la regla.
importScripts('campos.js')

// Por pestaña, no por URL: al aplicar en LinkedIn te redirige a la web de la
// empresa, y la URL con la que abrimos deja de valer a los dos segundos.
const clave = (tabId) => `paquete:${tabId}`

async function aplicar(paquete) {
  // Antes de abrir nada: si el content script no se va a inyectar ahí, abrir la
  // pestaña es un fallo mudo — se queda el formulario en blanco y parece que la
  // extensión no hace nada.
  const matches = chrome.runtime.getManifest().content_scripts.flatMap((c) => c.matches)
  if (!portalCubierto(paquete.url, matches)) {
    const host = (() => { try { return new URL(paquete.url).hostname } catch { return paquete.url } })()
    return {
      error: `«${host}» no está en la lista de portales de la extensión, así que el formulario `
        + 'no se rellenaría y no lo verías. Añádelo a host_permissions y content_scripts en '
        + 'extension/manifest.json, o inscríbete a mano en esta.',
    }
  }

  const tab = await chrome.tabs.create({ url: paquete.url, active: true })
  // La contraseña se genera AQUÍ, una vez por pestaña, y viaja en el paquete.
  // Antes la generaba el content script: como se reinyecta en CADA navegación, un
  // alta de dos pantallas escribía una contraseña distinta en cada una y la
  // bóveda guardaba la que no era. El alta nunca llegaba a completarse.
  await chrome.storage.session.set({
    [clave(tab.id)]: { ...paquete, password: `Cv-${crypto.randomUUID().slice(0, 12)}!7`, paso: 0 },
  })
  return { tabId: tab.id }
}

async function answers(paquete, preguntas) {
  const res = await fetch(`${paquete.origin}/api/answers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tailor-key': paquete.key ?? '' },
    body: JSON.stringify({
      preguntas, text: paquete.oferta?.texto, lang: paquete.lang, carta: paquete.carta,
      perfil: paquete.perfil,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

async function guardarCredencial({ host, email, password }) {
  const { boveda = [] } = await chrome.storage.local.get('boveda')
  // Una por sitio: si vuelves a darte de alta, manda la nueva.
  const resto = boveda.filter((c) => c.host !== host)
  await chrome.storage.local.set({
    boveda: [{ host, email, password, fecha: new Date().toISOString().slice(0, 10) }, ...resto],
  })
}

chrome.runtime.onMessage.addListener((msg, sender, responder) => {
  // Todo async: hay que devolver true para que el canal siga abierto.
  ;(async () => {
    try {
      if (msg.tipo === 'ping') return responder({ ok: true })
      if (msg.tipo === 'aplicar') return responder(await aplicar(msg.paquete))

      const id = sender.tab?.id
      const paquete = id == null ? null : (await chrome.storage.session.get(clave(id)))[clave(id)]

      if (msg.tipo === 'paquete') return responder(paquete ?? null)
      if (msg.tipo === 'credencial') { await guardarCredencial(msg); return responder({ ok: true }) }
      // El contador de pasos de un formulario largo. Vive aquí y no en la página
      // porque un alta de verdad NAVEGA: el content script se reinyecta desde cero
      // y perdería la cuenta, así que un formulario que se repite a sí mismo te
      // dejaría dando vueltas para siempre.
      if (msg.tipo === 'paso') {
        if (!paquete) return responder({ paso: Infinity })
        paquete.paso = (paquete.paso ?? 0) + 1
        await chrome.storage.session.set({ [clave(id)]: paquete })
        return responder({ paso: paquete.paso })
      }
      if (msg.tipo === 'answers') {
        if (!paquete) return responder({ error: 'sin paquete' })
        return responder(await answers(paquete, msg.preguntas))
      }
      responder({ error: `mensaje desconocido: ${msg.tipo}` })
    } catch (e) {
      responder({ error: e.message })
    }
  })()
  return true
})

// El paquete lleva tu CV y tu contraseña de la app: no tiene por qué sobrevivir
// a la pestaña.
chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(clave(tabId)))
