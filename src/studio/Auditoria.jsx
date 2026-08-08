import { Check, Minus, X, TriangleAlert, Sparkles, Trash2 } from 'lucide-react'

// Paso 2 del flujo: el listado de encaje. Es la pantalla que decide si merece
// la pena aplicar, así que lo primero que se ve es el veredicto y los
// bloqueantes, no la lista completa.
const ENCAJE = {
  si: { icon: Check, color: '#48603F', bg: '#E3EBDC', label: 'Lo cumples' },
  parcial: { icon: Minus, color: '#8A6D2E', bg: '#F3EAD6', label: 'Parcial' },
  no: { icon: X, color: '#8A4A3C', bg: '#F3E4E1', label: 'No lo cumples' },
}

const Barra = ({ label, pct }) => (
  <div className="flex flex-col gap-1.5 flex-1">
    <div className="flex justify-between text-xs" style={{ color: 'var(--s-muted)' }}>
      <span>{label}</span>
      <span className="font-semibold">{pct === null ? '—' : `${pct}%`}</span>
    </div>
    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EFEADB' }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct ?? 0}%`, background: pct >= 70 ? '#5F7A56' : pct >= 40 ? '#C08A2E' : '#8A4A3C' }}
      />
    </div>
  </div>
)

const Auditoria = ({ a, onAdaptar, onDescartar }) => {
  const rec = {
    aplicar: { txt: 'Aplica', bg: '#E3EBDC', fg: '#48603F' },
    aplicar_con_reservas: { txt: 'Aplica con reservas', bg: '#F3EAD6', fg: '#8A6D2E' },
    descartar: { txt: 'Descártala', bg: '#F3E4E1', fg: '#8A4A3C' },
  }[a.recomendacion] ?? { txt: a.recomendacion, bg: '#EDEDE8', fg: '#6C6F5C' }

  const imprescindibles = a.requisitos.filter((r) => r.tipo === 'imprescindible')
  const valorables = a.requisitos.filter((r) => r.tipo === 'valorable')

  const Lista = ({ titulo, items }) =>
    items.length > 0 && (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.3px' }}>
          {titulo}
        </span>
        {items.map((r, i) => {
          const e = ENCAJE[r.encaje]
          const Icon = e.icon
          return (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-xl border"
              style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: e.bg }}
              >
                <Icon size={12} style={{ color: e.color }} />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium">{r.texto}</span>
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>{r.evidencia}</span>
              </span>
            </div>
          )
        })}
      </div>
    )

  return (
    <div className="flex flex-col gap-5 max-w-[860px]">
      <div
        className="rounded-[20px] border p-5 flex flex-col gap-4"
        style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
              {a.rol}
            </h2>
            <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
              {a.empresa} · {a.ubicacion} · {a.modalidad} · {a.seniority}
            </p>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
            style={{ background: rec.bg, color: rec.fg }}
          >
            {rec.txt}
          </span>
        </div>

        <div className="flex gap-6">
          <Barra label="Imprescindibles" pct={a.encaje.imprescindibles} />
          <Barra label="Valorables" pct={a.encaje.valorables} />
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--s-muted)' }}>{a.veredicto}</p>

        {a.encaje.bloqueantes.length > 0 && (
          <div className="flex gap-2 p-3 rounded-xl text-xs" style={{ background: '#F9EDEA', color: '#8A4A3C' }}>
            <TriangleAlert size={14} className="shrink-0 mt-0.5" />
            <span>
              <b>Bloqueantes:</b> {a.encaje.bloqueantes.join(' · ')}. Son imprescindibles que no cumples;
              adaptar el CV no los va a resolver.
            </span>
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onAdaptar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold"
            style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
          >
            <Sparkles size={15} /> Tengo encaje — adaptar CV
          </button>
          <button
            onClick={onDescartar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold border"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', color: 'var(--s-muted)' }}
          >
            <Trash2 size={15} /> Descartar oferta
          </button>
        </div>
      </div>

      <Lista titulo="IMPRESCINDIBLES" items={imprescindibles} />
      <Lista titulo="VALORABLES" items={valorables} />
    </div>
  )
}

export default Auditoria
