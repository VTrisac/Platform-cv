import { useState, Suspense, lazy } from 'react'
import { ArrowLeft, Copy, FileDown, Loader2, Mail, Save, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { dataES, dataEN } from '../data'
import Auditoria from './Auditoria'
import { apiPost, auditar as auditarOferta } from './api'

const DESIGNS = [
  { id: 5, name: 'ATS', load: () => import('../designs/Design6ATS') },
  { id: 0, name: 'Minimalista', load: () => import('../designs/Design1Minimal') },
  { id: 3, name: 'Tarjetas', load: () => import('../designs/Design4Cards') },
]
const components = DESIGNS.map((d) => lazy(d.load))

const Card = ({ title, children, right }) => (
  <div
    className="rounded-[20px] border p-5 flex flex-col gap-2.5"
    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.3px' }}>
        {title}
      </span>
      {right}
    </div>
    {children}
  </div>
)

const field = {
  background: 'var(--s-bg)', border: '1px solid var(--s-border)', borderRadius: 10,
  padding: '9px 12px', outline: 'none', width: '100%', fontSize: 13,
}

const PASOS = [
  ['oferta', 'Auditar oferta'],
  ['auditoria', 'Ver encaje'],
  ['cv', 'Adaptar CV'],
]

// Flujo en tres pasos: auditar la oferta -> decidir si hay encaje -> adaptar.
// El orden importa: adaptar primero gastaba una llamada al modelo incluso en
// ofertas que no valían la pena, y enterraba los gaps DESPUÉS de haber decidido.
const Editor = ({ oferta, urlInicial, onBack, onGuardar, onDescartar, onAuditada, onCarta }) => {
  // Si la oferta ya trae auditoría guardada, se entra directo al informe: es
  // el caso normal desde el tracker, y volver a auditar costaría otra llamada.
  const [audit, setAudit] = useState(oferta?.auditoria ?? null)
  const [paso, setPaso] = useState(oferta?.auditoria ? 'auditoria' : 'oferta')
  const [lang, setLang] = useState(oferta?.lang ?? (oferta?.variante?.endsWith('ES') ? 'es' : 'en'))
  const [design, setDesign] = useState(0)
  // Del feed llega la URL ya puesta: la auditoría la scrapea igual que si la
  // hubieras pegado tú, así que no hace falta otro camino para esto.
  const [texto, setTexto] = useState(urlInicial ?? '')
  const [nombre, setNombre] = useState(oferta?.variante ?? '')
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [carta, setCarta] = useState(oferta?.carta ?? null)
  const [cartaInv, setCartaInv] = useState([])
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  const cv = data ?? (lang === 'es' ? dataES : dataEN)
  const Preview = components[design]

  const auditar = async () => {
    if (!texto.trim()) return setError('Pega la URL de la oferta o su texto.')
    setLoading('auditar'); setError(null)
    try {
      const a = await auditarOferta(texto, lang)
      setAudit(a)
      setNombre(`${a.empresa} · ${lang.toUpperCase()}`)
      setPaso('auditoria')
      onAuditada?.(a, lang) // se guarda con la oferta, no se vuelve a pagar
    } catch (e) { setError(e.message) } finally { setLoading(null) }
  }

  const adaptar = async () => {
    setLoading('adaptar'); setError(null)
    try {
      // Se reenvía el texto que ya scrapeó la auditoría: ni se baja dos veces
      // ni se arriesga a que el portal devuelva algo distinto.
      const j = await apiPost('/api/tailor', { text: audit.texto, lang })
      setData(j.data); setMeta(j); setPaso('cv')
    } catch (e) { setError(e.message); setPaso('auditoria') } finally { setLoading(null) }
  }

  // Llamada aparte de la adaptación: no toda oferta merece carta y adaptar ya
  // tarda ~35 s. Se reenvía el mismo texto que scrapeó la auditoría.
  const generarCarta = async () => {
    setLoading('carta'); setError(null)
    try {
      const j = await apiPost('/api/cover', { text: audit.texto, lang })
      setCarta(j.carta)
      setCartaInv(j.inventions ?? [])
      onCarta?.(j.carta)
    } catch (e) { setError(e.message) } finally { setLoading(null) }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} title="Volver"><ArrowLeft size={18} style={{ color: 'var(--s-muted)' }} /></button>
          <h2 className="text-[22px] font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
            {audit ? `${audit.empresa} · ${lang.toUpperCase()}` : oferta?.empresa ?? 'Nueva oferta'}
          </h2>
          {/* Migas de pan: dejan claro que adaptar viene DESPUÉS de decidir */}
          <div className="flex items-center gap-1.5 ml-2">
            {PASOS.map(([id, label], i) => {
              const activo = paso === id
              const hecho = PASOS.findIndex(([p]) => p === paso) > i
              return (
                <span key={id} className="flex items-center gap-1.5">
                  {i > 0 && <span style={{ color: 'var(--s-border)' }}>›</span>}
                  <span
                    className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{
                      background: activo ? 'var(--s-chip-green)' : 'transparent',
                      color: activo ? 'var(--s-accent-dark)' : hecho ? 'var(--s-accent)' : 'var(--s-muted)',
                    }}
                  >
                    {i + 1}. {label}
                  </span>
                </span>
              )
            })}
          </div>
        </div>

        {paso === 'cv' && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border"
              style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
            >
              <FileDown size={15} /> PDF
            </button>
            <button
              onClick={() => onGuardar(nombre)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold"
              style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
            >
              <Save size={15} /> Guardar variante
            </button>
          </div>
        )}
      </div>

      <div className="px-8 pb-8 flex-1 min-h-0 overflow-auto">
        {paso === 'oferta' && (
          <div className="max-w-[720px] flex flex-col gap-4">
            <Card
              title="1. LA OFERTA"
              right={
                <div className="flex rounded-[10px] p-0.5" style={{ background: 'var(--s-bg)', border: '1px solid var(--s-border)' }}>
                  {['es', 'en'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: lang === l ? 'var(--s-accent)' : 'transparent', color: lang === l ? '#FDFBF4' : 'var(--s-muted)' }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              }
            >
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={7}
                placeholder="Pega la URL de la oferta (LinkedIn, Greenhouse…) o su texto completo…"
                style={{ ...field, resize: 'vertical' }}
              />
              <p className="text-xs" style={{ color: 'var(--s-muted)' }}>
                Primero se audita: verás requisito por requisito si encajas, antes de tocar el CV.
              </p>
              <button
                onClick={auditar}
                disabled={loading === 'auditar'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold w-fit disabled:opacity-50"
                style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
              >
                {loading === 'auditar' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {loading === 'auditar' ? 'Auditando…' : 'Auditar oferta'}
              </button>
              {error && (
                <p className="text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
                  <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
                </p>
              )}
            </Card>
          </div>
        )}

        {paso === 'auditoria' && audit && (
          <>
            <Auditoria
              a={audit}
              onAdaptar={adaptar}
              onDescartar={() => { onDescartar?.(audit); onBack() }}
            />
            {loading === 'adaptar' && (
              <p className="mt-4 text-sm flex gap-2" style={{ color: 'var(--s-muted)' }}>
                <Loader2 size={15} className="animate-spin" /> Adaptando el CV…
              </p>
            )}
            {error && (
              <p className="mt-4 text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
                <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
              </p>
            )}
          </>
        )}

        {paso === 'cv' && (
          <div className="flex gap-6 h-full">
            <div className="w-[420px] flex flex-col gap-4 overflow-auto no-print shrink-0">
              {meta && (
                <Card title="RESULTADO">
                  <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-muted)' }}>
                    <ShieldCheck size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--s-accent)' }} />
                    <span><b>Bloqueado:</b> {meta.dropped?.join(', ') || 'nada inventado'}</span>
                  </p>
                  {meta.inventions?.length > 0 && (
                    <p className="text-xs flex gap-1.5 p-2 rounded-lg" style={{ background: '#F9EDEA', color: '#8A4A3C' }}>
                      <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                      <span><b>Revisa el perfil:</b> menciona {meta.inventions.join(', ')}, que no está en tu CV.</span>
                    </p>
                  )}
                  <button
                    onClick={() => setPaso('auditoria')}
                    className="text-xs w-fit underline"
                    style={{ color: 'var(--s-muted)' }}
                  >
                    ← volver al informe de encaje
                  </button>
                </Card>
              )}
              <Card title="PERFIL">
                <textarea
                  value={cv.profile}
                  onChange={(e) => setData({ ...cv, profile: e.target.value })}
                  rows={7}
                  style={{ ...field, resize: 'vertical' }}
                />
              </Card>
              <Card
                title="CARTA DE PRESENTACIÓN"
                right={carta && (
                  <button
                    onClick={() => navigator.clipboard.writeText(carta)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--s-muted)' }}
                    title="Copiar al portapapeles"
                  >
                    <Copy size={13} /> Copiar
                  </button>
                )}
              >
                {carta ? (
                  <>
                    <textarea
                      value={carta}
                      onChange={(e) => { setCarta(e.target.value); onCarta?.(e.target.value) }}
                      rows={12}
                      style={{ ...field, resize: 'vertical' }}
                    />
                    {/* Misma señal que en el CV: la carta es texto libre y no se
                        puede filtrar, solo avisar de lo que se contradice. */}
                    {cartaInv.length > 0 && (
                      <p className="text-xs flex gap-1.5 p-2 rounded-lg" style={{ background: '#F9EDEA', color: '#8A4A3C' }}>
                        <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                        <span><b>Revisa la carta:</b> menciona {cartaInv.join(', ')}, que no está en tu CV.</span>
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    onClick={generarCarta}
                    disabled={loading === 'carta'}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border w-fit disabled:opacity-50"
                    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
                  >
                    {loading === 'carta' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} style={{ color: 'var(--s-accent)' }} />}
                    {loading === 'carta' ? 'Escribiendo…' : 'Generar carta'}
                  </button>
                )}
              </Card>
              <Card title="NOMBRE DE LA VARIANTE">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={field} />
              </Card>
            </div>

            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between no-print">
                <div className="flex gap-2">
                  {DESIGNS.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => setDesign(i)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={{
                        background: design === i ? 'var(--s-accent)' : 'var(--s-surface)',
                        color: design === i ? '#FDFBF4' : 'var(--s-muted)',
                        borderColor: design === i ? 'var(--s-accent)' : 'var(--s-border)',
                      }}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
                  Solo el diseño ATS se sube a un portal
                </span>
              </div>
              <div
                className="flex-1 overflow-auto rounded-[20px] border"
                style={{ background: '#fff', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
              >
                <Suspense fallback={<p className="p-8 text-sm" style={{ color: 'var(--s-muted)' }}>Cargando…</p>}>
                  <Preview data={cv} />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Editor
