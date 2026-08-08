import { useState } from 'react'
import { X, Search, Loader2, TriangleAlert } from 'lucide-react'
import { auditar } from './api'

// Modal de "Nueva oferta": pegas la oferta y ya está. Empresa, puesto,
// ubicación y modalidad salen de la auditoría, no los escribes tú — si el
// scraper ya los tiene, pedírtelos era pasarte trabajo a ti.
// Al terminar se guarda la oferta CON su auditoría, así reabrirla no vuelve a
// gastar una llamada al modelo.
const NuevaOferta = ({ onListo, onCerrar }) => {
  const [texto, setTexto] = useState('')
  const [lang, setLang] = useState('es')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const lanzar = async () => {
    if (!texto.trim()) return setError('Pega la URL de la oferta o su texto.')
    setLoading(true); setError(null)
    try {
      onListo(await auditar(texto, lang), lang)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(36, 38, 28, 0.35)' }}
      onClick={(e) => e.target === e.currentTarget && !loading && onCerrar()}
    >
      <div
        className="w-full max-w-[680px] rounded-[20px] border p-6 flex flex-col gap-4"
        style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: '0 20px 60px rgba(36,38,28,0.2)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
              Nueva oferta
            </h2>
            <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
              Pega la oferta y te digo si encajas. El resto lo saco yo.
            </p>
          </div>
          {!loading && (
            <button onClick={onCerrar} title="Cerrar">
              <X size={18} style={{ color: 'var(--s-muted)' }} />
            </button>
          )}
        </div>

        <textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && lanzar()}
          rows={8}
          placeholder="https://www.linkedin.com/jobs/view/…&#10;&#10;…o pega aquí el texto completo de la oferta."
          disabled={loading}
          style={{
            background: 'var(--s-bg)', border: '1px solid var(--s-border)', borderRadius: 10,
            padding: '12px 14px', outline: 'none', fontSize: 13, resize: 'vertical',
          }}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--s-muted)' }}>CV en</span>
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
          </div>

          <button
            onClick={lanzar}
            disabled={loading || !texto.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold disabled:opacity-50"
            style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? 'Auditando…' : 'Auditar y guardar'}
          </button>
        </div>

        {loading && (
          <p className="text-xs" style={{ color: 'var(--s-muted)' }}>
            Scrapeando y comparando con tu CV requisito por requisito. Tarda entre 30 y 60 segundos.
          </p>
        )}
        {error && (
          <p className="text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
            <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
          </p>
        )}
      </div>
    </div>
  )
}

export default NuevaOferta
