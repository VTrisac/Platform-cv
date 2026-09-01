// Comprueba que applyPatch no deja pasar nada inventado, aunque el modelo lo
// intente. Es el test que importa: el "no inventes" del prompt es una petición,
// esto es la garantía.
//
//   node scripts/tailor-test.js
import { strict as a } from 'node:assert'
import handler, { applyPatch, findInventions, strip, verifyPassword, jobPosting } from '../api/tailor.js'
import { puntuar, recomendar, limpiarVeredicto, bloqueaIngles, normalizar, pedirSalario } from '../api/audit.js'
import feed from '../api/feed.js'
import { findFigures } from '../api/cover.js'
import { partir, enLote } from '../src/studio/lote.js'
import { agrupar, esSemilla, contar, conCV, SIGUIENTE, ESTADOS, aplicarPatch,
  desdeCuando, diasDesde, migrar, hoy } from '../src/studio/store.js'
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

// --- inglés imprescindible --------------------------------------------------
// La distinción que ninguna palabra clave puede hacer: "English" sale en las dos
// frases, pero solo una es un requisito que te descarta la oferta.
a.equal(bloqueaIngles([
  { texto: 'Fluent English for daily communication', tipo: 'imprescindible', encaje: 'parcial', evidencia: '' },
]), 'Fluent English for daily communication', 'inglés exigido: bloquea')
a.equal(bloqueaIngles([
  { texto: 'English is a plus', tipo: 'valorable', encaje: 'si', evidencia: '' },
]), null, 'inglés valorable: no bloquea')
a.equal(bloqueaIngles([
  { texto: 'Inglés técnico imprescindible', tipo: 'imprescindible', encaje: 'si', evidencia: 'Inglés (Técnico)' },
]), 'Inglés técnico imprescindible', 'bloquea aunque lo cumplas: es lo pedido')
a.equal(bloqueaIngles([
  { texto: 'English-speaking team', tipo: 'imprescindible', encaje: 'si', evidencia: '' },
]), 'English-speaking team', 'también en inglés, el CV puede estar en EN')
a.equal(bloqueaIngles([{ texto: 'Python', tipo: 'imprescindible', encaje: 'si', evidencia: '' }]), null)
a.equal(bloqueaIngles([]), null, 'sin requisitos no revienta')

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

a.equal(pedirSalario(banda, lleno).pedir, 66000, 'cumpliéndolo todo se pide el tercio alto')
a.ok(pedirSalario(banda, flojo).pedir < pedirSalario(banda, lleno).pedir,
  'con menos encaje se pide menos')
a.ok(pedirSalario(banda, roto).pedir <= 60000, 'con un bloqueante, nunca por encima del punto medio')
a.equal(pedirSalario(banda, lleno).base, 'Mercado Barcelona, producto')

// Lo que la oferta publica es un TECHO, no la respuesta: si se devuelve tal cual
// se salta el ajuste por encaje y acaba diciendo "pide el máximo" en una oferta
// que cumples a medias. Medido con una oferta real de 55.000-70.000 al 83% con un
// bloqueante: decía 70.000.
a.equal(pedirSalario(banda, lleno, 80000).pedir, 66000,
  'un techo por encima de la banda no cambia nada: manda el punto')
a.equal(pedirSalario(banda, lleno, 60000).pedir, 60000, 'un techo por debajo del punto sí tapa')
a.equal(pedirSalario(banda, roto, 70000).pedir, 60000, 'con bloqueante no se pide el techo publicado')
a.equal(pedirSalario({ bandaMin: 3500, bandaMax: 4500 }, lleno, 60000).pedir, 60000,
  'con la banda descartada, la cifra publicada es lo único que hay')


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

// Generar el CV adelanta, pero solo desde el principio. La segunda es LA
// regresión que importa: sin ella, regenerar el PDF de una oferta ya enviada la
// devolvía a "preparada" y desaparecía del seguimiento.
a.equal(conCV('guardada'), 'preparada')
a.equal(conCV('enviada'), 'enviada', 'una enviada no retrocede por regenerar el CV')
a.equal(conCV('entrevista'), 'entrevista')
a.equal(conCV('descartada'), 'descartada', 'ni resucita una descartada')

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
  const alta = { encaje: { imprescindibles: 90, bloqueantes: [] } }
  const baja = { encaje: { imprescindibles: 40, bloqueantes: ['Rails'] } }
  const h = (estado, dia) => [{ estado, dia }]
  const tablero = [
    { id: 'seed-0', empresa: 'Demo', estado: 'enviada' },
    { id: 'seed-1', empresa: 'Demo', estado: 'guardada' },
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
  ]
  const g = agrupar(tablero)
  const ids = (xs) => xs.map((o) => o.id).sort()

  a.deepEqual(ids(g.vivas), ['f', 'g', 'seed-0'], 'vivas = enviadas + entrevistas')
  a.deepEqual(ids(g.porRevisar), ['a', 'b', 'c', 'd', 'e', 'seed-1'], 'lo que queda por hacer')
  a.deepEqual(ids(g.sinAuditar), ['c', 'seed-1'], 'pegada y nada más')
  a.deepEqual(ids(g.soloAuditadas), ['a', 'b'], 'auditada y sin CV')
  a.deepEqual(ids(g.preparadas), ['d', 'e'], 'con CV, sin mandar')
  a.deepEqual(ids(g.listas), ['e'], 'lista = preparada Y con enlace, lo que exige el botón Aplicar')
  a.deepEqual(ids(g.prometedoras), ['a'], 'encaje alto y sin adaptar; la de encaje bajo no entra')
  a.deepEqual(ids(g.contratado), ['h'])
  a.deepEqual(ids(g.rechazadas), ['i'])
  a.deepEqual(ids(g.descartadas), ['j'])
  a.deepEqual(ids(g.semilla), ['seed-0', 'seed-1'], 'la demo se reconoce por su id')

  // Los dos números que se piden en el Resumen, contra la tabla.
  a.equal(g.enviadas.length, contar(tablero).enviada)
  a.equal(g.descartadas.length, contar(tablero).descartada)

  // Una ya enviada no vuelve a la cola de "aplicar" aunque tenga enlace y CV.
  a.ok(!ids(g.listas).includes('f'))
  // La que lleva más tiempo callada, primero; la que no tiene historia, al final.
  a.deepEqual(g.sinRespuesta.map((o) => o.id), ['f', 'seed-0'])

  a.equal(esSemilla({ id: 'seed-9' }), true)
  a.equal(esSemilla({ id: crypto.randomUUID() }), false, 'una oferta real nunca es semilla')
  a.deepEqual(agrupar([]).vivas, [], 'un tablero vacío no revienta')
  a.equal(contar(tablero).guardada, 4, 'contar() sigue contando estados, sin cambios')
}

console.log(`ok — ${dropped.length} inventos bloqueados (${dropped.join(', ')}); puerta cerrada en prod`)
