// Comprueba que applyPatch no deja pasar nada inventado, aunque el modelo lo
// intente. Es el test que importa: el "no inventes" del prompt es una petición,
// esto es la garantía.
//
//   node scripts/tailor-test.js
import { strict as a } from 'node:assert'
import handler, { applyPatch, findInventions, strip } from '../api/tailor.js'
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
const inv = findInventions(dataEN, contradictory)
a.ok(inv.includes('Spec-Driven Development'), 'detecta lo que el propio modelo dijo que faltaba')
a.ok(!inv.includes('Python'), 'Python está en tu CV: no es invención')
a.ok(!inv.includes('RAG'), 'RAG está en tu CV: no es invención')

const honest = { ...evil, profile: 'Senior AI Engineer con Python y FastAPI.', gaps: ['No Ruby on Rails.'] }
a.deepEqual(findInventions(dataEN, honest), [], 'sin contradicción, no avisa')

// --- la puerta del endpoint -------------------------------------------------
// La URL de Vercel es pública y cada llamada gasta créditos: en producción esto
// tiene que fallar CERRADO. 500/401 aquí significan "no ha llegado al modelo".
const call = async (env, headers = {}) => {
  for (const k of ['VERCEL', 'TAILOR_PASSWORD', 'NVIDIA_API_KEY']) delete process.env[k]
  Object.assign(process.env, env)
  const res = { code: 0, body: null }
  res.status = (c) => { res.code = c; return res }
  res.json = (d) => { res.body = d; return res }
  await handler({ method: 'POST', headers, body: { text: 'x'.repeat(500), lang: 'en' } }, res)
  return res
}
const PW = { VERCEL: '1', TAILOR_PASSWORD: 's3cr3t' }
a.equal((await call({ VERCEL: '1' })).code, 500, 'prod sin TAILOR_PASSWORD: cerrado a todos')
a.equal((await call(PW)).code, 401, 'prod sin enviar contraseña: 401')
a.equal((await call(PW, { 'x-tailor-key': 'mala' })).code, 401, 'contraseña incorrecta: 401')
// 500 = pasó la puerta y murió por falta de API key, que es lo que se comprueba.
a.equal((await call(PW, { 'x-tailor-key': 's3cr3t' })).code, 500, 'contraseña correcta: pasa')
a.equal((await call({})).code, 500, 'en local sin nada configurado: pasa')

console.log(`ok — ${dropped.length} inventos bloqueados (${dropped.join(', ')}); puerta cerrada en prod`)
