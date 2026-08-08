import { useState, Suspense, lazy } from 'react'
import { ArrowLeft, Sparkles, FileDown, Save, Loader2, TriangleAlert, ShieldCheck, Check } from 'lucide-react'
import { dataES, dataEN } from '../data'

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
  background: 'var(--s-bg)',
  border: '1px solid var(--s-border)',
  borderRadius: 10,
  padding: '9px 12px',
  outline: 'none',
  width: '100%',
  fontSize: 13,
}

// Pantalla "Editor de Variante": columna de edición a 460 px y previsualización
// A4 a la derecha, como en el diseño. La previsualización reutiliza los diseños
// de CV que ya existían: dentro del A4 mandan sus propios temas, no los de Studio.
const Editor = ({ oferta, onBack, onGuardar }) => {
  const [lang, setLang] = useState(oferta?.variante?.endsWith('ES') ? 'es' : 'en')
  const [design, setDesign] = useState(0)
  const [nombre, setNombre] = useState(oferta?.variante ?? `${oferta?.empresa ?? 'Variante'} · ${lang.toUpperCase()}`)
  const [texto, setTexto] = useState('')
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cv = data ?? (lang === 'es' ? dataES : dataEN)
  const Preview = components[design]

  const adaptar = async (retryKey) => {
    if (!texto.trim()) return setError('Pega el texto de la oferta o su URL.')
    setLoading(true); setError(null)
    try {
      const key = retryKey ?? localStorage.getItem('tailorKey') ?? ''
      const esUrl = /^https?:\/\//i.test(texto.trim())
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-tailor-key': key },
        body: JSON.stringify({ [esUrl ? 'url' : 'text']: texto.trim(), lang }),
      })
      const json = await res.json()
      if (res.status === 401) {
        const asked = window.prompt('Contraseña de la app:')
        if (!asked) throw new Error('Hace falta la contraseña.')
        localStorage.setItem('tailorKey', asked)
        setLoading(false)
        return adaptar(asked)
      }
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`)
      setData(json.data)
      setMeta(json)
      if (json.company) setNombre(`${json.company} · ${lang.toUpperCase()}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} title="Volver">
            <ArrowLeft size={18} style={{ color: 'var(--s-muted)' }} />
          </button>
          <h2 className="text-[22px] font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
            {nombre}
          </h2>
          {oferta && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--s-chip-green)', color: 'var(--s-accent-dark)' }}
            >
              {oferta.puesto}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => adaptar()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold disabled:opacity-50"
            style={{ background: 'var(--s-chip)', color: 'var(--s-text)' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Adaptando…' : 'Adaptar con IA'}
          </button>
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
            <Save size={15} /> Guardar
          </button>
        </div>
      </div>

      <div className="flex gap-6 px-8 pb-8 flex-1 min-h-0">
        <div className="w-[460px] flex flex-col gap-4 overflow-auto no-print shrink-0">
          <Card
            title="OFERTA"
            right={
              <div className="flex rounded-[10px] p-0.5" style={{ background: 'var(--s-bg)', border: '1px solid var(--s-border)' }}>
                {['es', 'en'].map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setData(null); setMeta(null) }}
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
              rows={5}
              placeholder="Pega la URL de la oferta o su texto completo…"
              style={{ ...field, resize: 'vertical' }}
            />
            {error && (
              <p className="text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
                <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
              </p>
            )}
          </Card>

          {meta && (
            <Card title="RESULTADO">
              <p className="text-sm font-semibold">{meta.role} · {meta.company}</p>
              <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-muted)' }}>
                <TriangleAlert size={13} className="shrink-0 mt-0.5" style={{ color: '#C08A2E' }} />
                <span><b>Te falta:</b> {meta.gaps?.join(' · ') || '—'}</span>
              </p>
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
            </Card>
          )}

          <Card title="PERFIL">
            <textarea
              value={cv.profile}
              onChange={(e) => setData({ ...cv, profile: e.target.value })}
              rows={6}
              style={{ ...field, resize: 'vertical' }}
            />
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
    </div>
  )
}

export default Editor
