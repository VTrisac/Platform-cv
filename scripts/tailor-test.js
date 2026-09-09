// Comprueba que applyPatch no deja pasar nada inventado, aunque el modelo lo
// intente. Es el test que importa: el "no inventes" del prompt es una petición,
// esto es la garantía.
//
//   node scripts/tailor-test.js
import { strict as a } from 'node:assert'
import handler, { applyPatch, findInventions, brief, resumenCV,
  reparto, pedirJSON, PRESUPUESTO } from '../api/tailor.js'
import { strip, jobPosting } from '../src/scrape.js'
import { vias, verifyPassword } from '../src/acceso.js'
import { puntuar, recomendar, limpiarVeredicto, normalizar, pedirSalario } from '../api/audit.js'
import { rangoSalarial } from '../api/feed.js'
import feed from '../api/feed.js'
import { findFigures, textoCarta } from '../api/cover.js'
import { partir, enLote, preparar } from '../src/studio/lote.js'
import { agrupar, contar, SUCESOS, salarios, mediana, SIGUIENTE, ESTADOS, aplicarPatch,
  desdeCuando, diasDesde, migrar, hoy, porQueDescartada, clavesDe, indexar,
  desdeFeed } from '../src/studio/store.js'
import { hashPassword } from './set-password.js'
import { dataEN } from '../src/data.js'

// Canarios: tech que NO está en tu CV. NO uses una real (Kubernetes, Go, Rust…):
// el día que esa tech entra de verdad en data.js el test se cae solo sin que nada
// esté roto. Pasó con Kubernetes en 645e356. El assert de abajo avisa el día que
// alguno deje de ser mentira.
const [FANTASMA, FANTASMA2, FANTASMA_SKILL] = ['Fortran-77', 'COBOL', 'Prolog']
for (const f of [FANTASMA, FANTASMA2, FANTASMA_SKILL]) {
  a.ok(!JSON.stringify(dataEN).includes(f), `el canario ${f} ya no está ausente del CV: elige otro`)
}

// Un parche hostil: cambia empresas y fechas, añade stack que no tiene,
// inventa un puesto extra y mete 5 logros donde caben 3.
const evil = {
  title: 'Principal Engineer',
  profile: 'Perfil reescrito.',
  experience: dataEN.experience.map((e, i) => ({
    description: `desc ${i}`,
    achievements: ['a', 'b', 'c', 'd', 'e'],
    tech: i === 0 ? [FANTASMA, FANTASMA2, 'Python'] : e.tech,
  })),
  skills: { backend: [FANTASMA_SKILL, 'Python'], frontend: [], ai_devops: [], databases: [] },
  role: 'x', company: 'y', gaps: [],
}

const { data, dropped } = applyPatch(dataEN, evil)

a.equal(data.experience.length, dataEN.experience.length, 'no se añaden ni quitan puestos')
for (const [i, e] of data.experience.entries()) {
  a.equal(e.project, dataEN.experience[i].project, 'la empresa es intocable')
  a.equal(e.dates, dataEN.experience[i].dates, 'las fechas son intocables')
  a.equal(e.role, dataEN.experience[i].role, 'el puesto es intocable')
  a.ok(e.achievements.length <= 3, 'máximo 3 logros por puesto')
  for (const t of e.tech) a.ok(dataEN.experience[i].tech.includes(t), `tech inventada: ${t}`)
}
a.ok(dropped.includes(FANTASMA) && dropped.includes(FANTASMA2), 'la tech inventada se reporta')
a.ok(!JSON.stringify(data).includes(FANTASMA), 'la tech inventada no llega al CV')
a.deepEqual(data.education, dataEN.education, 'los estudios no se tocan')
a.deepEqual(data.certifications, dataEN.certifications, 'las certificaciones no se tocan')
a.deepEqual(data.contact, dataEN.contact, 'el contacto no se toca')
a.equal(data.skills.backend.length, dataEN.skills.backend.length, 'skills se reordenan, no se pierden')
a.deepEqual([...data.skills.backend].sort(), [...dataEN.skills.backend].sort(), 'mismas skills')
// El modelo pidió "Python" a secas; se reordena, pero conserva TU matiz.
a.equal(data.skills.backend[0], 'Python (Expert)', 'lo pedido va primero, con el string del CV')
a.ok(dropped.includes(FANTASMA_SKILL), 'una skill que no está en tu CV: bloqueada')

// --- parche incompleto ------------------------------------------------------
// Ya no hay decodificación restringida que garantice la forma del parche (se
// atascaba y devolvía la respuesta a medias), así que la garantía es esta: lo
// que falte se queda como está en el CV maestro. Un parche a medias tiene que
// dar un CV entero, no reventar.
const cojo = { title: '', profile: 'Solo el perfil.', experience: [{ description: 'primero', achievements: ['uno'], tech: [] }] }
const { data: d2 } = applyPatch(dataEN, cojo)
a.equal(d2.experience.length, dataEN.experience.length, 'los puestos que faltan salen del CV maestro')
a.equal(d2.experience[0].description, 'primero', 'el puesto que sí venía se aplica')
a.equal(d2.experience[1].description, dataEN.experience[1].description, 'el que no venía queda intacto')
a.equal(d2.title, dataEN.title, 'un title vacío no borra el tuyo')
a.equal(d2.profile, 'Solo el perfil.')
a.deepEqual([...d2.skills.backend].sort(), [...dataEN.skills.backend].sort(), 'sin skills en el parche, no se pierde ninguna')
a.doesNotThrow(() => applyPatch(dataEN, {}), 'un parche vacío no revienta')

// --- enums que ya no garantiza el servidor ----------------------------------
// puntuar() haría NaN con un encaje desconocido y la pantalla reventaría al
// buscar su icono. normalizar() los devuelve al redil, prudente por defecto.
const sucios = normalizar([
  { texto: 'Python', tipo: 'IMPRESCINDIBLE', encaje: 'Sí', evidencia: 'WeAi' },
  { texto: 'Rails', tipo: 'must-have', encaje: 'ninguno', evidencia: '' },
  { texto: '  ', tipo: 'valorable', encaje: 'si', evidencia: 'vacío' },
  null,
])
a.equal(sucios.length, 2, 'los requisitos sin texto se caen')
a.equal(sucios[0].encaje, 'si', '"Sí" con mayúscula y tilde es "si"')
a.equal(sucios[1].tipo, 'imprescindible', 'un tipo desconocido cae en el lado prudente')
a.equal(sucios[1].encaje, 'parcial', 'un encaje desconocido cae en "parcial", no en NaN')
a.ok(Number.isInteger(puntuar(sucios).imprescindibles), 'puntuar da un número, no NaN')
a.deepEqual(normalizar(undefined), [], 'sin requisitos no revienta')

// --- la cita tiene que estar EN la oferta ------------------------------------
// El campo existe para poder comprobar que el requisito no se lo inventó el
// modelo. Una cita inventada lo convertiría en lo contrario: una invención con
// aspecto de prueba. Se verifica contra el texto, como applyPatch con tech.
const OFERTA = '- Buscamos un ingeniero.\n- **Se  requiere**\n  Python 3 y experiencia en Kubernetes.'
const citas = normalizar([
  { texto: 'Python', tipo: 'imprescindible', encaje: 'si', evidencia: 'WeAi', cita: 'Se requiere Python 3' },
  { texto: 'Rails', tipo: 'imprescindible', encaje: 'no', evidencia: '', cita: '10 años de Ruby on Rails' },
  { texto: 'Kubernetes', tipo: 'imprescindible', encaje: 'si', evidencia: 'EASO', cita: '' },
  { texto: 'Docker', tipo: 'valorable', encaje: 'si', evidencia: 'Kauai' },
], OFERTA)
a.equal(citas[0].cita, 'Se requiere Python 3',
  'una cita real sobrevive a los saltos de línea y a los asteriscos de la oferta')
// La garantía que sigue en pie: quitar o añadir una palabra la tumba. Es lo que
// separa "copió el fragmento" de "lo reescribió a su manera", que es lo normal.
a.equal(normalizar([{ texto: 'x', cita: 'Se requiere Python y Kubernetes' }], OFERTA)[0].cita, '',
  'una paráfrasis que se salta las palabras de en medio no cuela')
a.equal(citas[1].cita, '', 'una cita que no está en la oferta no se pinta')
a.equal(citas[2].cita, '', 'la cadena vacía no cuela por estar contenida en todo')
a.equal(citas[3].cita, '', 'sin cita, cadena vacía y no undefined')
a.equal(normalizar([{ texto: 'x', cita: 'lo que sea' }])[0].cita, '',
  'sin oferta contra la que comprobar, no hay cita que valga')

// --- ofertas que solo existen en un <script> --------------------------------
// Ashby y compañía sirven React puro: sin esto el scrape moría con un "pide
// login" que era mentira.
const ashby = `<html><head><script type="application/ld+json">${JSON.stringify({
  '@type': 'JobPosting', title: 'Senior Engineer',
  hiringOrganization: { name: 'Preply' }, description: '<p>We use <b>React</b> and Python.</p>',
})}</script></head><body><div id="root"></div></body></html>`
const extraido = jobPosting(ashby)
a.ok(extraido.includes('Senior Engineer') && extraido.includes('Preply') && extraido.includes('React'),
  'la oferta sale del ld+json, ya limpia de etiquetas')
a.equal(jobPosting('<html><body>sin ld+json</body></html>'), null, 'sin ld+json devuelve null, no revienta')
a.equal(jobPosting('<script type="application/ld+json">{roto</script>'), null, 'un ld+json roto no tumba el scrape')

// El limpiador de HTML del scraping.
a.equal(strip('<p>Senior <b>AI</b> Engineer</p>').replace(/\s+/g, ' ').trim(), 'Senior AI Engineer')
a.ok(!strip('<script>alert(1)</script><p>hola</p>').includes('alert'), 'los scripts se van')

// --- invenciones en texto libre ---------------------------------------------
// Caso real observado con nemotron: declara el gap y acto seguido lo escribe en
// el perfil. tech/skills se bloquean solos; esto solo se puede avisar.
const contradictory = {
  ...evil,
  profile: 'Expert in Spec-Driven Development and evals frameworks, plus Python and RAG.',
  gaps: ['No explicit mention of Spec-Driven Development.', 'No experience with evals frameworks.'],
}
const escrito = (p) => [p.title, p.profile, ...p.experience.flatMap((e) => [e.description, ...e.achievements])].join('\n')
const inv = findInventions(dataEN, contradictory.gaps, escrito(contradictory))
a.ok(inv.includes('Spec-Driven Development'), 'detecta lo que el propio modelo dijo que faltaba')
a.ok(!inv.includes('Python'), 'Python está en tu CV: no es invención')
a.ok(!inv.includes('RAG'), 'RAG está en tu CV: no es invención')

const honest = { ...evil, profile: 'Senior AI Engineer con Python y FastAPI.', gaps: ['No Ruby on Rails.'] }
a.deepEqual(findInventions(dataEN, honest.gaps, escrito(honest)), [], 'sin contradicción, no avisa')

// La carta es texto libre de principio a fin: applyPatch no puede filtrar nada
// ahí, así que esta es la ÚNICA red que tiene. Mismo detector, otro texto.
const cartaMentirosa = `I have shipped production ${FANTASMA} systems and built RAG systems in Python.`
const invCarta = findInventions(dataEN, [`No experience with ${FANTASMA}.`], cartaMentirosa)
a.deepEqual(invCarta, [FANTASMA], 'la carta que se contradice con sus gaps se caza igual')
a.deepEqual(findInventions(dataEN, [`No ${FANTASMA}.`], 'Built RAG systems in Python at WeAi.'), [],
  'una carta que se ciñe al CV no dispara el aviso')

// Caso real observado con nemotron a la primera: el prompt le prohíbe hablar de
// dinero y aun así escribió una pretensión salarial. Un número no es un término
// declarado en gaps, así que findInventions no puede verlo.
a.deepEqual(findFigures('mi aspiración salarial está en el rango de 65.000–70.000 € brutos'), ['70.000 €'],
  'una cifra en euros se caza')
a.deepEqual(findFigures('expecting around 70k for this role'), ['70k'], 'también el atajo "70k"')
a.deepEqual(findFigures('$85,000 per year'), ['$85,000'], 'y el símbolo delante')
a.deepEqual(findFigures('Entregué 3 proyectos para BBVA en 2025 con Python 3.11'), [],
  'los números que no son dinero no molestan')

// --- puntuación de encaje ---------------------------------------------------
// Los imprescindibles y los valorables NO se promedian juntos: cumplir extras
// no compensa fallar un requisito bloqueante, y mezclarlos daría un 70% alegre
// en ofertas que en realidad no puedes pasar.
const reqs = [
  { texto: 'Python', tipo: 'imprescindible', encaje: 'si', evidencia: 'WeAi' },
  { texto: 'Ruby on Rails', tipo: 'imprescindible', encaje: 'no', evidencia: 'no aparece' },
  { texto: 'LangGraph', tipo: 'imprescindible', encaje: 'parcial', evidencia: 'usa LangChain' },
  { texto: 'Inglés', tipo: 'valorable', encaje: 'si', evidencia: 'técnico' },
]
const p = puntuar(reqs)
a.equal(p.imprescindibles, 50, '(1 + 0 + 0.5) / 3 = 50%')
a.equal(p.valorables, 100, 'los valorables van aparte')
a.deepEqual(p.bloqueantes, ['Ruby on Rails'], 'solo los imprescindibles con encaje "no"')
a.equal(puntuar([]).imprescindibles, null, 'sin requisitos no se inventa un porcentaje')
a.equal(puntuar([{ texto: 'x', tipo: 'valorable', encaje: 'si', evidencia: '' }]).imprescindibles, null,
  'solo valorables: no hay nota de imprescindibles, no un 0 engañoso')

// --- el idioma no frena nada -------------------------------------------------
// Buscando cualquier trabajo, un requisito de inglés no puede tumbar una oferta.
// Se degrada a valorable en normalizar(), que es por donde pasan TODOS antes de
// puntuar() y recomendar(): así el % de imprescindibles no lo ve y no puede
// acabar en bloqueantes ni en un "descartar".
const idioma = normalizar([
  { texto: 'Fluent English C1 required', tipo: 'imprescindible', encaje: 'no', evidencia: '' },
  { texto: 'Inglés técnico imprescindible', tipo: 'imprescindible', encaje: 'parcial', evidencia: '' },
  { texto: 'Python', tipo: 'imprescindible', encaje: 'si', evidencia: 'WeAi' },
])
a.equal(idioma[0].tipo, 'valorable', 'el inglés exigido entra como valorable')
a.equal(idioma[1].tipo, 'valorable', 'y en español igual')
a.equal(idioma[2].tipo, 'imprescindible', 'lo demás no se toca')
const conIdioma = puntuar(idioma)
a.deepEqual(conIdioma.bloqueantes, [], 'el idioma no puede ser bloqueante')
a.equal(conIdioma.imprescindibles, 100, 'ni baja el % de imprescindibles')
a.equal(recomendar(conIdioma), 'aplicar', 'ni provoca un descarte')

// La recomendación se calcula aquí porque el modelo la daba incoherente
// (devolvió "descartar" con el 100% de los imprescindibles cumplidos).
a.equal(recomendar({ imprescindibles: 100, bloqueantes: [] }), 'aplicar')
a.equal(recomendar({ imprescindibles: 90, bloqueantes: ['Rails'] }), 'aplicar_con_reservas',
  'un solo bloqueante no descarta, pero avisa')
a.equal(recomendar({ imprescindibles: 95, bloqueantes: ['Rails', 'Go'] }), 'descartar',
  'dos bloqueantes descartan por alto que sea el porcentaje')
a.equal(recomendar({ imprescindibles: 40, bloqueantes: [] }), 'descartar')
a.equal(recomendar({ imprescindibles: 70, bloqueantes: [] }), 'aplicar_con_reservas')
a.equal(recomendar({ imprescindibles: null, bloqueantes: [] }), 'aplicar', 'sin imprescindibles no bloquea')
// El corte del "8/10": cuatro de cada cinco imprescindibles y ningún bloqueante.
// Era 75. Está aquí clavado para que subirlo o bajarlo sea una decisión y no un
// descuido: es lo que separa gastar una adaptación de no gastarla.
a.equal(recomendar({ imprescindibles: 79, bloqueantes: [] }), 'aplicar_con_reservas', 'por debajo del 8/10')
a.equal(recomendar({ imprescindibles: 80, bloqueantes: [] }), 'aplicar', 'el 8/10 justo pasa')

// --- la banda salarial -------------------------------------------------------
// La banda la estima el modelo y se equivoca de formas concretas: la devuelve
// invertida, o en euros MENSUALES. Las dos se descartan aquí, no en la pantalla.
const lleno = { imprescindibles: 100, bloqueantes: [] }
const flojo = { imprescindibles: 60, bloqueantes: [] }
const roto = { imprescindibles: 90, bloqueantes: ['Rails'] }
const banda = { bandaMin: 50000, bandaMax: 70000, baseSalarial: 'Mercado Barcelona, producto' }

a.equal(pedirSalario({ bandaMin: 70000, bandaMax: 50000 }, lleno), null, 'banda invertida: no se pinta')
a.equal(pedirSalario({ bandaMin: 3500, bandaMax: 4500 }, lleno), null, 'banda mensual: fuera de rango, no se pinta')
a.equal(pedirSalario({ bandaMin: 50000, bandaMax: 900000 }, lleno), null, 'techo absurdo: no se pinta')
a.equal(pedirSalario({}, lleno), null, 'sin banda y sin cifra publicada, no hay nada que decir')

// La curva, medida sobre una banda de 50-70k (20k de recorrido). Era más baja
// —0,8 / 0,55 / 0,3— y dejaba pidiendo el tercio bajo a quien cumple cuatro de
// cada cinco requisitos, que es justo un buen candidato.
a.equal(pedirSalario(banda, lleno).pedir, 67000, 'cumpliéndolo todo se pide arriba del todo')
a.equal(pedirSalario(banda, { imprescindibles: 80, bloqueantes: [] }).pedir, 64000,
  'al 80% se piden dos tercios largos de la banda, no el tercio bajo')
a.equal(pedirSalario(banda, flojo).pedir, 60000, 'al 60% se pide el punto medio')
a.equal(pedirSalario(banda, { imprescindibles: 40, bloqueantes: [] }).pedir, 56000,
  'por debajo del 60% sí baja al tercio bajo')
a.ok(pedirSalario(banda, flojo).pedir < pedirSalario(banda, lleno).pedir,
  'con menos encaje se pide menos')
a.equal(pedirSalario(banda, roto).pedir, 62000, 'con un bloqueante, techo en 0,6 de la banda')
a.equal(pedirSalario(banda, lleno).base, 'Mercado Barcelona, producto')

// El suelo es la mitad de la información que se usa al negociar, y NUNCA puede
// salir por encima de lo que pides: con un mínimo fijo del 35% pasaba en cuanto
// el punto caía al 30%.
for (const e of [lleno, flojo, roto, { imprescindibles: 20, bloqueantes: ['x'] }]) {
  const s = pedirSalario(banda, e)
  a.ok(s.suelo <= s.pedir, `el suelo (${s.suelo}) nunca por encima de lo que pides (${s.pedir})`)
}

// Lo que la oferta publica es un TECHO, no la respuesta: si se devuelve tal cual
// se salta el ajuste por encaje y acaba diciendo "pide el máximo" en una oferta
// que cumples a medias. Medido con una oferta real de 55.000-70.000 al 83% con un
// bloqueante: decía 70.000.
a.equal(pedirSalario(banda, lleno, 80000).pedir, 67000,
  'un techo por encima de la banda no cambia nada: manda el punto')
a.equal(pedirSalario(banda, lleno, 60000).pedir, 60000, 'un techo por debajo del punto sí tapa')
a.equal(pedirSalario(banda, roto, 70000).pedir, 62000, 'con bloqueante no se pide el techo publicado')
a.equal(pedirSalario({ bandaMin: 3500, bandaMax: 4500 }, lleno, 60000).pedir, 60000,
  'con la banda descartada, la cifra publicada es lo único que hay')

// Y una cifra suelta que NO es un sueldo ya no baja la petición. Era el fallo que
// convertía una banda de 50-80 en "pide 53.000" sin decir por qué.
a.equal(pedirSalario(banda, lleno, 12000).pedir, 67000,
  'una cifra por debajo del suelo de la banda no es el sueldo: se ignora')

// Si la oferta publica una banda, manda ella y no la estimación del modelo.
const publicada = pedirSalario(banda, lleno, 90000, { min: 60000, max: 90000 })
a.equal(publicada.min, 60000, 'la banda publicada sustituye a la estimada')
a.equal(publicada.pedir, 86000, 'y el punto se calcula dentro de ella')
a.equal(publicada.publica, true, 'se marca que no es una estimación')

// rangoSalarial: solo hay banda publicada si hay DOS cifras plausibles. Con una
// sola —o con "10k usuarios"— no se inventa un rango.
a.deepEqual(rangoSalarial('Salario: 45.000 - 60.000 € brutos'), { min: 45000, max: 60000 })
a.deepEqual(rangoSalarial('35.000-42.000 euros'), { min: 35000, max: 42000 }, 'euros escrito entero')
a.deepEqual(rangoSalarial('Banda de 50k a 70k'), { min: 50000, max: 70000 }, 'la k solo al final')
a.deepEqual(rangoSalarial('Range: €50,000 to €70,000 per year'), { min: 50000, max: 70000 })
a.equal(rangoSalarial('Ofrecemos 55k y un equipo de 10 personas'), null,
  'una sola cifra no es una banda')
a.equal(rangoSalarial('Servimos a 10k usuarios y 200k peticiones'), null,
  'cifras que no son sueldos anuales no forman banda')

// El veredicto degenerado que se vio en producción: cientos de "si" seguidos.
const bucle = 'si no parcial no ' + 'si '.repeat(200)
const enc = { imprescindibles: 75, bloqueantes: ['Ruby on Rails'] }
const limpio = limpiarVeredicto(bucle, enc)
a.ok(!limpio.startsWith('si no parcial'), 'el bucle se descarta')
a.ok(limpio.includes('75%') && limpio.includes('Ruby on Rails'), 'el sustituto sale de los números')
a.equal(limpiarVeredicto('', enc), limpio, 'vacío usa el mismo sustituto')
a.equal(limpiarVeredicto('Corto.', enc), limpio, 'demasiado corto también')
const bueno = 'Encajas bien en la parte de IA generativa y agentes, pero la oferta exige presencialidad en Barcelona y experiencia directa con clientes que el CV no documenta.'
a.equal(limpiarVeredicto(bueno, enc), bueno, 'un veredicto real se respeta tal cual')

// --- la puerta del endpoint -------------------------------------------------
// La URL de Vercel es pública y cada llamada gasta créditos: en producción esto
// tiene que fallar CERRADO. 500/401 aquí significan "no ha llegado al modelo".
const call = async (h, env, headers = {}) => {
  for (const k of ['VERCEL', 'TAILOR_PASSWORD', 'TAILOR_PASSWORD_HASH', 'NVIDIA_API_KEY']) delete process.env[k]
  Object.assign(process.env, env)
  const res = { code: 0, body: null }
  res.status = (c) => { res.code = c; return res }
  res.json = (d) => { res.body = d; return res }
  await h({ method: 'POST', headers, body: { text: 'x'.repeat(500), lang: 'en' } }, res)
  return res
}

// verifyPassword: valida su contraseña y ninguna otra, y no revienta con basura.
const HASH = hashPassword('s3cr3t')
a.ok(verifyPassword('s3cr3t', HASH), 'el hash valida su contraseña')
a.ok(!verifyPassword('mala', HASH), 'y rechaza otra')
a.ok(!verifyPassword('s3cr3t', 'sin-dos-puntos'), 'un hash con formato roto no valida, no revienta')

// La puerta, con el hash (el camino nuevo).
const HPW = { VERCEL: '1', TAILOR_PASSWORD_HASH: HASH }
a.equal((await call(handler, { VERCEL: '1' })).code, 500, 'prod sin secreto: cerrado a todos')
a.equal((await call(handler, HPW)).code, 401, 'prod sin enviar contraseña: 401')
a.equal((await call(handler, HPW, { 'x-tailor-key': 'mala' })).code, 401, 'contraseña incorrecta: 401')
// 500 = pasó la puerta y murió por falta de API key, que es lo que se comprueba.
a.equal((await call(handler, HPW, { 'x-tailor-key': 's3cr3t' })).code, 500, 'contraseña correcta: pasa')
a.equal((await call(handler, {})).code, 500, 'en local sin nada configurado: pasa')

// El camino de compatibilidad con TAILOR_PASSWORD en claro sigue vivo hasta que
// se borre la variable tras migrar.
const PW = { VERCEL: '1', TAILOR_PASSWORD: 's3cr3t' }
a.equal((await call(handler, PW)).code, 401, 'clara: sin contraseña, 401')
a.equal((await call(handler, PW, { 'x-tailor-key': 's3cr3t' })).code, 500, 'clara: contraseña correcta pasa')

// /api/feed pasa needsKey=false porque no llama al modelo. Eso NO puede
// ablandar la contraseña: sigue siendo una URL pública que sale a la red.
a.equal((await call(feed, { VERCEL: '1' })).code, 500, 'feed en prod sin secreto: cerrado')
a.equal((await call(feed, HPW)).code, 401, 'feed en prod sin contraseña: 401')
a.equal((await call(feed, HPW, { 'x-tailor-key': 'mala' })).code, 401, 'feed con contraseña incorrecta: 401')

// Las cabeceras de frase en español no son invenciones. El editor avisaba
// «menciona Dominio, que no está en tu CV» porque el gap empieza por esa palabra
// en mayúscula; un aviso rojo que casi siempre miente deja de leerse.
a.deepEqual(findInventions(dataEN, ['Dominio de Spark no acreditado.'], 'Dominio de Python.'), [],
  'una palabra corriente en mayúscula por ir al principio no es una invención')
a.deepEqual(findInventions(dataEN, ['Dominio de Spark no acreditado.'], 'Dominio de Spark en producción.'),
  ['Spark'], 'pero el término real se sigue cazando')

// --- el brief que va del auditor al adaptador --------------------------------
// Sin esto /api/tailor recibía el texto crudo y volvía a deducir de cero qué
// cubre el CV: sus `gaps` contradecían al informe que acabas de leer.
a.equal(brief([]), '', 'sin auditoría el prompt es exactamente el de antes')
a.equal(brief(), '', 'y sin argumento tampoco revienta')
{
  const b = brief([
    { texto: 'Python', encaje: 'si' },
    { texto: 'LangGraph', encaje: 'parcial' },
    { texto: 'Ruby on Rails', encaje: 'no' },
  ])
  a.ok(b.includes('Python') && b.includes('LangGraph') && b.includes('Ruby on Rails'),
    'los tres requisitos llegan al prompt')
  // Lo que importa no es que aparezcan, es DÓNDE: un "no cubierto" en la sección
  // de destacar es justo la invención que este cambio existe para evitar.
  const [destacar, resto] = b.split('PARCIAL')
  a.ok(destacar.includes('Python'), 'lo cubierto va en la sección de destacar')
  a.ok(!destacar.includes('Ruby on Rails'), 'lo NO cubierto no va en la de destacar')
  a.ok(resto.includes('Ruby on Rails') && resto.includes('NO se menciona'),
    'lo no cubierto va con la prohibición de mencionarlo')
}
// El CV que el modelo puede LEER: entero, con estudios y certificaciones, que no
// se reescriben pero sí se evalúan. Lo comparten audit y cover; estaba duplicado.
{
  const r = resumenCV(dataEN)
  a.equal(r.experiencia.length, dataEN.experience.length)
  a.ok(r.certificaciones.length > 0, 'la carta también ve las certificaciones')
  a.equal(r.experiencia[0].empresa, dataEN.experience[0].project)
}

// --- por qué está descartada ---------------------------------------------------
// Derivado de lo que ya se guarda, sin campo nuevo ni migración.
a.equal(porQueDescartada({ estado: 'enviada' }), null, 'solo habla de las descartadas')
a.equal(porQueDescartada({ estado: 'descartada' }), 'La descartaste tú', 'sin auditoría, fuiste tú')
a.equal(
  porQueDescartada({ estado: 'descartada', auditoria: { recomendacion: 'aplicar', encaje: { imprescindibles: 90, bloqueantes: [] } } }),
  'La descartaste tú', 'la auditoría decía que aplicaras: la cerraste tú')
a.match(
  porQueDescartada({ estado: 'descartada', auditoria: { recomendacion: 'descartar', encaje: { imprescindibles: 95, bloqueantes: ['Rails', 'Go'] } } }),
  /2 bloqueantes.*Rails; Go/, 'dos bloqueantes, con cuáles')
a.match(
  porQueDescartada({ estado: 'descartada', auditoria: { recomendacion: 'descartar', encaje: { imprescindibles: 40, bloqueantes: [] } } }),
  /40%/, 'poco encaje, con el número')

// --- el lote -----------------------------------------------------------------
// Partir lo pegado: o son enlaces (uno por línea) o son ofertas en texto
// separadas por una línea en blanco. Con una sola entrada el flujo de siempre
// no cambia, así que este es el caso que no puede romperse.
a.deepEqual(partir('https://a.com/1\nhttps://b.com/2'), ['https://a.com/1', 'https://b.com/2'])
a.deepEqual(partir('  https://a.com/1  \n\n https://a.com/1 '), ['https://a.com/1'], 'la misma URL dos veces es una')
a.deepEqual(partir('https://a.com/1'), ['https://a.com/1'], 'una sola: el camino de siempre')
a.deepEqual(partir(''), [], 'vacío no lanza nada')
a.deepEqual(partir('   \n  \n'), [], 'solo espacios tampoco')
a.deepEqual(partir('Oferta A\nPython\n---\nOferta B\nJava'), ['Oferta A\nPython', 'Oferta B\nJava'],
  'texto pegado: se parte por una línea de guiones, que es explícita')
// El caso que rompía la versión anterior, que partía por líneas en blanco: el
// texto de una oferta trae párrafos, y cada párrafo se volvía "otra oferta".
a.equal(partir('Senior AI Engineer\n\nQué harás:\n- RAG\n\nRequisitos:\n- Python').length, 1,
  'una oferta con párrafos es UNA oferta, no cuatro')
a.deepEqual(partir('Buscamos alguien\nque sepa https://ejemplo.com/docs'),
  ['Buscamos alguien\nque sepa https://ejemplo.com/docs'],
  'una oferta en texto que MENCIONA una URL no son dos ofertas')

// El pool: todo se procesa una vez, nunca más de `aLaVez` a la vez, y una
// oferta que revienta no se lleva por delante a las demás.
{
  const hechas = []
  let vivos = 0
  let pico = 0
  const tarea = async (entrada, lang, onFase) => {
    vivos++; pico = Math.max(pico, vivos)
    await new Promise((r) => setTimeout(r, 5))
    vivos--
    if (entrada === 'mala') throw new Error('502 del portal')
    onFase('listo', { ok: true })
    hechas.push(entrada)
  }
  const fases = []
  await enLote(['a', 'mala', 'c', 'd'], 'es', (i, fase) => fases.push([i, fase]), 2, tarea)
  a.deepEqual(hechas.sort(), ['a', 'c', 'd'], 'las tres buenas se procesan')
  a.ok(pico <= 2, `nunca más de 2 a la vez (pico ${pico})`)
  a.deepEqual(fases.find(([i]) => i === 1), [1, 'error'], 'la que falla se marca en su fila')
  a.equal(fases.filter(([, f]) => f === 'listo').length, 3)
}

// --- el recorrido de una candidatura -------------------------------------------
// Los siete estados, en orden: el orden ES lo que pinta el pipeline y los chips.
a.deepEqual(Object.keys(ESTADOS),
  ['guardada', 'preparada', 'enviada', 'entrevista', 'contratado', 'rechazada', 'descartada'])

// El paso hacia delante llega hasta el final bueno, y los tres finales no tienen.
a.equal(SIGUIENTE.guardada, 'preparada')
a.equal(SIGUIENTE.preparada, 'enviada')
a.equal(SIGUIENTE.enviada, 'entrevista')
a.equal(SIGUIENTE.entrevista, 'contratado')
for (const fin of ['contratado', 'rechazada', 'descartada']) {
  a.equal(SIGUIENTE[fin], undefined, `${fin} es un final, no tiene siguiente`)
}
for (const [de, hacia] of Object.entries(SIGUIENTE)) {
  a.ok(ESTADOS[de] && ESTADOS[hacia], `SIGUIENTE apunta a estados que existen: ${de} -> ${hacia}`)
}

// Generar el CV adelanta, pero no desde cualquier sitio. LA regresión que
// importa: regenerar el PDF de una oferta ya enviada la devolvía a "preparada" y
// desaparecía del seguimiento. La regla vive en SUCESOS.cv y se prueba entera más
// abajo; aquí queda el caso que la motivó.
a.equal(SUCESOS.cv({ estado: 'enviada' }), 'enviada', 'una enviada no retrocede por regenerar el CV')

// --- la fecha de cada cambio ----------------------------------------------------
{
  const base = { id: 'x', estado: 'guardada' }
  const enviada = aplicarPatch(base, { estado: 'enviada' }, '2026-08-10')
  a.deepEqual(enviada.historia, [{ estado: 'enviada', dia: '2026-08-10' }])

  // Guardar la variante NO es un hito: si lo fuera, "hace N días" mediría la
  // última vez que tocaste la fila, no desde cuándo espera respuesta.
  const conVariante = aplicarPatch(enviada, { variante: 'X · ES' }, '2026-08-20')
  a.deepEqual(conVariante.historia, enviada.historia, 'la variante no sella fecha')
  a.equal(conVariante.variante, 'X · ES')

  // Repetir el mismo estado tampoco.
  a.deepEqual(aplicarPatch(enviada, { estado: 'enviada' }, '2026-08-20').historia, enviada.historia)

  // Y encadenar sí acumula.
  const entrevista = aplicarPatch(enviada, { estado: 'entrevista' }, '2026-08-18')
  a.equal(entrevista.historia.length, 2)
  a.equal(desdeCuando(entrevista, 'enviada'), '2026-08-10')
  a.equal(desdeCuando(entrevista, 'contratado'), null, 'un estado por el que no pasó')
  a.equal(desdeCuando({ id: 'vieja' }, 'enviada'), null, 'una oferta sin historia no inventa fecha')

  // Si vuelve a pasar por un estado, manda la última vez.
  const revive = aplicarPatch(aplicarPatch(entrevista, { estado: 'enviada' }, '2026-08-25'), { estado: 'entrevista' }, '2026-08-26')
  a.equal(desdeCuando(revive, 'enviada'), '2026-08-25', 'la última vez, no la primera')

  a.equal(diasDesde(hoy()), 0)
  a.equal(diasDesde(null), null)
  a.equal(diasDesde('no es fecha'), null, 'basura no revienta la pantalla')
  a.ok(diasDesde('2026-08-01') > 0)
}

// --- la migración ----------------------------------------------------------------
// Las ofertas de antes de que existiera "preparada": con CV ya no son "guardada".
a.deepEqual(migrar([
  { id: 'a', estado: 'guardada', cv: {} },
  { id: 'b', estado: 'guardada' },
  { id: 'c', estado: 'enviada', cv: {} },
  { id: 'd', estado: 'descartada', cv: {} },
]).map((o) => o.estado), ['preparada', 'guardada', 'enviada', 'descartada'])

// --- los grupos del Resumen -----------------------------------------------------
// Con "preparada" en el modelo, los grupos ya no deducen nada de los campos: se
// leen del estado. "preparada" ES tener CV.
{
  const cv = { profile: 'x' }
  const alta = { recomendacion: 'aplicar', encaje: { imprescindibles: 90, bloqueantes: [] } }
  const baja = { recomendacion: 'descartar', encaje: { imprescindibles: 40, bloqueantes: ['Rails'] } }
  // Encaje ALTO pero con un imprescindible sin cubrir. Con el `>= 75` a mano que
  // había aquí salía como «merece la pena»; leyendo la recomendación, no.
  const conBloqueante = { recomendacion: 'aplicar_con_reservas', encaje: { imprescindibles: 90, bloqueantes: ['Rails'] } }
  // Encaje mediano pero LIMPIO: nada te falta del todo. Con el
  // `recomendacion === 'aplicar'` que estuvo aquí un rato se caía de la tira, y
  // es exactamente la candidata que quieres mirar.
  const limpia = { recomendacion: 'aplicar_con_reservas', encaje: { imprescindibles: 70, bloqueantes: [] } }
  const h = (estado, dia) => [{ estado, dia }]
  const tablero = [
    { id: 'a', estado: 'guardada', auditoria: alta },
    { id: 'b', estado: 'guardada', auditoria: baja },
    { id: 'c', estado: 'guardada' },
    { id: 'd', estado: 'preparada', auditoria: alta, cv },
    { id: 'e', estado: 'preparada', auditoria: alta, cv, url: 'https://x/1' },
    { id: 'f', estado: 'enviada', auditoria: alta, cv, url: 'https://x/2', historia: h('enviada', '2026-08-01') },
    { id: 'g', estado: 'entrevista', auditoria: alta, cv },
    { id: 'h', estado: 'contratado', auditoria: alta, cv },
    { id: 'i', estado: 'rechazada', auditoria: baja },
    { id: 'j', estado: 'descartada', auditoria: baja },
    { id: 'k', estado: 'guardada', auditoria: conBloqueante },
    { id: 'l', estado: 'guardada', auditoria: limpia },
  ]
  const g = agrupar(tablero)
  const ids = (xs) => xs.map((o) => o.id).sort()

  a.deepEqual(ids(g.vivas), ['f', 'g'], 'vivas = enviadas + entrevistas')
  a.deepEqual(ids(g.porRevisar), ['a', 'b', 'c', 'd', 'e', 'k', 'l'], 'lo que queda por hacer')
  a.deepEqual(ids(g.sinAuditar), ['c'], 'pegada y nada más')
  a.deepEqual(ids(g.soloAuditadas), ['a', 'b', 'k', 'l'], 'auditada y sin CV')
  a.deepEqual(ids(g.preparadas), ['d', 'e'], 'con CV, sin mandar')
  a.deepEqual(ids(g.listas), ['e'], 'lista = preparada Y con enlace, lo que exige el botón Aplicar')
  // El criterio es CERO BLOQUEANTES, no un umbral repetido aquí: ese vive en
  // recomendar() y en un solo sitio. 'k' —90 % con un bloqueante— se cae, porque
  // adaptar el CV no resuelve un imprescindible que no cumples; 'l' —70 % limpio—
  // entra, porque es una candidata de verdad.
  a.deepEqual(ids(g.prometedoras), ['a', 'l'],
    'sin ningún imprescindible al descubierto; ni la del bloqueante ni la sin auditar')
  // Y la tira sigue diciendo algo DISTINTO de su vecina, que es lo que justifica
  // que sean dos tiles: con un `!== descartar` habrían sido el mismo conjunto.
  a.notDeepEqual(ids(g.prometedoras), ids(g.soloAuditadas), 'no es un duplicado de «Solo auditadas»')
  a.deepEqual(ids(g.contratado), ['h'])
  a.deepEqual(ids(g.rechazadas), ['i'])
  a.deepEqual(ids(g.descartadas), ['j'])
  // La cuarta columna del tablero: las dos que están fuera, juntas pero cada una
  // con su estado. Fundirlas taparía si el problema está en tu criterio al elegir
  // o en lo que mandas.
  a.deepEqual(ids(g.archivadas), ['i', 'j'], 'archivadas = descartadas + rechazadas')

  // Los dos números que se piden en el Resumen, contra la tabla.
  a.equal(g.enviadas.length, contar(tablero).enviada)
  a.equal(g.descartadas.length, contar(tablero).descartada)

  // Una ya enviada no vuelve a la cola de "aplicar" aunque tenga enlace y CV.
  a.ok(!ids(g.listas).includes('f'))
  // La que lleva más tiempo callada, primero; la que no tiene historia, al final.
  a.deepEqual(g.sinRespuesta.map((o) => o.id), ['f'])

  a.deepEqual(agrupar([]).vivas, [], 'un tablero vacío no revienta')
  a.equal(contar(tablero).guardada, 5, 'contar() sigue contando estados, sin cambios')
}

// --- la máquina de estados ------------------------------------------------------
// SUCESOS es el ÚNICO sitio que decide a qué estado va una oferta. Antes estas
// reglas vivían repartidas en cinco puntos de Studio.jsx y ya se contradijeron:
// regenerar el CV de una enviada la devolvía a "preparada".
{
  a.equal(SUCESOS.auditada(null, { recomendacion: 'descartar' }), 'descartada')
  a.equal(SUCESOS.auditada(null, { recomendacion: 'aplicar' }), 'guardada')
  a.equal(SUCESOS.auditada(null, { recomendacion: 'aplicar_con_reservas' }), 'guardada',
    'con reservas NO nace descartada: decides tú')

  a.equal(SUCESOS.cv({ estado: 'guardada' }), 'preparada', 'tener CV adelanta')
  a.equal(SUCESOS.cv({ estado: 'enviada' }), 'enviada', 'pero una enviada NUNCA retrocede')
  a.equal(SUCESOS.cv({ estado: 'entrevista' }), 'entrevista')
  // Te saltaste la recomendación pulsando «Tengo encaje» y pagaste la adaptación:
  // dejarla archivada te esconde la oferta que acabas de preparar.
  a.equal(SUCESOS.cv({ estado: 'descartada' }), 'preparada', 'adaptar rehabilita una descartada')
  // Un «no» de la empresa no lo deshace un CV nuevo.
  a.equal(SUCESOS.cv({ estado: 'rechazada' }), 'rechazada', 'pero una rechazada no resucita')
  a.equal(SUCESOS.aplicada({ estado: 'preparada' }), 'enviada')

  a.equal(SUCESOS.marcada({ estado: 'enviada' }, 'descartada'), 'descartada', 'a mano manda')
  a.equal(SUCESOS.marcada({ estado: 'enviada' }, 'inventado'), 'enviada',
    'un estado que no existe se ignora en vez de dejarla en un limbo')

  // Y la fecha solo se sella cuando el estado CAMBIA de verdad: si no, "hace N
  // días" mediría la última vez que tocaste la fila.
  const o = { id: '1', estado: 'guardada', historia: [{ estado: 'guardada', dia: '2026-01-01' }] }
  a.equal(aplicarPatch(o, { estado: SUCESOS.cv(o) }, '2026-02-02').historia.length, 2)
  a.equal(aplicarPatch(o, { estado: SUCESOS.marcada(o, 'guardada') }, '2026-02-02').historia.length, 1,
    'repetir estado no sella')
}

// --- el historial del dinero ----------------------------------------------------
{
  const con = (id, dia, pedir, imp) => ({
    id, empresa: id, puesto: 'AI', estado: 'guardada',
    historia: [{ estado: 'guardada', dia }],
    auditoria: { encaje: { imprescindibles: imp, bloqueantes: [] }, salario: { pedir, min: 50000, max: 80000 } },
  })
  const { filas, mediana: m } = salarios([
    con('a', '2026-08-01', 60000, 70),
    con('b', '2026-09-01', 70000, 90),
    { id: 'c', estado: 'guardada', auditoria: { encaje: {} } }, // auditada sin banda
    { id: 'd', estado: 'guardada' },                            // sin auditar
  ])
  a.deepEqual(filas.map((f) => f.id), ['b', 'a'], 'la más reciente primero')
  a.equal(filas[0].encaje, 90, 'el encaje viaja con la fila')
  a.equal(m, 65000, 'la mediana de dos es su punto medio')
  a.equal(salarios([]).mediana, null, 'sin ofertas no se inventa una mediana')

  // Mediana y no media: una oferta de 120.000 no puede desplazar lo que crees que pides.
  a.equal(mediana([50000, 60000, 120000]), 60000)
  a.equal(mediana([]), null)
}

// La carta no siempre viene como string: minimax-m3 la devolvió partida en
// párrafos el 03-09-2026 y el endpoint reventaba con "carta?.trim is not a
// function".
a.equal(textoCarta('Estimados:'), 'Estimados:')
a.equal(textoCarta(['Uno.', 'Dos.']), 'Uno.\n\nDos.', 'los párrafos se unen')
a.equal(textoCarta({ parrafos: ['x'] }), '', 'un objeto es carta vacía, no "[object Object]"')
a.equal(textoCarta(null), '')

// --- las dos vías al modelo y el presupuesto de tiempo -------------------------
// Lo que rompía el 03-09-2026: un timeout fijo de 130 s contra un servicio que
// tardaba 150-240 s, y un reintento contra el mismo sitio atascado.
{
  a.deepEqual(vias({}).map((v) => v.nombre), [], 'sin claves no hay vía')
  a.deepEqual(vias({ NVIDIA_API_KEY: 'x' }).map((v) => v.nombre), ['nim'])
  a.deepEqual(vias({ AI_GATEWAY_API_KEY: 'x', NVIDIA_API_KEY: 'y' }).map((v) => v.nombre),
    ['gateway', 'nim'], 'el gateway va primero: enruta al proveedor más rápido')

  const [gw, nim] = vias({ AI_GATEWAY_API_KEY: 'x', NVIDIA_API_KEY: 'y' })
  const ahora = 1_000_000
  const hasta = ahora + PRESUPUESTO

  // NIM no tiene techo: se lleva lo que quede menos la reserva para responder.
  a.equal(reparto(nim, hasta, ahora), PRESUPUESTO - 15000)
  // Y eso es más del doble de los 130 s de antes, que es justo el arreglo.
  a.ok(reparto(nim, hasta, ahora) > 2 * 130000)
  // El gateway sí: si en 90 s no ha contestado, el resto es para NIM.
  a.equal(reparto(gw, hasta, ahora), 90000)
  // Lo que el scrape gasta se descuenta solo, porque el reloj arranca antes.
  a.equal(reparto(nim, hasta, ahora + 20000), PRESUPUESTO - 15000 - 20000)
  // Sin tiempo para un intento serio no se intenta: morir contra el techo de
  // Vercel devuelve un 504 en HTML que el navegador ni sabe leer.
  a.equal(reparto(nim, hasta, hasta - 30000), 0)
  a.equal(reparto(nim, hasta, hasta + 5000), 0, 'pasado el plazo, nunca negativo')

  // Sin ninguna clave, el fallo es inmediato y dice qué falta.
  const sin = { ...process.env }
  delete process.env.NVIDIA_API_KEY; delete process.env.AI_GATEWAY_API_KEY
  await a.rejects(() => pedirJSON({ system: 's', user: 'u', schema: {} }), /vía al modelo/)
  Object.assign(process.env, sin)
}

// --- el suplente y el 403 ---------------------------------------------------
// Lo que rompió el 09-09-2026: kimi-k3 dejó de responder, era el ÚNICO modelo de
// la vía NIM, y el gateway pedía dos veces el mismo 403 de "pon una tarjeta".
{
  const sin = { ...process.env }
  const originalFetch = globalThis.fetch
  const pedidos = []
  const responder = (status, body) => new Response(JSON.stringify(body),
    { status, headers: { 'content-type': 'application/json' } })
  const bueno = { choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }], usage: {} }

  // NIM sola, dos modelos: el segundo intento va con el suplente, no con el que
  // acaba de fallar. Repetir contra el atascado es lo que costó 282 s.
  delete process.env.AI_GATEWAY_API_KEY
  process.env.NVIDIA_API_KEY = 'x'
  globalThis.fetch = async (url, init) => {
    pedidos.push(JSON.parse(init.body).model)
    return pedidos.length === 1 ? responder(500, { error: 'atascado' }) : responder(200, bueno)
  }
  const { datos } = await pedirJSON({ system: 's', user: 'u', schema: {}, modelos: { nim: ['primero', 'suplente'] } })
  a.deepEqual(datos, { ok: true })
  a.deepEqual(pedidos, ['primero', 'suplente'], 'el segundo intento cambia de modelo')

  // Y con un solo modelo se sigue reintentando contra él, como antes.
  pedidos.length = 0
  globalThis.fetch = async (url, init) => {
    pedidos.push(JSON.parse(init.body).model)
    return pedidos.length === 1 ? responder(503, { error: 'ocupado' }) : responder(200, bueno)
  }
  await pedirJSON({ system: 's', user: 'u', schema: {}, modelos: { nim: 'solo' } })
  a.deepEqual(pedidos, ['solo', 'solo'])

  // Un 403 —el gateway sin tarjeta— no se pide dos veces: no se arregla
  // repitiendo, y salía duplicado en el mensaje de error del navegador.
  pedidos.length = 0
  process.env.AI_GATEWAY_API_KEY = 'y'
  delete process.env.NVIDIA_API_KEY
  globalThis.fetch = async (url, init) => {
    pedidos.push(JSON.parse(init.body).model)
    return responder(403, { error: { message: 'requires a valid credit card' } })
  }
  await a.rejects(() => pedirJSON({ system: 's', user: 'u', schema: {}, modelos: { gateway: ['gw'] } }),
    /credit card/)
  a.equal(pedidos.length, 1, 'el 403 se pide una sola vez')

  globalThis.fetch = originalFetch
  delete process.env.AI_GATEWAY_API_KEY; delete process.env.NVIDIA_API_KEY
  Object.assign(process.env, sin)
}

// --- reanudar sin volver a pagar ------------------------------------------------
// El caso real: la carta falla y al reintentar se repetían las tres llamadas.
{
  globalThis.localStorage ??= { getItem: () => 'clave', setItem() {} }
  const llamadas = []
  const audit = { recomendacion: 'aplicar', empresa: 'Acme', texto: 'OFERTA' }
  const señales = []
  const normal = async (url, init) => {
    llamadas.push(String(url))
    señales.push(init?.signal)
    // Un fetch de verdad rechaza si la señal ya viene abortada. El mock tiene que
    // hacer lo mismo o el test pasaría sin que la señal sirviera de nada.
    if (init?.signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' })
    const cuerpo = String(url).includes('audit') ? audit
      : String(url).includes('tailor') ? { data: { title: 'CV' } }
        : { carta: 'Estimados…' }
    return { ok: true, status: 200, json: async () => cuerpo }
  }
  globalThis.fetch = normal

  const fases = []
  const on = (fase, extra) => fases.push([fase, Object.keys(extra ?? {})])

  // Desde cero: las tres llamadas.
  llamadas.length = 0; fases.length = 0
  await preparar('texto', 'es', on)
  a.equal(llamadas.length, 3)

  // Con la auditoría ya pagada: no se vuelve a auditar.
  llamadas.length = 0; fases.length = 0
  await preparar('texto', 'es', on, { a: audit })
  a.deepEqual(llamadas.map((u) => u.split('/').pop()), ['tailor', 'cover'])
  // Y el `{ a }` NO se reenvía: es lo que crea la oferta, llegaría duplicada.
  a.ok(!fases.some(([, k]) => k.includes('a')), 'la auditoría no se reemite al reanudar')  // claves exactas: 'carta' contiene una "a"

  // Con el CV también hecho: solo queda la carta, que es lo que había fallado.
  llamadas.length = 0
  await preparar('texto', 'es', on, { a: audit, cv: { title: 'CV' } })
  a.deepEqual(llamadas.map((u) => u.split('/').pop()), ['cover'])

  // --- cortar a media ---------------------------------------------------------
  // Con NIM una auditoría son 150-240 s: sin esto, equivocarte de idioma costaba
  // cuatro minutos de espera antes de poder reintentar. La señal tiene que llegar
  // a las TRES llamadas, no solo a la primera.
  llamadas.length = 0; señales.length = 0
  const ctrl = new AbortController()
  await preparar('texto', 'es', on, { a: audit, cv: { title: 'CV' } }, 'carta', ctrl.signal)
  a.equal(señales.at(-1), ctrl.signal, 'la señal llega hasta el fetch de /api/cover')

  llamadas.length = 0; señales.length = 0
  await preparar('texto', 'es', on, {}, 'carta', ctrl.signal)
  a.equal(señales.length, 3, 'las tres llamadas la reciben')
  a.ok(señales.every((s) => s === ctrl.signal), 'y es la misma en todas')

  // Ya abortada: la secuencia se rompe en la primera y no gasta las otras dos.
  llamadas.length = 0; señales.length = 0
  ctrl.abort()
  await a.rejects(() => preparar('texto', 'es', on, {}, 'carta', ctrl.signal),
    (e) => e.name === 'AbortError', 'cortar rechaza con AbortError, que el editor NO pinta en rojo')
  a.equal(llamadas.length, 1, 'y se para en la primera, sin pagar las siguientes')

  // --- el freno del descarte, que tiene DOS lados -----------------------------
  // Auditada aquí mismo y descartada: se para. Es el ahorro de la Cola y de
  // «Preparar todo», y tiene que seguir en pie.
  llamadas.length = 0; fases.length = 0
  globalThis.fetch = async (url) => {
    llamadas.push(String(url))
    return { ok: true, status: 200, json: async () => ({ ...audit, recomendacion: 'descartar' }) }
  }
  await preparar('texto', 'es', on)
  a.deepEqual(llamadas.map((u) => u.split('/').pop()), ['audit'], 'la cadena automática no gasta la adaptación')
  a.deepEqual(fases.at(-1), ['parado', ['a']])
  globalThis.fetch = normal

  // Pero con la auditoría EN LA MANO, adapta: ese es el botón «Tengo encaje —
  // adaptar CV», que existe para contradecir a la auditoría. Suelto fuera del
  // if, el botón no hacía nada de nada: ni CV, ni error, ni spinner.
  llamadas.length = 0; fases.length = 0
  await preparar('texto', 'es', on, { a: { ...audit, recomendacion: 'descartar' } }, 'adaptar')
  a.deepEqual(llamadas.map((u) => u.split('/').pop()), ['tailor'], 'tu decisión manda sobre la recomendación')
  a.equal(fases.at(-1)[0], 'listo')

  // `hasta` es lo que permite al editor ejecutar UN paso sin volver a escribir
  // aquí las llamadas. Adaptar sin carta: la carta es otra llamada al modelo y
  // no toda oferta la merece.
  llamadas.length = 0; fases.length = 0
  await preparar('texto', 'es', on, { a: audit }, 'adaptar')
  a.deepEqual(llamadas.map((u) => u.split('/').pop()), ['tailor'], 'adaptar no escribe la carta')
  a.equal(fases.at(-1)[0], 'listo', 'y termina, no se queda colgado en "carta"')

  // Y la carta sola, sin readaptar el CV que ya está pagado.
  llamadas.length = 0
  await preparar('texto', 'es', on, { a: audit, cv: { title: 'CV' } }, 'carta')
  a.deepEqual(llamadas.map((u) => u.split('/').pop()), ['cover'])
}

// --- lo que el feed ya ha visto -------------------------------------------------
// El feed cruzaba con el tracker por `empresa|puesto`, y auditar guarda el rol
// que dice el modelo, no el titular del anuncio: NUNCA casaban, así que toda
// oferta auditada volvía a salir al día siguiente como nueva. Esto es la
// garantía de que no vuelve a pasar.
{
  const url = 'https://www.linkedin.com/jobs/view/ai-engineer-at-acme-4123456789'
  // La misma oferta, tal y como la devuelven dos búsquedas distintas.
  a.deepEqual(
    clavesDe({ url: `${url}?refId=abc&position=3`, empresa: 'Acme', puesto: 'x' })[0],
    clavesDe({ url: `${url}?refId=zzz&position=17`, empresa: 'Acme', puesto: 'y' })[0],
    'refId y position no pueden cambiar la clave'
  )
  a.equal(clavesDe({ url }).length, 1, 'sin empresa ni puesto no se inventa una segunda clave')

  // El caso real: guardada con el rol del modelo, buscada con el titular.
  const guardadas = indexar([{ id: '1', url, empresa: 'Acme', puesto: 'AI Engineer', estado: 'preparada' }])
  const fila = { url: `${url}?trk=feed`, company: 'Acme', title: 'AI Engineer (Remote) · Madrid' }
  const encontrada = clavesDe({ url: fila.url, empresa: fila.company, puesto: fila.title })
    .map((k) => guardadas.get(k)).find(Boolean)
  a.equal(encontrada?.id, '1', 'la misma oferta con otro titular tiene que reconocerse')

  // Y las pegadas a mano, que no tienen URL, siguen encontrándose por el par.
  const sinUrl = indexar([{ id: '2', empresa: 'Beta', puesto: 'Data Engineer' }])
  a.equal(sinUrl.get('beta|data engineer')?.id, '2')

  // Marcar desde el feed: nace enviada, sin auditoría, y con la historia sellada
  // (aplicarPatch es quien sella; addOferta hace lo mismo en el store).
  const nueva = desdeFeed(fila, 'enviada')
  a.equal(nueva.estado, 'enviada')
  a.equal(nueva.puesto, fila.title, 'el titular del anuncio, que es con lo que la volverás a ver')
  a.equal(nueva.auditoria, undefined, 'marcar no audita: no has pagado esa llamada')
  a.equal(aplicarPatch({ ...nueva, historia: [] }, { estado: 'entrevista' }, '2026-09-08').historia.at(-1).dia,
    '2026-09-08', 'a partir de ahí se comporta como cualquier otra')
}

console.log(`ok — ${dropped.length} inventos bloqueados (${dropped.join(', ')}); puerta cerrada en prod`)
