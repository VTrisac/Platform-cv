// Comprueba que applyPatch no deja pasar nada inventado, aunque el modelo lo
// intente. Es el test que importa: el "no inventes" del prompt es una petición,
// esto es la garantía.
//
//   node scripts/tailor-test.js
import { strict as a } from 'node:assert'
import handler, { applyPatch, findInventions, strip } from '../api/tailor.js'
import { puntuar, recomendar, limpiarVeredicto, bloqueaIngles } from '../api/audit.js'
import feed from '../api/feed.js'
import { findFigures } from '../api/cover.js'
import { dataEN } from '../src/data.js'

// Un parche hostil: cambia empresas y fechas, añade stack que no tiene,
// inventa un puesto extra y mete 5 logros donde caben 3.
const evil = {
  title: 'Principal Engineer',
  profile: 'Perfil reescrito.',
  experience: dataEN.experience.map((e, i) => ({
    description: `desc ${i}`,
    achievements: ['a', 'b', 'c', 'd', 'e'],
    tech: i === 0 ? ['Kubernetes', 'Rust', 'Python'] : e.tech,
  })),
  skills: { backend: ['Go', 'Python'], frontend: [], ai_devops: [], databases: [] },
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
a.ok(dropped.includes('Kubernetes') && dropped.includes('Rust'), 'la tech inventada se reporta')
a.ok(!JSON.stringify(data).includes('Kubernetes'), 'Kubernetes no llega al CV')
a.deepEqual(data.education, dataEN.education, 'los estudios no se tocan')
a.deepEqual(data.certifications, dataEN.certifications, 'las certificaciones no se tocan')
a.deepEqual(data.contact, dataEN.contact, 'el contacto no se toca')
a.equal(data.skills.backend.length, dataEN.skills.backend.length, 'skills se reordenan, no se pierden')
a.deepEqual([...data.skills.backend].sort(), [...dataEN.skills.backend].sort(), 'mismas skills')
// El modelo pidió "Python" a secas; se reordena, pero conserva TU matiz.
a.equal(data.skills.backend[0], 'Python (Expert)', 'lo pedido va primero, con el string del CV')
a.ok(dropped.includes('Go'), 'Go no está en tu CV: bloqueado')

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
const cartaMentirosa = 'I have shipped production Kubernetes clusters and built RAG systems in Python.'
const invCarta = findInventions(dataEN, ['No experience with Kubernetes.'], cartaMentirosa)
a.deepEqual(invCarta, ['Kubernetes'], 'la carta que se contradice con sus gaps se caza igual')
a.deepEqual(findInventions(dataEN, ['No Kubernetes.'], 'Built RAG systems in Python at WeAi.'), [],
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
  for (const k of ['VERCEL', 'TAILOR_PASSWORD', 'NVIDIA_API_KEY']) delete process.env[k]
  Object.assign(process.env, env)
  const res = { code: 0, body: null }
  res.status = (c) => { res.code = c; return res }
  res.json = (d) => { res.body = d; return res }
  await h({ method: 'POST', headers, body: { text: 'x'.repeat(500), lang: 'en' } }, res)
  return res
}
const PW = { VERCEL: '1', TAILOR_PASSWORD: 's3cr3t' }
a.equal((await call(handler, { VERCEL: '1' })).code, 500, 'prod sin TAILOR_PASSWORD: cerrado a todos')
a.equal((await call(handler, PW)).code, 401, 'prod sin enviar contraseña: 401')
a.equal((await call(handler, PW, { 'x-tailor-key': 'mala' })).code, 401, 'contraseña incorrecta: 401')
// 500 = pasó la puerta y murió por falta de API key, que es lo que se comprueba.
a.equal((await call(handler, PW, { 'x-tailor-key': 's3cr3t' })).code, 500, 'contraseña correcta: pasa')
a.equal((await call(handler, {})).code, 500, 'en local sin nada configurado: pasa')

// /api/feed pasa needsKey=false porque no llama al modelo. Eso NO puede
// ablandar la contraseña: sigue siendo una URL pública que sale a la red.
a.equal((await call(feed, { VERCEL: '1' })).code, 500, 'feed en prod sin TAILOR_PASSWORD: cerrado')
a.equal((await call(feed, PW)).code, 401, 'feed en prod sin contraseña: 401')
a.equal((await call(feed, PW, { 'x-tailor-key': 'mala' })).code, 401, 'feed con contraseña incorrecta: 401')

console.log(`ok — ${dropped.length} inventos bloqueados (${dropped.join(', ')}); puerta cerrada en prod`)
