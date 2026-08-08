import { useState } from 'react'
import { Wand2, Loader2, RotateCcw, AlertTriangle, ShieldCheck, Check } from 'lucide-react'

// Panel de adaptación: pegas la oferta, llama a /api/tailor y enseña el
// resultado. El CV adaptado vive en el estado de App, nunca toca src/data.js:
// para volver al maestro basta con "Restaurar" (o recargar).
const TailorPanel = ({ lang, meta, onTailored, onReset }) => {
  const [mode, setMode] = useState('url')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (retryKey) => {
    if (!value.trim()) return
    setLoading(true); setError(null)
    try {
      const key = retryKey ?? localStorage.getItem('tailorKey') ?? ''
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-tailor-key': key },
        body: JSON.stringify({ [mode]: value.trim(), lang }),
      })
      const json = await res.json()
      // 401: la primera vez (o si cambias la contraseña) la pide y la recuerda.
      if (res.status === 401) {
        const asked = window.prompt('Contraseña de la app:')
        if (!asked) throw new Error('Hace falta la contraseña.')
        localStorage.setItem('tailorKey', asked)
        setLoading(false)
        return run(asked)
      }
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`)
      onTailored(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const Row = ({ icon: Icon, color, label, children }) => (
    <div className="flex gap-2 text-xs">
      <Icon size={14} className={`${color} shrink-0 mt-[2px]`} />
      <div>
        <span className="font-bold">{label}</span>{' '}
        <span className="text-[var(--text-muted)]">{children}</span>
      </div>
    </div>
  )

  return (
    <div className="no-print fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[min(760px,92vw)]
                    bg-[color:var(--surface)]/95 backdrop-blur-sm rounded-2xl shadow-lg
                    border border-[var(--border)] p-4 text-[var(--text)]">
      <div className="flex gap-2 mb-2">
        {['url', 'text'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              mode === m ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                         : 'text-[var(--text-muted)] hover:bg-[var(--surface-alt)]'
            }`}
          >
            {m === 'url' ? 'URL de la oferta' : 'Pegar texto'}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--text-muted)] self-center">CV en {lang.toUpperCase()}</span>
      </div>

      <div className="flex gap-2">
        {mode === 'url' ? (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="https://www.linkedin.com/jobs/view/..."
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-alt)]
                       border border-[var(--border)] outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Pega aquí el texto completo de la oferta…"
            rows={5}
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-alt)]
                       border border-[var(--border)] outline-none focus:border-[var(--accent)] resize-y"
          />
        )}
        <button
          onClick={() => run()} // sin arrow, React pasaría el evento como retryKey
          disabled={loading || !value.trim()}
          className="px-4 py-2 h-fit rounded-lg text-sm font-bold flex items-center gap-2
                     bg-[var(--accent)] text-[var(--accent-contrast)] disabled:opacity-40 transition-all"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {loading ? 'Adaptando…' : 'Adaptar'}
        </button>
      </div>

      {loading && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Puede tardar hasta un minuto: el modelo lee la oferta entera antes de reescribir.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-[2px]" />{error}
        </p>
      )}

      {meta && !loading && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
          <p className="text-sm font-bold">{meta.role} · {meta.company}</p>

          {meta.gaps?.length > 0 ? (
            <Row icon={AlertTriangle} color="text-amber-500" label="Te falta:">
              {meta.gaps.join(' · ')}
            </Row>
          ) : (
            <Row icon={Check} color="text-emerald-500" label="Sin gaps:">
              la oferta no pide nada que no tengas.
            </Row>
          )}

          <Row icon={ShieldCheck} color="text-emerald-500" label="Bloqueado:">
            {meta.dropped?.length
              ? `${meta.dropped.join(', ')} — el modelo lo propuso y no está en tu CV.`
              : 'ninguna tecnología inventada.'}
          </Row>

          {/* El texto libre no se puede bloquear automáticamente: aquí se avisa
              para que lo leas TÚ antes de enviar nada. */}
          {meta.inventions?.length > 0 && (
            <div className="flex gap-2 text-xs rounded-lg bg-red-500/10 border border-red-500/30 p-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-[2px]" />
              <div>
                <span className="font-bold text-red-600">Revisa el perfil antes de enviarlo.</span>{' '}
                <span className="text-[var(--text-muted)]">
                  El texto menciona <b>{meta.inventions.join(', ')}</b>, que no aparece en tu CV maestro.
                  Bórralo o justifícalo: en una entrevista te lo van a preguntar.
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => { onReset(); setValue(''); }}
            className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)] mt-1"
          >
            <RotateCcw size={12} /> Restaurar CV maestro
          </button>
        </div>
      )}
    </div>
  )
}

export default TailorPanel
