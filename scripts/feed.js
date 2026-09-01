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
import { ATS, COMPANIES, UBICACION, VOCABULARIO, board, buscar, deduplicar, desdeHace, detalle, filtrar, iso, keywords, match, notaDe, salarioDe } from '../api/feed.js'

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
async function selftest() {
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
  // En la oferta ajena solo va tech que NUNCA vas a tener (Ruby, Rails). Llevaba
  // AWS y Kubernetes, y el día que Kubernetes entró en data.js (645e356) la nota
  // subió a 6 y el test se cayó solo, sin que nada estuviera roto.
  const rails = notaDe('We work with Ruby on Rails, PostgreSQL and Docker')
  const tuyo = notaDe('We work with Python, FastAPI, PostgreSQL, Docker and React')
  a.ok(tuyo.nota > rails.nota, `tu stack (${tuyo.nota}) debe puntuar más que uno ajeno (${rails.nota})`)
  a.equal(tuyo.nota, 10, 'cubrir las 5 que pide es un 10')
  a.ok(rails.nota <= 5, 'cubrir 2 de 4 no llega al aprobado')
  a.ok(rails.stack.includes('Ruby'), 'otro oficio SÍ entra en el denominador')
  a.ok(!rails.hits.includes('Ruby'), 'hits sigue siendo solo lo tuyo')

  // --- lo vecino no puede restar: era lo que vaciaba el feed ---------------
  // Medido el 28-08-2026: 113 de 182 ofertas técnicas reales se descartaban
  // porque AWS, Kubernetes y PyTorch contaban como puntos EN CONTRA.
  const ia = notaDe('Senior AI Engineer. Build LLM agents with Python, LangChain '
    + 'and RAG, deploy on AWS with Kubernetes, fine-tune models in PyTorch.')
  a.equal(ia.nota, 10, 'tu puesto ideal sacaba un 4 y se tiraba; ahora es un 10')
  // Invariantes, no una lista de nombres: la lista caduca cada vez que una
  // vecina entra en data.js. Kubernetes la rompió en 645e356 y AWS otra vez hoy.
  a.ok(ia.falta.includes('PyTorch'), 'lo vecino que NO tienes se enseña')
  a.ok(!ia.falta.some((t) => ia.hits.includes(t)), 'nada puede faltarte y cubrirte a la vez')
  a.ok(!ia.stack.some((t) => ia.falta.includes(t)), 'lo vecino no entra en el denominador')
  // Dos coincidencias con suelo 4 son un 5, no un 10: el suelo sigue impidiendo
  // el aprobado alto por una mención suelta. Lo que importa es que antes era 0,
  // porque ni "LLM" ni "prompt engineering" estaban en el vocabulario.
  a.equal(notaDe('You will build LLM agents with prompt engineering').nota, 5,
    'una oferta que habla de tu trabajo con otras palabras sacaba un 0')

  // --- 'Go' casaba con el verbo inglés en 32 ofertas técnicas --------------
  for (const t of ['we go beyond', 'Go-to-market strategy', 'ready to go?', 'GO LIVE']) {
    a.deepEqual(match(t, VOCABULARIO), [], `"${t}" no nombra ninguna tecnología`)
  }
  a.deepEqual(match('Experience with Golang', VOCABULARIO), ['Golang'], 'el caso real sí')
  a.deepEqual(match('push to GitHub', ['Git']), [], 'Git != GitHub')

  // El suelo del denominador: sin él, una mención suelta daría un 10 vacío.
  a.equal(notaDe('We use Python').nota, 3, 'una sola coincidencia no es un 10')
  a.equal(notaDe('Python and Docker').nota, 5, 'dos de dos, con suelo 4, es un 5')
  a.equal(notaDe('We build spreadsheets').nota, 0, 'nada tuyo es un 0')

  // --- deduplicado: la misma oferta llega por varias búsquedas y páginas ----
  const liA = { url: 'https://es.linkedin.com/jobs/view/ai-engineer-at-acme-4451911121', title: 'AI Engineer' }
  const liB = { url: 'https://www.linkedin.com/jobs/view/4451911121', title: 'AI Engineer' } // mismo id, otra URL
  const otra = { url: 'https://es.linkedin.com/jobs/view/backend-at-acme-4400000000', title: 'Backend' }
  const dedup = deduplicar([liA, liB, otra, { ...otra }])
  a.equal(dedup.length, 2, 'mismo id de LinkedIn = una sola, aunque cambie la URL o la búsqueda')
  a.equal(deduplicar([{ url: 'https://boards.greenhouse.io/x/jobs/1' }, { url: 'https://boards.greenhouse.io/x/jobs/1' }]).length, 1,
    'los tableros se deduplican por URL')
  a.ok(notaDe('Python, FastAPI, Django, Docker, PostgreSQL, React, TypeScript').nota === 10,
    'siete tuyas y ninguna ajena: 10')

  // --- filtrar: qué descarta de verdad y qué solo avisa --------------------
  // Solo tres cosas descartan, y son las inequívocas que escribes tú: dónde,
  // desde cuándo y qué palabra no quieres en el título. Todo lo demás anota.
  const hoy = new Date('2026-08-12T12:00:00Z')
  const oferta = (p) => ({ title: 'Backend Engineer', location: 'Barcelona', fecha: '2026-08-12', text: 'Python and Docker', ...p })
  const solo = (jobs, crit) => filtrar(jobs, { hoy, ...crit })
  const una = (jobs, crit) => solo(jobs, crit).pasan[0]

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

  // --- lo que ANTES descartaba y ahora solo avisa --------------------------
  // Este bloque es la corrección del 28-08-2026. Cada uno de estos criterios
  // tiraba ofertas por su cuenta y todos juntos eran un AND: "remoto" tiraba
  // 388 de 534 ofertas reales, "sin salario" 392, y Python+JavaScript dejaba 6.
  const noTira = (crit, aviso, texto = 'Python and Docker') => {
    const r = solo([oferta({ text: texto })], crit)
    a.equal(r.pasan.length, 1, `${aviso}: la oferta tiene que seguir estando`)
    a.deepEqual(r.descartes, {}, `${aviso}: nada se descarta por esto`)
    a.ok(r.pasan[0].avisos.includes(aviso), `${aviso}: pero se avisa`)
    a.equal(r.pasan[0].cumple.ok, 0, `${aviso}: y cuenta como criterio incumplido`)
  }
  noTira({ modalidades: ['hibrido'] }, 'no dice la modalidad')
  noTira({ modalidades: ['hibrido'] }, 'no dice la modalidad', 'Python fully on-site')
  noTira({ lenguajes: ['Go'] }, 'no menciona Go')
  noTira({ ia: 'con' }, 'sin IA')
  noTira({ ia: 'sin' }, 'con IA', 'Python with LLM agents')
  noTira({ exigirSalario: true }, 'sin salario publicado')
  noTira({ salarioMin: 50000 }, 'paga 45k', 'Python Docker, salary €45.000')

  // Y cuando SÍ cumple, ni aviso ni penalización.
  const cumple = una([oferta({ text: 'Python remote-first with LLM agents, salary €60.000' })],
    { modalidades: ['hibrido', 'remoto'], ia: 'con', salarioMin: 50000, lenguajes: ['Python'] })
  a.deepEqual(cumple.avisos, [], 'cumplirlo todo no deja avisos')
  a.deepEqual(cumple.cumple, { ok: 4, de: 4 }, 'los cuatro criterios contados')
  a.equal(cumple.salario, 60000)

  // Los lenguajes se cuentan uno a uno, no todo-o-nada: con `every` cumplir dos
  // de tres valía lo mismo que cumplir cero, y eso ordena mal.
  const dosDeTres = una([oferta({ text: 'Python, TypeScript and Docker' })], { lenguajes: ['Python', 'TypeScript', 'Java'] })
  a.deepEqual(dosDeTres.cumple, { ok: 2, de: 3 })
  a.deepEqual(dosDeTres.avisos, ['no menciona Java'])

  // El orden hace el trabajo que antes hacía el descarte.
  const ordenadas = solo([
    oferta({ title: 'no cumple', text: 'Python and Docker' }),
    oferta({ title: 'cumple', text: 'Python and Docker, fully remote' }),
  ], { modalidades: ['remoto'] }).pasan
  a.equal(ordenadas.length, 2, 'las dos siguen ahí')
  a.equal(ordenadas[0].title, 'cumple', 'la que cumple tus criterios va primero')

  a.equal(una([oferta({ text: 'We build spreadsheets' })], {}).nota, 0,
    'una oferta que no es lo tuyo entra igual, pero con un 0 y al fondo')
  a.ok(!('text' in una([oferta({})], {})), 'el texto crudo no viaja al cliente')

  // A igual cumplimiento manda la nota, y a igual nota las coincidencias.
  const porNota = solo([
    oferta({ title: 'A', text: 'Python, Docker, SQL, Java, React, Ruby, Rails, PHP, Scala, Perl' }),
    oferta({ title: 'B', text: 'Python, FastAPI, Django, Docker' }),
  ], {}).pasan
  a.equal(porNota[0].title, 'B', 'cubrir todo lo que piden gana a coincidir mucho en una oferta larga')

  // --- Workday: no da fecha, da "hace cuánto" ------------------------------
  // Sin traducirlo, filtrarCabecera tira TODAS sus ofertas por "fuera de la
  // ventana" y la fuente parece muerta cuando lo que falta es la fecha.
  const ayer = new Date('2026-08-19T12:00:00Z')
  a.equal(desdeHace('Posted Today', ayer), '2026-08-19')
  a.equal(desdeHace('Posted Yesterday', ayer), '2026-08-18')
  a.equal(desdeHace('Posted 5 Days Ago', ayer), '2026-08-14')
  a.equal(desdeHace('Posted 30+ Days Ago', ayer), '2026-07-20')
  a.equal(desdeHace('la semana pasada', ayer), null, 'lo que no reconoce no se inventa')
  a.equal(desdeHace(null, ayer), null)

  // --- Workday: la URL de la oferta se compone con el inquilino del token ---
  const wd = ATS.workday.jobs(
    { jobPostings: [{ title: 'AI Engineer', externalPath: '/job/Barcelona/AI-Engineer_REQ-1', locationsText: 'Barcelona', postedOn: 'Posted Today' }] },
    'novartis|wd3|Novartis_Careers|Barcelona'
  )
  a.equal(wd[0].url, 'https://novartis.wd3.myworkdayjobs.com/Novartis_Careers/job/Barcelona/AI-Engineer_REQ-1')
  a.equal(wd[0].location, 'Barcelona')
  a.ok(wd[0].pendiente, 'la tarjeta no trae descripción: la baja detalle()')
  a.ok(ATS.workday.url('novartis|wd3|Novartis_Careers|x').endsWith('/wday/cxs/novartis/Novartis_Careers/jobs'))
  a.equal(JSON.parse(ATS.workday.init('a|b|c|Barcelona', {}, 2).body).offset, 40, 'paginación de 20 en 20')
  a.equal(JSON.parse(ATS.workday.init('a|b|c|Barcelona', {}, 0).body).searchText, 'Barcelona')

  // --- Amazon: la descripción viene ya en el listado ------------------------
  const amz = ATS.amazon.jobs({ jobs: [{ title: 'ML Engineer', job_path: '/en/jobs/1/ml', normalized_location: 'Barcelona, Catalonia, ESP', posted_date: 'July 27, 2026' }] })
  a.equal(amz[0].url, 'https://www.amazon.jobs/en/jobs/1/ml')
  a.equal(amz[0].fecha, '2026-07-27', 'su fecha viene en inglés y con nombre de mes')
  a.equal(amz[0].company, 'Amazon')
  a.ok(!amz[0].pendiente, 'no hace falta bajar el detalle')
  // country=ESP a secas NO filtra; es la pareja loc_query+country la que sirve.
  a.ok(ATS.amazon.url('ai engineer|Spain').includes('loc_query=Spain'))
  a.ok(ATS.amazon.url('ai engineer|Spain').includes('country=ESP'))

  // --- RemoteOK: puntúa por lo que dice, no por sus etiquetas de relleno ---
  // Colgaba 49 tags de SEO en cada oferta; un técnico de mantenimiento de
  // aviones venía con react, python, docker y typescript, y sacaba un 8/10.
  const rok = ATS.remoteok.jobs([
    { legal: 'el primer elemento es el aviso legal, no una oferta' },
    {
      position: 'Aviation Maintenance Technician', company: 'FedEx',
      url: 'https://remoteok.com/remote-jobs/x', location: 'Seoul',
      description: 'Routine and non-routine maintenance to FedEx aircraft.',
      tags: ['react', 'python', 'docker', 'typescript', 'golang'],
      date: '2026-08-14T06:16:08+00:00',
    },
    {
      position: 'Backend Engineer', company: 'Acme', url: 'https://remoteok.com/remote-jobs/y',
      location: '', description: 'You will build APIs in Python with FastAPI, Docker and PostgreSQL.',
      tags: ['sales', 'marketing'], date: '2026-08-14T06:16:08+00:00',
    },
  ])
  a.equal(rok.length, 2, 'el aviso legal se cae solo al exigir `position`')
  a.equal(notaDe(rok[0].text).nota, 0, 'sus tags no pueden puntuar: la oferta no habla de eso')
  a.ok(!/react|typescript|golang/i.test(rok[0].text), 'las etiquetas de relleno no entran en el texto')
  a.equal(notaDe(rok[1].text).nota, 10, 'lo que la oferta SÍ dice sigue puntuando')
  a.ok(rok[0].location.startsWith('Remote'), 'todo lo suyo es remoto, aunque su location venga rara')

  // --- el presupuesto de tiempo del detalle --------------------------------
  // Sin él, LinkedIn limitando el ritmo convertía la búsqueda en 53 minutos y
  // Vercel devolvía un 504 con cero ofertas. Con 0 ms no sale a la red siquiera.
  const pend = [{ url: 'https://example.invalid/1', pendiente: true, text: 'tarjeta' }]
  a.equal(await detalle(pend, 3, 0), 1, 'dice cuántas se quedaron sin bajar')
  a.equal(pend[0].text, 'tarjeta', 'y las deja con el texto de su tarjeta')
  a.ok(pend[0].pendiente, 'sin tocar: nadie ha ido a por ellas')

  console.log(`ok — ${keywords.length} keywords del CV; nota, filtros, fechas y las fuentes nuevas verificados`)
}

// --- main ------------------------------------------------------------------
const flags = process.argv.slice(2)
const valor = (f) => flags[flags.indexOf(f) + 1]

if (flags.includes('--selftest')) {
  await selftest()
} else if (flags.includes('--check')) {
  for (const b of await Promise.all(COMPANIES.map((c) => board(c, { ventana: 'semana' })))) {
    const roto = b.error || b.jobs.length === 0
    console.log(`${roto ? '✗' : '✓'}  ${b.name.padEnd(22)} ${b.ats}/${b.token.slice(0, 30)}  ${b.error ?? `${b.jobs.length} ofertas`}`)
  }
} else {
  const ventana = flags.includes('--desde') ? valor('--desde') : 'todo'
  // --all: regex vacía, casa con cualquier ubicación (incluso sin ubicación).
  const { jobs, total, descartes, dead, parcial } = await buscar({
    ventana,
    ...(flags.includes('--all') ? { ubicacion: '(?:)' } : {}),
  })
  const seen = alreadySeen()
  const motivos = Object.entries(descartes).map(([m, n]) => `${n} ${m}`).join(', ')

  console.log(`# Feed — ${jobs.length} de ${total} ofertas${ventana !== 'todo' ? ` (ventana: ${ventana})` : ''}`)
  console.log(motivos ? `\nDescartadas: ${motivos}.\n` : '')
  console.log('| Cumple | Encaje | Fecha | Empresa | Puesto | Ubicación | € | Cubres | Avisos |')
  console.log('|--------|--------|-------|---------|--------|-----------|---|--------|--------|')
  for (const r of jobs) {
    const mark = seen.includes(r.company.toLowerCase()) ? ' ·visto' : ''
    console.log(`| ${r.cumple.de ? `${r.cumple.ok}/${r.cumple.de}` : '—'} `
      + `| ${r.nota}/10 | ${r.fecha ?? '—'} | ${cell(r.company)}${mark} | [${cell(r.title)}](${r.url}) `
      + `| ${cell(r.location)} | ${r.salario ? `${Math.round(r.salario / 1000)}k` : '—'} `
      + `| ${r.hits.length}/${r.stack.length}: ${r.hits.slice(0, 5).join(', ')} `
      + `| ${cell(r.avisos.join(', ')) || '—'} |`)
  }

  // El presupuesto de tiempo del detalle. Callarlo sería volver a descartar en
  // silencio: estas ofertas puntúan con el texto de su tarjeta, no con la
  // descripción, así que su nota es peor de lo que les toca.
  if (parcial) console.error(`\n⚠ ${parcial} ofertas sin descripción: se agotó el presupuesto de tiempo. Vuelve a lanzarlo.`)
  if (dead.length) console.error(`\n⚠ sin resultados (token o ATS cambiado): ${dead.map((d) => d.name).join(', ')}`)
}
