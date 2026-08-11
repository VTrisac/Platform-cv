// CLI del feed de ofertas. El motor vive en api/feed.js (que sí se despliega);
// aquí queda solo lo que es de terminal: la tabla markdown, la validación de
// tokens y el cruce con tus notas de ofertas/, que es un directorio local.
//
//   node scripts/feed.js              -> ofertas de España/remoto, ordenadas
//   node scripts/feed.js --all        -> sin filtro de ubicación
//   node scripts/feed.js --check      -> valida los tokens de COMPANIES
//   node scripts/feed.js --selftest   -> comprueba la lógica de matching
import { strict as a } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { COMPANIES, UBICACION, board, buscar, keywords, match } from '../api/feed.js'

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
  const zona = new RegExp(UBICACION, 'i')
  a.ok(zona.test('Barcelona, Spain') && !zona.test('San Francisco, CA'))
  console.log(`ok — ${keywords.length} keywords del CV`)
}

// --- main ------------------------------------------------------------------
const flags = process.argv.slice(2)

if (flags.includes('--selftest')) {
  selftest()
} else if (flags.includes('--check')) {
  for (const b of await Promise.all(COMPANIES.map(board))) {
    const roto = b.error || b.jobs.length === 0
    console.log(`${roto ? '✗' : '✓'}  ${b.name.padEnd(14)} ${b.ats}/${b.token}  ${b.error ?? `${b.jobs.length} ofertas`}`)
  }
} else {
  // --all: regex vacía, casa con cualquier ubicación (incluso sin ubicación).
  const { jobs, total, dead } = await buscar(flags.includes('--all') ? { ubicacion: '(?:)' } : {})
  const seen = alreadySeen()

  console.log(`# Feed — ${jobs.length} ofertas (${total - jobs.length} descartadas con pocas coincidencias)\n`)
  console.log('| # | Empresa | Puesto | Ubicación | Match |')
  console.log('|---|---------|--------|-----------|-------|')
  for (const r of jobs) {
    const mark = seen.includes(r.company.toLowerCase()) ? ' ·visto' : ''
    console.log(`| ${r.hits.length} | ${r.company}${mark} | [${cell(r.title)}](${r.url}) | ${cell(r.location)} | ${r.hits.slice(0, 8).join(', ')} |`)
  }

  if (dead.length) console.error(`\n⚠ sin resultados (token o ATS cambiado): ${dead.map((d) => d.name).join(', ')}`)
}
