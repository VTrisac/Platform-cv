import { useState } from 'react'
import { X, Search, Layers, TriangleAlert } from 'lucide-react'
import { auditar } from './api'
import Proceso from './Proceso'
import { FASES, partir } from './lote'

// Modal de "Nueva oferta": pegas la oferta y ya está. Empresa, puesto,
// ubicación y modalidad salen de la auditoría, no los escribes tú — si el
// scraper ya los tiene, pedírtelos era pasarte trabajo a ti.
// Al terminar se guarda la oferta CON su auditoría, así reabrirla no vuelve a
// gastar una llamada al modelo.
//
// Acepta varias de golpe: un enlace por línea, o varias ofertas en texto
// separadas por una línea con "---". Con UNA sola el camino es exactamente el de
// siempre —se audita aquí y se entra al editor—; con varias se lanza el lote y
// manda la pantalla de Cola. El caso de todos los días no cambia.
const NuevaOferta = ({ onListo, onLote, onCerrar }) => {
  const [texto, setTexto] = useState('')
  const [lang, setLang] = useState('es')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const entradas = partir(texto)

  const lanzar = async () => {
    if (!entradas.length) return setError('Pega la URL de la oferta o su texto.')
    if (entradas.length > 1) return onLote(entradas, lang)

    setLoading(true); setError(null)
    try {
      onListo(await auditar(entradas[0], lang), lang)
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
          placeholder="https://www.linkedin.com/jobs/view/…&#10;https://boards.greenhouse.io/…&#10;&#10;Un enlace por línea para varias de golpe, o el texto completo de una (varias, separadas por una línea con ---)."
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
                  style={{ background: lang === l ? 'var(--s-accent)' : 'transparent', color: lang === l ? 'var(--s-sobre-acento)' : 'var(--s-muted)' }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={lanzar}
            disabled={loading || !entradas.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold disabled:opacity-50"
            style={{ background: 'var(--s-accent)', color: 'var(--s-sobre-acento)' }}
          >
            {entradas.length > 1 ? <Layers size={15} /> : <Search size={15} />}
            {loading ? 'Auditando…'
              : entradas.length > 1 ? `Preparar las ${entradas.length}`
              : 'Auditar y guardar'}
          </button>
        </div>

        {/* Que veas cuántas ha detectado ANTES de pulsar: una oferta en texto que
            mencione un enlace no son dos ofertas, y conviene poder comprobarlo. */}
        {entradas.length > 1 && !loading && (
          <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-muted)' }}>
            <Layers size={13} className="shrink-0 mt-0.5" />
            {entradas.length} ofertas detectadas. Se auditan de dos en dos y se adaptan solas
            las que tengan encaje; lo verás en la Cola.
          </p>
        )}

        {loading && (
          <Proceso
            pasos={FASES}
            activo="auditar"
            nota="Scrapeando y comparando con tu CV requisito por requisito. Tarda entre 30 y 60 segundos."
          />
        )}
        {error && (
          <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-perdida)' }}>
            <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
          </p>
        )}
      </div>
    </div>
  )
}

export default NuevaOferta
