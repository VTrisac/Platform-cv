// La puerta de casa: quién puede llamar a los endpoints, y a qué proveedores de
// modelo se puede hablar.
//
// Vive fuera de api/ a propósito, igual que src/data.js. Antes estaba en
// api/tailor.js, que importa el SDK de OpenAI en su primera línea: /api/feed y
// /api/pdf, que no hablan con ningún modelo, cargaban el SDK entero solo para
// poder pedir una contraseña.
import { scryptSync, timingSafeEqual } from 'node:crypto'

const BASE_URL = 'https://integrate.api.nvidia.com/v1'

// --- las dos vías al modelo -------------------------------------------------
// NIM es gratis, pero su latencia es salvaje y no avisa: medido el 03-09-2026
// con la misma auditoría, kimi-k3 tardó 150,7 s y el PRIMER token llegó 14 ms
// antes que el último —no emite nada mientras trabaja, así que ni el streaming
// ni un "va por la mitad" son posibles—. Los cuatro modelos lanzados a la vez:
// gpt-oss-120b 166 s · deepseek-v4-flash 198 s · kimi-k3 203 s · minimax-m3
// >240 s. NINGUNO bajó de 166 s: va lento el servicio, no un modelo, y por eso
// tampoco sirve correr varios a la vez. Con el timeout de 130 s que había aquí,
// toda llamada fallaba, y maxRetries la repetía contra el mismo sitio saturado:
// 260 s de espera para leer "el modelo no ha respondido a tiempo".
//
// El gateway de Vercel habla el protocolo de OpenAI, así que es este mismo SDK
// con otra baseURL. Va primero porque enruta al proveedor más rápido de los
// varios que sirven el mismo modelo abierto (providerOptions.gateway.sort) y
// cae solo al siguiente modelo si el suyo falla (gateway.models).
const VIAS = [
  { nombre: 'gateway', env: 'AI_GATEWAY_API_KEY', baseURL: 'https://ai-gateway.vercel.sh/v1', techo: 90000 },
  { nombre: 'nim', env: 'NVIDIA_API_KEY', baseURL: BASE_URL, techo: Infinity },
]

// Las que tienen clave, en orden. Si solo hay una, se lleva el presupuesto entero.
export const vias = (entorno = process.env) => VIAS.filter((v) => entorno[v.env])


// Verifica una contraseña contra un hash `salt:derivado` (hex) de scrypt, en
// tiempo constante. scrypt es stdlib: ni bcrypt ni ninguna dependencia. El
// mismo formato que genera scripts/set-password.js.
export function verifyPassword(password, stored) {
  const [salt, hex] = String(stored).split(':')
  if (!salt || !hex) return false
  const esperado = Buffer.from(hex, 'hex')
  const recibido = scryptSync(String(password), salt, esperado.length)
  // Longitudes distintas harían petar timingSafeEqual: se descarta antes.
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
}


// Puerta compartida por /api/tailor, /api/audit, /api/feed y /api/cover. Devuelve
// null si todo va bien, o el error ya enviado; el llamante solo hace return.
//
// La URL de Vercel es pública y cada llamada gasta créditos de tu cuenta.
// ponytail: un secreto compartido, no OAuth. Un solo usuario, un solo secreto.
// En producción se exige SIEMPRE: si falta el secreto, no se atiende a nadie
// (fallar cerrado). En local es opcional para poder probar sin fricción.
//
// El secreto se guarda hasheado en TAILOR_PASSWORD_HASH; TAILOR_PASSWORD en
// claro sigue valiendo como camino de compatibilidad, para que un despliegue no
// te deje fuera mientras migras. Pon el hash, comprueba, y borra la clave clara.
//
// needsKey=false para los endpoints que no llaman al modelo (/api/feed): la
// contraseña se sigue exigiendo igual, pero faltar la clave de NVIDIA no es
// motivo para negarles servicio.
export function gate(req, res, needsKey = true) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' })

  const hash = process.env.TAILOR_PASSWORD_HASH
  const claro = process.env.TAILOR_PASSWORD
  if (process.env.VERCEL || hash || claro) {
    if (!hash && !claro) {
      return res.status(500).json({ error: 'Falta TAILOR_PASSWORD_HASH en el entorno: el endpoint queda cerrado.' })
    }
    const enviada = req.headers['x-tailor-key'] ?? ''
    const ok = hash ? verifyPassword(enviada, hash) : enviada === claro
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta.' })
  }

  // Basta con UNA vía al modelo: el gateway de Vercel o NVIDIA. Antes se exigía
  // NVIDIA y solo NVIDIA, que era justo lo que dejaba la app a merced de un
  // proveedor.
  if (needsKey && !vias().length) {
    return res.status(500).json({
      error: 'No hay vía al modelo. Pon AI_GATEWAY_API_KEY (recomendada) o NVIDIA_API_KEY. '
        + 'En local: en .env.local. Desplegado: vercel env add AI_GATEWAY_API_KEY.',
    })
  }
  return null
}

