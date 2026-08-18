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

// Manda el HTML del CV ya renderizado a que Chromium lo imprima limpio, y
// dispara la descarga. No usa apiPost porque la respuesta es un PDF binario,
// no JSON, pero repite el mismo baile del 401.
export async function descargarPdf({ html, styles, css, filename }, retryKey) {
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
    return descargarPdf({ html, styles, css, filename }, asked)
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`)

  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  // Colgado del documento y revocado después: un <a> suelto no dispara la
  // descarga fuera de Chrome, y revocar en la misma vuelta la aborta.
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
