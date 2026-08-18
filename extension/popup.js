// La bóveda: las contraseñas que la extensión generó al darte de alta en un
// portal. Sin cifrar a propósito — chrome.storage.local ya está bajo tu perfil
// de Chrome, y cifrarlo con una clave que también estaría aquí no añade nada.
chrome.storage.local.get('boveda').then(({ boveda = [] }) => {
  const ul = document.getElementById('boveda')
  if (!boveda.length) {
    ul.innerHTML = '<li class="e">Ninguna todavía.</li>'
    return
  }
  for (const c of boveda) {
    const li = document.createElement('li')
    const info = document.createElement('div')
    info.innerHTML = `<div class="h"></div><div class="e"></div>`
    info.firstChild.textContent = c.host
    info.lastChild.textContent = `${c.email} · ${c.fecha}`
    const btn = document.createElement('button')
    btn.textContent = 'Copiar'
    btn.onclick = () => {
      navigator.clipboard.writeText(c.password)
      btn.textContent = 'Copiada'
    }
    li.append(info, btn)
    ul.append(li)
  }
})
