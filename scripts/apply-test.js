// Comprobación de la tabla que traduce etiquetas de formulario a datos tuyos.
// Es la única lógica no trivial del autorrelleno: si se rompe, la extensión
// escribe tu email en "Current company" y no te enteras hasta que lo has
// enviado.
//
// Las etiquetas son REALES, copiadas de los formularios de Greenhouse, Lever,
// Ashby, Workable y Workday. Sin framework y sin DOM: campos.js es lógica pura
// y aquí se evalúa con new Function, que es lo que evita tener que meter un
// paso de compilación para compartir un fichero entre el content script y node.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const src = readFileSync(new URL('../extension/campos.js', import.meta.url), 'utf8')
const { campoPara, opcionPara, valorPara, normalizar } =
  new Function(`${src}; return { campoPara, opcionPara, valorPara, normalizar }`)()

const CASOS = [
  // Greenhouse
  ['First Name *', 'nombre'],
  ['Last Name *', 'apellidos'],
  ['Email *', 'email'],
  ['Phone', 'telefono'],
  ['Resume/CV *', 'cv'],
  ['Cover Letter', 'carta'],
  ['LinkedIn Profile', 'linkedin'],
  ['Website', 'web'],
  ['How did you hear about this job?', 'fuente'],
  ['Gender', 'eeo'],
  ['Veteran Status', 'eeo'],
  ['Disability Status', 'eeo'],
  // Lever
  ['Full name✱', 'nombreCompleto'],
  ['Current company', null],
  ['GitHub URL', 'github'],
  ['Portfolio URL', 'web'],
  ['Twitter URL', null],
  // Ashby
  ['Name', 'nombreCompleto'],
  ['Are you legally authorized to work in Spain?', 'autorizado'],
  ['Will you now or in the future require sponsorship for employment visa status?', 'necesitaVisado'],
  // Workable
  ['Address', 'ubicacion'],
  ['Where are you based? *', 'ubicacion'],
  ['Cover letter (optional)', 'carta'],
  ['Are you legally eligible to work in Spain?', 'autorizado'],
  // Workday (alta de cuenta)
  ['Email Address', 'email'],
  ['Password', 'password'],
  ['Verify New Password', 'password'],
  ['Country Phone Code', null],
  ['How Did You Hear About Us?', 'fuente'],
  // Español
  ['Teléfono móvil', 'telefono'],
  ['Ciudad de residencia', 'ubicacion'],
  ['Carta de presentación', 'carta'],
  ['Pretensiones salariales', 'salarioObjetivo'],
  ['¿Necesitas permiso de trabajo?', 'necesitaVisado'],
  ['Curriculum Vitae', 'cv'],
  // El país va aparte de la ciudad: los desplegables de países son en inglés y
  // "Barcelona, España" no casa con ninguna opción.
  ['Country', 'pais'],
  ['Country of residence', 'pais'],
  // El orden de la tabla ES la lógica. Esta lleva "country" dentro y es de
  // sí/no: si la regla de ubicación va antes, responde "Barcelona" a esto.
  // Pasó de verdad, en el formulario de Typeform, el 18-08-2026.
  ['Are you legally authorized to work in the country for which you are applying?', 'autorizado'],
  // El botón de subir el CV en Greenhouse se llama "Attach" en los dos huecos;
  // solo el id distingue el CV de la carta.
  ['resume', 'cv'],
  ['cover_letter', 'carta'],
  // Lo que NO debe casar con nada conocido: se queda en blanco o va al modelo.
  ['Company name', null],
  ['Reference number', null],
  ['Referred by', null],
  ['Emergency contact', null],
  // Anclado a propósito: los años TOTALES sí, los de una tecnología concreta no
  // —esos los responde /api/answers, que ha leído el CV—.
  ['Years of experience', 'aniosExperiencia'],
  ['Años de experiencia', 'aniosExperiencia'],
  ['Years of experience with Kubernetes', undefined],
  ['How many years have you worked with Ruby?', undefined],
  ['Describe a project you are proud of', undefined],
]

let fallos = 0
for (const [etiqueta, esperado] of CASOS) {
  const dado = campoPara(etiqueta)
  if (dado !== esperado) {
    console.error(`  ✗ "${etiqueta}" -> ${String(dado)} (esperaba ${String(esperado)})`)
    fallos++
  }
}
assert.equal(fallos, 0, `${fallos} etiquetas mal clasificadas`)

// Normalización: tildes, asteriscos y espacios de más.
assert.equal(normalizar('  ¿Teléfono   Móvil? * '), 'telefono movil')
assert.equal(normalizar('First Name (required)'), 'first name')

// Sí/no en las palabras del propio desplegable, no en las nuestras.
assert.equal(opcionPara(true, ['Yes', 'No']), 'Yes')
assert.equal(opcionPara(false, ['Sí', 'No']), 'No')
assert.equal(opcionPara('decline', ['Male', 'Female', "I don't wish to answer"]), "I don't wish to answer")
assert.equal(opcionPara('decline', ['Yes', 'No', 'Decline to self-identify']), 'Decline to self-identify')
assert.equal(opcionPara('LinkedIn', ['Job board', 'LinkedIn', 'A friend']), 'LinkedIn')
assert.equal(opcionPara(true, ['Maybe', 'Later']), null, 'sin opción que case, no se elige ninguna')

// El valor de cada clave. undefined y '' NO son lo mismo: sin dato no se toca
// el campo, y ese es justo el caso de "prefiero rellenarlo yo".
const perfil = {
  nombre: 'Víctor', apellidos: 'Trisac', email: 'v@example.com',
  autorizado: true, necesitaVisado: false, salarioObjetivo: '', eeo: 'decline',
}
assert.equal(valorPara('nombreCompleto', { perfil }), 'Víctor Trisac')
assert.equal(valorPara('pais', { perfil: { ...perfil, pais: 'Spain' } }), 'Spain')
assert.equal(valorPara('autorizado', { perfil }), true)
assert.equal(valorPara('necesitaVisado', { perfil }), false)
assert.equal(valorPara('salarioObjetivo', { perfil }), undefined)
assert.equal(valorPara('carta', { perfil }), undefined)
assert.equal(valorPara('carta', { perfil, carta: 'Estimados…' }), 'Estimados…')
assert.equal(valorPara('cv', { perfil }), undefined, 'el CV se adjunta, no se escribe')
assert.equal(valorPara('password', { perfil, password: 'x' }), 'x')

console.log(`apply-test: ${CASOS.length} etiquetas y 15 comprobaciones más, todo OK`)
