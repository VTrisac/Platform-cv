// Restablece la contraseña de la app. Sin base de datos, "restablecer" es
// generar un hash nuevo y cambiar la variable de entorno.
//
//   npm run set-password
//
// Lee la contraseña por stdin (nunca por argv, para que no quede en el
// historial del shell) e imprime el hash `salt:derivado`. Cópialo a:
//   - .env.local          -> TAILOR_PASSWORD_HASH=...
//   - panel de Vercel      -> misma variable, entorno Production
// y luego borra TAILOR_PASSWORD en claro. El valor real nunca se guarda: del
// hash no se puede recuperar (por eso no se puede "leer" una contraseña).
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { strict as a } from 'node:assert'
import { createInterface } from 'node:readline'

const LEN = 64 // bytes del derivado

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(String(password), salt, LEN).toString('hex')}`
}

export function verify(password, stored) {
  const [salt, hex] = String(stored).split(':')
  if (!salt || !hex) return false
  const esperado = Buffer.from(hex, 'hex')
  const recibido = scryptSync(String(password), salt, esperado.length)
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
}

// El check que exige ponytail: el hash debe validar SU contraseña y ninguna otra.
function selftest() {
  const h = hashPassword('correcto horse battery')
  a.ok(verify('correcto horse battery', h), 'la contraseña buena valida')
  a.ok(!verify('otra cosa', h), 'una distinta no')
  a.ok(hashPassword('x') !== hashPassword('x'), 'salt aleatorio: dos hashes distintos')
  a.ok(!verify('x', 'sinseparador'), 'un hash con formato roto no valida, no revienta')
  console.log('ok — hash/verify')
}

// Solo al ejecutarlo directo: importado (para hashPassword/verify) no debe
// lanzar el prompt ni abrir stdin. Mismo guardo que scripts/feed.js.
const esMain = import.meta.filename === process.argv[1]

if (esMain && process.argv.includes('--selftest')) {
  selftest()
} else if (esMain) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false })
  process.stdout.write('Nueva contraseña (se leerá de stdin y no se mostrará el hash de vuelta en claro):\n')
  rl.on('line', (linea) => {
    const pw = linea.trim()
    if (!pw) { console.error('Vacía: nada que hacer.'); process.exit(1) }
    console.log('\nTAILOR_PASSWORD_HASH=' + hashPassword(pw))
    console.log('\nPégalo en .env.local y en Vercel (Production). Luego borra TAILOR_PASSWORD.')
    rl.close()
  })
}
