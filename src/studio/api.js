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
  const json = await res.json()
  if (res.status === 401) {
    const asked = window.prompt('Contraseña de la app:')
    if (!asked) throw new Error('Hace falta la contraseña.')
    localStorage.setItem('tailorKey', asked)
    return apiPost(path, body, asked)
  }
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

// Una URL suelta se scrapea; cualquier otra cosa es el texto de la oferta.
export const auditar = (entrada, lang) =>
  apiPost('/api/audit', { [/^https?:\/\//i.test(entrada.trim()) ? 'url' : 'text']: entrada.trim(), lang })

// Sin preset, el servidor usa los valores de siempre.
export const buscarFeed = (preset) => apiPost('/api/feed', preset ?? {})
