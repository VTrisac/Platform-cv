// Audita un PDF del CV como lo haría un ATS: extrae el texto con pdfminer (el
// mismo motor que hay debajo de la mayoría de parsers) y comprueba que lo que
// dice src/data.js sobrevive a la extracción.
//
//   node scripts/ats.js CV_ATS_EN.pdf                    -> salud del PDF
//   node scripts/ats.js CV_ATS_EN.pdf ofertas/x.md       -> + cobertura oferta
//   node scripts/ats.js --selftest                       -> valida los detectores
//
// No mide "puntuación ATS": eso no existe como número universal, cada sistema
// filtra distinto. Mide lo único objetivo y lo que de verdad te tumbaba: que el
// texto se pueda extraer, que las fechas se puedan parsear y que tus keywords
// aparezcan como palabras sueltas.
import { strict as a } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dataES, dataEN } from '../src/data.js'
import { match } from './feed.js'

// --- extracción ------------------------------------------------------------
// ponytail: pdfminer via el venv en vez de una lib npm. Es el parser que usan
// los ATS en Python; una lib JS daría un resultado que no es el que ellos ven.
const extract = (pdf) => execFileSync('.venv/bin/python', [
  '-c', 'import sys;from pdfminer.high_level import extract_text;print(extract_text(sys.argv[1]))', pdf,
], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })

// --- detectores -------------------------------------------------------------
const MONTH = '(?:ene|jan|feb|mar|abr|apr|may|jun|jul|ago|aug|sept?|oct|nov|dic|dec)'
export const findDates = (t) =>
  t.match(new RegExp(`\\b${MONTH}\\.?\\s+\\d{4}\\s*[-–—]\\s*(?:${MONTH}\\.?\\s+\\d{4}|present|actualidad)`, 'gi')) ?? []

// "F E B .  2 0 2 6": letter-spacing convertido en espacios reales. Mata el
// parseo de fechas, que es de lo primero que mira un ATS.
export const findSpacedOut = (t) => t.match(/(?:\S[ \t]+){6,}\S/g) ?? []

// Todo string que data.js promete y debe poder leerse como palabra completa.
export const expected = (d) => [...new Set([
  ...d.experience.flatMap((e) => [e.project, e.role, ...e.tech]),
  ...Object.values(d.skills).flat(),
  ...d.education.map((e) => e.degree),
  d.contact.email, d.contact.phone,
].map((s) => s.replace(/\s*\(.*?\)/g, '').trim()).filter(Boolean))]

// --- selftest ---------------------------------------------------------------
function selftest() {
  a.equal(findDates('WeAi | Feb. 2026 - Present').length, 1)
  a.equal(findDates('Abr. 2024 - Sept. 2024').length, 1, 'meses ES con punto')
  a.equal(findDates('Feb. 2025 - May 2025').length, 1, 'mes sin punto')
  a.equal(findDates('Jul. 2024 - Nov. 2024').length, 1)
  a.equal(findDates('F E B .   2 0 2 6   -   P R E S E N T').length, 0, 'letter-spacing NO debe parsear')
  a.ok(findSpacedOut('F E B .   2 0 2 6').length > 0, 'debe detectar el letter-spacing')
  a.ok(findSpacedOut('P R E S E N T').length > 0, 'un solo espacio tambien')
  a.equal(findSpacedOut('Senior AI Engineer at WeAi').length, 0, 'texto normal no es letter-spacing')
  a.equal(findSpacedOut('Python, FastAPI, Django, Node.js, React, Vue').length, 0, 'listas no son letter-spacing')
  a.ok(expected(dataEN).includes('Python'), 'expected sale de data.js')
  a.ok(!expected(dataEN).some((s) => s.includes('(')), 'parentesis limpiados')
  a.ok(expected(dataEN).includes('WeAi'))
  console.log(`ok — ${expected(dataEN).length} strings esperados en el PDF`)
}

// --- main -------------------------------------------------------------------
const [arg1, arg2] = process.argv.slice(2)

if (arg1 === '--selftest') {
  selftest()
} else if (!arg1) {
  console.error('uso: node scripts/ats.js <cv.pdf> [oferta.md]\n      node scripts/ats.js --selftest')
  process.exit(1)
} else {
  const text = extract(arg1)
  const data = /PERFIL PROFESIONAL|Experiencia Profesional/i.test(text) ? dataES : dataEN
  const problems = []

  console.log(`# ATS check — ${arg1}\n`)

  // 1. ¿Hay texto? Un PDF de imagen extrae ~nada y es rechazo automático.
  console.log(`Texto extraído: ${text.trim().length} caracteres`)
  if (text.trim().length < 1200) problems.push('Muy poco texto: ¿el PDF es una imagen o tiene la fuente rota?')

  // 2. Fechas
  const dates = findDates(text)
  const jobs = data.experience.length
  console.log(`Fechas parseables: ${dates.length} (${jobs} puestos + ${data.education.length} estudios en data.js)`)
  for (const d of dates) console.log(`   · ${d}`)
  if (dates.length < jobs) problems.push(`Solo ${dates.length} de ${jobs} puestos tienen fecha legible: el ATS no puede calcular tu antigüedad`)

  // 3. Letter-spacing
  const spaced = findSpacedOut(text)
  if (spaced.length) {
    console.log(`\nTexto con letter-spacing (ilegible para el parser): ${spaced.length}`)
    for (const s of spaced.slice(0, 5)) console.log(`   · ${JSON.stringify(s.slice(0, 50))}`)
    problems.push(`${spaced.length} fragmentos rotos por letter-spacing (quita las clases tracking-*)`)
  }

  // 4. ¿Sobrevive todo lo que promete data.js?
  const want = expected(data)
  const missing = want.filter((k) => match(text, [k]).length === 0)
  console.log(`\nStrings de data.js legibles en el PDF: ${want.length - missing.length}/${want.length}`)
  if (missing.length) {
    console.log(`   FALTAN: ${missing.join(', ')}`)
    problems.push(`${missing.length} términos del CV no se extraen como palabra suelta`)
  }

  // 5. Cobertura contra una oferta concreta
  if (arg2) {
    const offer = readFileSync(arg2, 'utf8')
    const relevant = match(offer)                       // lo que la oferta pide Y tú tienes
    const covered = relevant.filter((k) => match(text, [k]).length > 0)
    const pct = relevant.length ? Math.round((covered.length / relevant.length) * 100) : 0
    console.log(`\n## Cobertura vs ${arg2}`)
    console.log(`Keywords de tu CV que la oferta menciona: ${relevant.length}`)
    console.log(`De esas, legibles en el PDF: ${covered.length}/${relevant.length} (${pct}%)`)
    console.log(`   ${covered.join(', ')}`)
    const lost = relevant.filter((k) => !covered.includes(k))
    if (lost.length) problems.push(`La oferta pide ${lost.join(', ')} y lo tienes, pero el PDF no lo expone: ${lost.join(', ')}`)
    console.log(`\n(los términos que la oferta pide y NO tienes no salen aquí: eso es criterio, lo revisa /tailor-cv)`)
  }

  console.log(problems.length ? `\n⚠ ${problems.length} problemas:` : '\n✓ Sin problemas de parseo')
  for (const p of problems) console.log(`   - ${p}`)
  process.exitCode = problems.length ? 1 : 0
}
