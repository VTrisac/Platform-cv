import { Search, TrendingUp, Sparkles, FileDown, Plus, FileText } from 'lucide-react'
import { ESTADOS, contar } from './store'

// Pantalla "Ofertas — Bento" del diseño: saludo + rejilla de tarjetas con las
// alturas del mockup (180 / 340 / 210). La rejilla es de filas flex, no grid:
// el diseño mezcla anchos fijos (420, 310, 280) con fill.
const Tile = ({ children, w, h, alt, className = '' }) => (
  <div
    className={`rounded-[20px] p-6 flex flex-col ${className}`}
    style={{
      width: w ?? undefined,
      flex: w ? undefined : '1 1 0',
      height: h,
      background: alt ? 'var(--s-chip)' : 'var(--s-surface)',
      border: alt ? 'none' : '1px solid var(--s-border)',
      boxShadow: 'var(--s-shadow)',
    }}
  >
    {children}
  </div>
)

const Label = ({ children }) => (
  <span
    className="text-xs font-semibold"
    style={{ color: 'var(--s-accent-dark)', letterSpacing: '0.8px' }}
  >
    {children}
  </span>
)

const Big = ({ children }) => (
  <span className="text-[56px] leading-none font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
    {children}
  </span>
)

const Bento = ({ ofertas, onNav, onEditar }) => {
  const c = contar(ofertas)
  const conVariante = ofertas.filter((o) => o.variante).length
  const recientes = ofertas.slice(0, 4)

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
            Hola, Víctor
          </h1>
          <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
            {c.enviada} candidaturas vivas · {conVariante} variantes de CV generadas
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] border w-[280px]"
          style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
        >
          <Search size={15} style={{ color: 'var(--s-muted)' }} />
          <input placeholder="Buscar…" className="bg-transparent outline-none text-sm w-full" />
        </div>
      </div>

      <div className="flex gap-4">
        <Tile w={420} h={180} alt className="justify-center gap-1.5">
          <Label>OFERTAS ACTIVAS</Label>
          <Big>{ofertas.length - c.descartada - c.rechazada}</Big>
          <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--s-muted)' }}>
            <TrendingUp size={14} style={{ color: 'var(--s-accent)' }} /> {c.guardada} por revisar
          </span>
        </Tile>
        {[
          ['ENVIADAS', c.enviada],
          ['ENTREVISTAS', c.entrevista],
          ['RECHAZADAS', c.rechazada],
        ].map(([l, n]) => (
          <Tile key={l} h={180} className="justify-center gap-1.5">
            <Label>{l}</Label>
            <Big>{n}</Big>
          </Tile>
        ))}
      </div>

      <div className="flex gap-4">
        <Tile h={340} className="gap-3.5">
          <Label>RECIENTES</Label>
          <div className="flex flex-col">
            {recientes.map((o) => (
              <button
                key={o.id}
                onClick={() => onEditar(o)}
                className="flex items-center justify-between py-2.5 border-b text-left"
                style={{ borderColor: 'var(--s-border)' }}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{o.empresa}</span>
                  <span className="text-xs" style={{ color: 'var(--s-muted)' }}>{o.puesto}</span>
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                  style={{ background: ESTADOS[o.estado].bg, color: ESTADOS[o.estado].fg }}
                >
                  {ESTADOS[o.estado].label}
                </span>
              </button>
            ))}
          </div>
        </Tile>

        <Tile w={310} h={340} className="gap-4">
          <Label>PIPELINE</Label>
          <div className="flex flex-col gap-3">
            {Object.entries(ESTADOS).map(([k, v]) => {
              const n = c[k]
              const pct = ofertas.length ? Math.round((n / ofertas.length) * 100) : 0
              return (
                <div key={k} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--s-muted)' }}>
                    <span>{v.label}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                  {/* Barra proporcional: el diseño evita gráficos que el layout no sostiene */}
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EFEADB' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: v.fg }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Tile>

        <Tile w={280} h={340} alt className="gap-2.5">
          <Label>ACCIONES</Label>
          <button
            onClick={() => onNav('ofertas')}
            className="flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm font-semibold mt-1"
            style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
          >
            <Plus size={15} /> Añadir oferta
          </button>
          <button
            onClick={() => onNav('editor')}
            className="flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm font-semibold border"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
          >
            <Sparkles size={15} style={{ color: 'var(--s-accent)' }} /> Adaptar a una oferta
          </button>
          <button
            onClick={() => onNav('editor')}
            className="flex items-center gap-2 px-4 py-3 rounded-[10px] text-sm font-semibold border"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
          >
            <FileDown size={15} style={{ color: 'var(--s-muted)' }} /> Descargar PDF ATS
          </button>
        </Tile>
      </div>

      <div className="flex gap-4">
        <Tile h={210} className="gap-3.5">
          <Label>VARIANTES DE CV</Label>
          <div className="flex flex-wrap gap-2">
            {ofertas.filter((o) => o.variante).map((o) => (
              <button
                key={o.id}
                onClick={() => onEditar(o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium"
                style={{ background: 'var(--s-chip-green)', color: 'var(--s-accent-dark)' }}
              >
                <FileText size={12} /> {o.variante}
              </button>
            ))}
          </div>
        </Tile>
        <Tile w={420} h={210} className="gap-2.5">
          <Label>CV MAESTRO</Label>
          <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
            Senior AI Engineer · Full Stack Developer
          </p>
          <p className="text-xs" style={{ color: 'var(--s-muted)' }}>
            6 puestos · 10 certificaciones · ES / EN
          </p>
          <button
            onClick={() => onNav('editor')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold border w-fit mt-auto"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
          >
            Abrir editor
          </button>
        </Tile>
      </div>
    </div>
  )
}

export default Bento
