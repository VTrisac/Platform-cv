// Puente entre la web de CV Studio y la extensión.
//
// Por qué esto y no `externally_connectable`: una extensión sin empaquetar
// cambia de ID cada vez que la recargas, y la app tendría que llevar ese ID a
// pelo en el código. Un content script en el propio origen de CV Studio no
// necesita saber nada: la página habla con postMessage y esto reenvía.
//
// El content script vive en un mundo aislado, así que una variable global NO la
// ve la página. El DOM sí es compartido: por eso la señal de "extensión
// instalada" es un atributo, no un window.algo.
document.documentElement.dataset.cvStudio = '1'

window.addEventListener('message', async (e) => {
  if (e.source !== window || e.data?.para !== 'cv-studio-ext') return
  let respuesta
  try {
    respuesta = await chrome.runtime.sendMessage(e.data.mensaje)
  } catch (err) {
    // Pasa al recargar la extensión con la pestaña abierta: el puente sigue
    // inyectado pero al otro lado ya no hay nadie.
    respuesta = { error: `La extensión se ha recargado, refresca la página. (${err.message})` }
  }
  window.postMessage({ para: 'cv-studio-app', id: e.data.id, respuesta }, location.origin)
})
