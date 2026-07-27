// Feed de ofertas: consulta los tableros públicos de Greenhouse/Lever/Workable
// de una lista de empresas, puntúa cada oferta por solapamiento con las skills
// del CV (src/data.js) y las ordena. Sin dependencias, sin API keys.
//
//   node scripts/feed.js              -> ofertas de España/remoto, ordenadas
//   node scripts/feed.js --all        -> sin filtro de ubicación
//   node scripts/feed.js --check      -> valida los tokens de COMPANIES
//   node scripts/feed.js --selftest   -> comprueba la lógica de matching
//
// ponytail: el token suele ser el slug de la empresa. Míralo en la URL de su
// página de empleo (boards.greenhouse.io/<token>, jobs.lever.co/<token>,
// <token>.workable.com). Si una empresa cambia de ATS desaparece EN SILENCIO:
// pasa --check cada pocos meses.
import { strict as a } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { dataEN } from '../src/data.js'

// Todos verificados con --check el 27-07-2026.
const COMPANIES = [
  // Barcelona / España
  { name: 'Typeform', ats: 'greenhouse', token: 'typeform' },
  { name: 'Cabify', ats: 'greenhouse', token: 'cabify' },
  { name: 'Amenitiz', ats: 'greenhouse', token: 'amenitiz' },
  { name: 'New Relic', ats: 'greenhouse', token: 'newrelic' },
  { name: 'Jobandtalent', ats: 'lever', token: 'jobandtalent' },
  { name: 'Exoticca', ats: 'workable', token: 'exoticca' },
  // Remoto / AI-first
  { name: 'Anthropic', ats: 'greenhouse', token: 'anthropic' },
  { name: 'Preply', ats: 'ashby', token: 'preply' },
  { name: 'Weaviate', ats: 'ashby', token: 'weaviate' },
  { name: 'Hugging Face', ats: 'workable', token: 'huggingface' },
  { name: 'Qonto', ats: 'lever', token: 'qonto' },
]

const LOCATION_RE = /barcelona|madrid|valencia|spain|españa|remote|emea|europe/i

// --- keywords del CV -------------------------------------------------------
// "Python (Expert)" -> Python | "Java/SpringBoot" -> Java, SpringBoot
// ponytail: >2 caracteres descarta el "CI"/"CD" que salía de partir "CI/CD";
// son universales, no discriminan entre ofertas.
export const keywords = [...new Set(
  [...Object.values(dataEN.skills).flat(), ...dataEN.experience.flatMap((e) => e.tech)]
    .flatMap((s) => s.replace(/\s*\(.*?\)/g, '').split('/'))
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
)]

// Frontera de palabra tolerante con puntos y símbolos: "Java" no debe casar con
// "JavaScript", pero "Node.js" sí dentro de "<p>Node.js</p>".
export const match = (text, terms = keywords) =>
  terms.filter((k) => {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?<![a-z0-9+#.])${esc}(?![a-z0-9+#])`, 'i').test(text)
  })

// --- fetchers --------------------------------------------------------------
// text = el objeto entero serializado: ningún ATS necesita parseo específico.
const ATS = {
  greenhouse: {
    url: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.absolute_url, location: j.location?.name ?? '', text: JSON.stringify(j),
    })),
  },
  lever: {
    url: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    jobs: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      title: j.text, url: j.hostedUrl, location: j.categories?.location ?? '', text: JSON.stringify(j),
    })),
  },
  ashby: {
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.jobUrl, location: j.location ?? '', text: JSON.stringify(j),
    })),
  },
  workable: {
    url: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`,
    jobs: (d) => (d.jobs ?? []).map((j) => ({
      title: j.title, url: j.url ?? j.shortlink, location: [j.city, j.country].filter(Boolean).join(', '), text: JSON.stringify(j),
    })),
  },
}

async function board(c) {
  try {
    const res = await fetch(ATS[c.ats].url(c.token), { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return { ...c, error: `HTTP ${res.status}`, jobs: [] }
    return { ...c, jobs: ATS[c.ats].jobs(await res.json()).map((j) => ({ ...j, company: c.name })) }
  } catch (e) {
    return { ...c, error: e.message, jobs: [] }
  }
}

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
  a.ok(LOCATION_RE.test('Barcelona, Spain') && !LOCATION_RE.test('San Francisco, CA'))
  console.log(`ok — ${keywords.length} keywords del CV`)
}

// --- main ------------------------------------------------------------------
const flags = process.argv.slice(2)
if (flags.includes('--selftest')) {
  selftest()
} else {
  const boards = await Promise.all(COMPANIES.map(board))

  if (flags.includes('--check')) {
    for (const b of boards) console.log(`${b.error || b.jobs.length === 0 ? '✗' : '✓'}  ${b.name.padEnd(14)} ${b.ats}/${b.token}  ${b.error ?? `${b.jobs.length} ofertas`}`)
  } else {
    const seen = alreadySeen()
    const scored = boards
      .flatMap((b) => b.jobs)
      .filter((j) => flags.includes('--all') || LOCATION_RE.test(j.location))
      .map((j) => ({ ...j, hits: match(j.text) }))
      .sort((a, b) => b.hits.length - a.hits.length)
    const rows = scored.filter((r) => r.hits.length >= 2)

    console.log(`# Feed — ${rows.length} ofertas (${scored.length - rows.length} descartadas con <2 coincidencias)\n`)
    console.log('| # | Empresa | Puesto | Ubicación | Match |')
    console.log('|---|---------|--------|-----------|-------|')
    for (const r of rows) {
      const mark = seen.includes(r.company.toLowerCase()) ? ' ·visto' : ''
      console.log(`| ${r.hits.length} | ${r.company}${mark} | [${cell(r.title)}](${r.url}) | ${cell(r.location)} | ${r.hits.slice(0, 8).join(', ')} |`)
    }
  }

  const dead = boards.filter((b) => b.error || b.jobs.length === 0)
  if (dead.length) console.error(`\n⚠ sin resultados (token o ATS cambiado): ${dead.map((b) => b.name).join(', ')}`)
}
