// CLI del feed de ofertas. El motor vive en api/feed.js (que sí se despliega);
// aquí queda solo lo que es de terminal: la tabla markdown, la validación de
// tokens y el cruce con tus notas de ofertas/, que es un directorio local.
//
//   node scripts/feed.js                 -> ofertas de España/remoto, ordenadas
//   node scripts/feed.js --desde 24h     -> solo las últimas 24 horas
//   node scripts/feed.js --desde semana  -> solo la última semana
//   node scripts/feed.js --all           -> sin filtro de ubicación
//   node scripts/feed.js --check         -> valida los tokens de COMPANIES
//   node scripts/feed.js --selftest      -> comprueba la lógica de filtrado
import { strict as a } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { COMPANIES, UBICACION, board, buscar, filtrar, iso, keywords, match, notaDe, salarioDe } from '../api/feed.js'

// Anthropic lista varias sedes separadas por "|": rompería la tabla markdown.
const cell = (s) => (s ?? '').replace(/\|/g, '/').trim()

// --- ya visto: sus notas en ofertas/ ---------------------------------------
function alreadySeen() {
  try {
    const files = readdirSync('ofertas').filter((f) => f.endsWith('.md'))
    return (files.join('\n') + files.map((f) => readFileSync(`ofertas/${f}`, 'utf8')).join('\n')).toLowerCase()
  } catch {
    return ''
  }
}

// --- selftest --------------------------------------------------------------
function selftest() {
  a.deepEqual(match('we use Python daily', ['Python']), ['Python'])
  a.deepEqual(match('very Pythonic code', ['Python']), [], 'sufijo no debe casar')
  a.deepEqual(match('strong JavaScript skills', ['Java']), [], 'Java != JavaScript')
  a.deepEqual(match('<p>Node.js</p>', ['Node.js']), ['Node.js'], 'debe casar dentro de HTML')
  a.deepEqual(match('experience with FASTAPI', ['FastAPI']), ['FastAPI'], 'case-insensitive')
  a.ok(keywords.includes('Python'), 'keywords salen del CV')
  a.ok(!keywords.some((k) => k.includes('(')), 'parentesis limpiados')
  a.ok(!keywords.includes('CI'), 'CI/CD no cuenta como match')
  a.equal(cell('Remote | Madrid'), 'Remote / Madrid', 'las pipes romperian la tabla')
  a.ok(new RegExp(UBICACION, 'i').test('Barcelona, Spain'))

  // --- fechas: cada fuente la da distinta, todas acaban en YYYY-MM-DD ------
  a.equal(iso('2026-08-04T08:54:16-04:00'), '2026-08-04', 'ISO con zona horaria')
  a.equal(iso(1772108232729), '2026-02-26', 'epoch en milisegundos (Lever)')
  a.equal(iso('2026-05-08'), '2026-05-08', 'solo el día (Workable)')
  a.equal(iso(null), null, 'sin fecha no se inventa una')
  a.equal(iso('vete a saber'), null, 'basura no revienta')

  // --- salario: solo cuenta si lleva moneda o "k" -------------------------
  a.equal(salarioDe('salary €45.000 gross'), 45000, 'euros con punto de millar')
  a.equal(salarioDe('€43,600 per year'), 43600, 'euros con coma de millar')
  a.equal(salarioDe('around 40k'), 40000, 'el atajo "40k"')
  a.equal(salarioDe('range 40.000 - 60.000 €'), 60000, 'de un rango se mira el techo')
  a.equal(salarioDe('founded in 2026, 3 projects, Python 3.11'), null,
    'los números que no son dinero no son un sueldo')

  // --- la nota de encaje: proporción de lo que pide la oferta que cubres ---
  // Lo que hace que la nota signifique algo: la oferta de Rails no puede sacar
  // lo mismo que la de Python solo por ser larga.
  const rails = notaDe('We work with Ruby on Rails, PostgreSQL, AWS, Kubernetes and Docker')
  const tuyo = notaDe('We work with Python, FastAPI, PostgreSQL, Docker and React')
  a.ok(tuyo.nota > rails.nota, `tu stack (${tuyo.nota}) debe puntuar más que uno ajeno (${rails.nota})`)
  a.equal(tuyo.nota, 10, 'cubrir las 5 que pide es un 10')
  a.ok(rails.nota <= 5, 'cubrir 2 de 6 no llega al aprobado')
  a.ok(rails.stack.includes('Ruby') && rails.stack.includes('Kubernetes'),
    'el stack incluye lo que NO tienes: es el denominador')
  a.ok(!rails.hits.includes('Ruby'), 'hits sigue siendo solo lo tuyo')

  // El suelo del denominador: sin él, una mención suelta daría un 10 vacío.
  a.equal(notaDe('We use Python').nota, 3, 'una sola coincidencia no es un 10')
  a.equal(notaDe('Python and Docker').nota, 5, 'dos de dos, con suelo 4, es un 5')
  a.equal(notaDe('We build spreadsheets').nota, 0, 'nada tuyo es un 0')
  a.ok(notaDe('Python, FastAPI, Django, Docker, PostgreSQL, React, TypeScript').nota === 10,
    'siete tuyas y ninguna ajena: 10')

  // --- filtrar: cada criterio y su motivo de descarte ----------------------
  const hoy = new Date('2026-08-12T12:00:00Z')
  const oferta = (p) => ({ title: 'Backend Engineer', location: 'Barcelona', fecha: '2026-08-12', text: 'Python and Docker', ...p })
  const solo = (jobs, crit) => filtrar(jobs, { hoy, minNota: 1, ...crit })

  a.equal(solo([oferta({})], {}).pasan.length, 1, 'una oferta normal pasa')
  a.equal(solo([oferta({ location: 'Tokyo' })], {}).descartes['ubicación'], 1)

  a.equal(solo([oferta({ fecha: '2026-08-01' })], { ventana: '24h' }).descartes['fuera de la ventana'], 1,
    'de hace 11 días no entra en 24h')
  a.equal(solo([oferta({ fecha: '2026-08-01' })], { ventana: 'semana' }).descartes['fuera de la ventana'], 1)
  a.equal(solo([oferta({ fecha: '2026-08-08' })], { ventana: 'semana' }).pasan.length, 1, 'de hace 4 días sí')
  a.equal(solo([oferta({ fecha: null })], { ventana: '24h' }).descartes['fuera de la ventana'], 1,
    'sin fecha no se cuela: sería mentir sobre el criterio')
  a.equal(solo([oferta({ fecha: null })], { ventana: 'todo' }).pasan.length, 1, 'sin ventana da igual')

  a.equal(solo([oferta({ title: 'Backend Intern' })], { veto: ['intern'] }).descartes['palabra vetada'], 1)
  a.equal(solo([oferta({ title: 'Internal Tools Engineer' })], { veto: ['intern'] }).descartes['palabra vetada'], 1,
    'el veto casa por prefijo de palabra, a propósito')

  const conSueldo = oferta({ text: 'Python Docker, salary €45.000' })
  a.equal(solo([conSueldo], { salarioMin: 40000 }).pasan.length, 1, '45.000 pasa un mínimo de 40.000')
  a.equal(solo([conSueldo], { salarioMin: 50000 }).descartes['salario bajo'], 1, 'y no uno de 50.000')
  a.equal(solo([oferta({})], { salarioMin: 40000 }).pasan.length, 1, 'sin cifra pasa por defecto')
  a.equal(solo([oferta({})], { salarioMin: 40000, descartarSinSalario: true }).descartes['sin salario publicado'], 1,
    'con el interruptor puesto, sin cifra se descarta')

  a.equal(solo([oferta({ text: 'Python hybrid work' })], { modalidades: ['hibrido'] }).pasan.length, 1)
  a.equal(solo([oferta({ text: 'Python fully on-site' })], { modalidades: ['hibrido'] }).descartes['modalidad'], 1)
  a.equal(solo([oferta({ text: 'Python remote-first' })], { modalidades: ['hibrido', 'remoto'] }).pasan.length, 1,
    'basta con cumplir una de las aceptadas')

  a.equal(solo([oferta({ text: 'Python and Docker' })], { lenguajes: ['Python'] }).pasan.length, 1)
  a.equal(solo([oferta({ text: 'Python and Docker' })], { lenguajes: ['Python', 'Go'] }).descartes['falta lenguaje'], 1,
    'los lenguajes obligatorios se exigen todos')

  a.equal(solo([oferta({ text: 'Python with LLM agents' })], { ia: 'con' }).pasan.length, 1)
  a.equal(solo([oferta({ text: 'Python and Docker' })], { ia: 'con' }).descartes['sin IA'], 1)
  a.equal(solo([oferta({ text: 'Python with LLM agents' })], { ia: 'sin' }).descartes['con IA'], 1)

  a.equal(solo([oferta({ text: 'Python' })], { minNota: 5 }).descartes['encaje bajo'], 1,
    'un 3 no pasa el mínimo de 5')
  a.equal(solo([oferta({ text: 'Python and Docker' })], { minNota: 5 }).pasan.length, 1, 'un 5 sí')
  a.ok(!('text' in (solo([oferta({})], {}).pasan[0])), 'el texto crudo no viaja al cliente')

  // Se ordena por nota, no por número de coincidencias.
  const ordenadas = solo([
    oferta({ title: 'A', text: 'Python, Docker, SQL, Java, React, Ruby, Rails, AWS, Kubernetes, Terraform' }),
    oferta({ title: 'B', text: 'Python, FastAPI, Django, Docker' }),
  ], {}).pasan
  a.equal(ordenadas[0].title, 'B', 'cubrir todo lo que piden gana a coincidir mucho en una oferta larga')

  console.log(`ok — ${keywords.length} keywords del CV; nota, filtros y fechas verificados`)
}

// --- main ------------------------------------------------------------------
const flags = process.argv.slice(2)
const valor = (f) => flags[flags.indexOf(f) + 1]

if (flags.includes('--selftest')) {
  selftest()
} else if (flags.includes('--check')) {
  for (const b of await Promise.all(COMPANIES.map((c) => board(c, { ventana: 'semana' })))) {
    const roto = b.error || b.jobs.length === 0
    console.log(`${roto ? '✗' : '✓'}  ${b.name.padEnd(22)} ${b.ats}/${b.token.slice(0, 30)}  ${b.error ?? `${b.jobs.length} ofertas`}`)
  }
} else {
  const ventana = flags.includes('--desde') ? valor('--desde') : 'todo'
  // --all: regex vacía, casa con cualquier ubicación (incluso sin ubicación).
  const { jobs, total, descartes, dead } = await buscar({
    ventana,
    ...(flags.includes('--all') ? { ubicacion: '(?:)' } : {}),
  })
  const seen = alreadySeen()
  const motivos = Object.entries(descartes).map(([m, n]) => `${n} ${m}`).join(', ')

  console.log(`# Feed — ${jobs.length} de ${total} ofertas${ventana !== 'todo' ? ` (ventana: ${ventana})` : ''}`)
  console.log(motivos ? `\nDescartadas: ${motivos}.\n` : '')
  console.log('| Encaje | Fecha | Empresa | Puesto | Ubicación | € | Cubres |')
  console.log('|--------|-------|---------|--------|-----------|---|--------|')
  for (const r of jobs) {
    const mark = seen.includes(r.company.toLowerCase()) ? ' ·visto' : ''
    console.log(`| ${r.nota}/10 | ${r.fecha ?? '—'} | ${cell(r.company)}${mark} | [${cell(r.title)}](${r.url}) `
      + `| ${cell(r.location)} | ${r.salario ? `${Math.round(r.salario / 1000)}k` : '—'} `
      + `| ${r.hits.length}/${r.stack.length}: ${r.hits.slice(0, 5).join(', ')} |`)
  }

  if (dead.length) console.error(`\n⚠ sin resultados (token o ATS cambiado): ${dead.map((d) => d.name).join(', ')}`)
}
