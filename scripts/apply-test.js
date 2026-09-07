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
import { nombrePdf } from '../src/studio/api.js'

const src = readFileSync(new URL('../extension/campos.js', import.meta.url), 'utf8')
const { campoPara, opcionPara, valorPara, normalizar, botonPara, portalCubierto } =
  new Function(`${src}; return { campoPara, opcionPara, valorPara, normalizar, botonPara, portalCubierto }`)()

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

// --- el nombre del PDF que se adjunta --------------------------------------
// Salía siempre igual (tu nombre) porque dependía de un campo que solo se
// rellenaba al pulsar "Guardar variante". Ahora sale de la auditoría.
// Tres piezas: tú, el puesto y el idioma. Es lo que ve el recruiter, porque el
// mismo nombre viaja al portal dentro del paquete de la extensión.
assert.equal(nombrePdf('Senior AI Engineer', 'en'), 'Victor-Trisac_Senior-AI-Engineer_EN.pdf')
assert.equal(nombrePdf('Científico de Datos', 'es'), 'Victor-Trisac_Cientifico-de-Datos_ES.pdf',
  'sin acentos ni eñes: van a un nombre de fichero')
assert.equal(nombrePdf(undefined, 'en'), 'Victor-Trisac_EN.pdf', 'sin auditoría todavía, un nombre válido')
assert.ok(!/[^\w.-]/.test(nombrePdf('C:D*E', 'en')), 'nada que un sistema de ficheros rechace')

// El recorte por el primer separador. Es de donde venía el nombre kilométrico:
// el modelo devuelve el puesto con su coletilla detrás de una coma o un guion
// largo, y antes entraba entera y partida a mitad de palabra.
assert.equal(nombrePdf('Business Intelligence Engineer, Data and Analytics Platform', 'en'),
  'Victor-Trisac_Business-Intelligence-Engineer_EN.pdf', 'la coletilla tras la coma se cae')
assert.equal(nombrePdf('AI Engineer – Agentic Systems & Backend', 'es'),
  'Victor-Trisac_AI-Engineer_ES.pdf', 'el guion largo también corta')
assert.equal(nombrePdf('Software Engineer (Backend)', 'en'),
  'Victor-Trisac_Software-Engineer_EN.pdf', 'y el paréntesis')

// Y donde NO debe cortar, que es la mitad que se rompe sola si el separador se
// escribe a lo bruto.
assert.equal(nombrePdf('Full-Stack Developer', 'es'), 'Victor-Trisac_Full-Stack-Developer_ES.pdf',
  'el guion PEGADO no corta, o el puesto se quedaría en "Full"')
assert.equal(nombrePdf('AI/ML Engineer', 'en'), 'Victor-Trisac_AI-ML-Engineer_EN.pdf',
  'la barra no corta nunca, o se quedaría en "AI"')

// --- los botones ---------------------------------------------------------------
// Lo más peligroso de todo el autorrelleno: una etiqueta mal clasificada aquí
// manda una candidatura a medio rellenar. La regla no es "casi nunca", es NUNCA:
// cualquier cosa que diga enviar se clasifica como enviar aunque también diga
// continuar, y lo que no se reconoce no se pulsa.
const BOTONES = [
  // Los que NUNCA se pulsan
  ['Submit Application', 'enviar'],
  ['Submit', 'enviar'],
  ['Send Application', 'enviar'],
  ['Enviar candidatura', 'enviar'],
  ['Enviar solicitud', 'enviar'],
  ['Finish', 'enviar'],
  ['Continue and submit', 'enviar', 'lleva "continue" pero envía: gana enviar'],
  // Los que abren el formulario, y solo antes de escribir nada
  ['Apply for this job', 'abrir'],
  ['Easy Apply', 'abrir'],
  ['Apply now', 'abrir'],
  ['Apply', 'abrir'],
  ["I'm interested", 'abrir'],
  // Crear la cuenta es su propia clase: se pulsa tanto para abrir el registro
  // como para enviarlo, porque darse de alta no es mandar una candidatura.
  ['Create Account', 'alta'],
  ['Crear cuenta', 'alta'],
  ['Sign up', 'alta'],
  ['Solicitar empleo', 'abrir'],
  // Los que pasan de paso, y solo con el paso resuelto
  ['Next', 'siguiente'],
  ['Continue', 'siguiente'],
  ['Continue to Next Step', 'siguiente'],
  ['Save and Continue', 'siguiente'],
  ['Siguiente', 'siguiente'],
  ['Review', 'siguiente'],
  // Lo que no se reconoce no se toca
  ['Cancel', null],
  ['Back', null],
  ['Guardar borrador', null],
  ['Dismiss', null],
  ['', null],
]
for (const [texto, esperado, msg] of BOTONES) {
  assert.equal(botonPara(texto), esperado, msg ?? `botón "${texto}"`)
}
// Ni una sola etiqueta de campo puede colarse como botón que se pulsa.
for (const [etiqueta] of CASOS) {
  assert.notEqual(botonPara(etiqueta), 'siguiente', `"${etiqueta}" es un campo, no un botón`)
}

// --- portales cubiertos --------------------------------------------------------
// Los patrones salen del manifest de verdad, no de una copia: si alguien añade un
// portal allí y esto no lo ve, el fallo es mudo (pestaña abierta, nada relleno).
const { content_scripts } = JSON.parse(
  readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8')
)
const MATCHES = content_scripts.flatMap((c) => c.matches)

// Un patrón mal formado no degrada nada: Chrome rechaza la extensión ENTERA con
// "Invalid host wildcard" y no carga. Estuvo así desde el primer día
// ("https://cv-victor-trisac-*.vercel.app/*", con el comodín en medio del host) y
// por eso la extensión nunca funcionó en ningún navegador — el fallo no se veía
// hasta que Chrome intentaba cargarla. Diez líneas para que no vuelva a pasar.
for (const m of [...MATCHES, ...JSON.parse(
  readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8')
).host_permissions]) {
  const [, esquema, host] = /^([a-z*]+):\/\/([^/]*)(\/.*)$/.exec(m) ?? []
  assert.ok(esquema, `patrón sin esquema o sin ruta: ${m}`)
  // La única forma legal de comodín en el host es "*." al principio.
  assert.ok(
    host === '*' || !host.slice(2).includes('*') && (host.startsWith('*.') || !host.includes('*')),
    `comodín ilegal en el host de "${m}": Chrome solo admite *.dominio, nunca en medio del nombre`
  )
}

for (const [url, esperado, msg] of [
  ['https://boards.greenhouse.io/typeform/jobs/123', true],
  ['https://job-boards.greenhouse.io/x/jobs/9', true, 'subdominio nuevo de greenhouse'],
  ['https://greenhouse.io/algo', true, '*.dominio cubre también el dominio pelado'],
  ['https://jobs.lever.co/qonto/abc', true],
  ['https://www.linkedin.com/jobs/view/123456789', true],
  ['https://novartis.wd3.myworkdayjobs.com/x/job/y', true],
  ['https://careers.empresa-random.com/apply/7', false, 'portal propio: NO cubierto'],
  ['https://notgreenhouse.io/jobs/1', false, 'no vale con acabar parecido'],
  ['https://remoteok.com/remote-jobs/1', true, 'remoteok: ya inyecta, no solo permiso de host'],
  ['https://www.amazon.jobs/en/jobs/123', true, 'amazon.jobs, 17 ofertas del feed salían sin cubrir'],
  ['https://amazon.jobs/en/jobs/123', true, '*.amazon.jobs cubre el dominio pelado'],
  ['no soy una url', false, 'basura no revienta'],
  ['', false],
]) {
  assert.equal(portalCubierto(url, MATCHES), esperado, msg ?? `portal ${url}`)
}

console.log(`apply-test: ${CASOS.length} etiquetas, ${BOTONES.length} botones, el nombre del PDF y 15 comprobaciones más, todo OK`)
