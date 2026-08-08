import { useState } from 'react'
import { Search, FileDown, Pencil, Sparkles, FileText, Trash2 } from 'lucide-react'
import { ESTADOS } from './store'

// Pantalla "Ofertas — Tracker" del diseño: cabecera con recuento, buscador,
// filtros por estado y tabla. Las columnas replican los anchos del mockup
// (210 / fill / 130 / 170 / 100 / 90).
const Chip = ({ estado }) => {
  const e = ESTADOS[estado] ?? ESTADOS.guardada
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: e.bg, color: e.fg }}>
      {e.label}
    </span>
  )
}

const Ofertas = ({ ofertas, onEditar, onEstado, onBorrar }) => {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState(null)

  const visibles = ofertas.filter(
    (o) =>
      (!filtro || o.estado === filtro) &&
      `${o.empresa} ${o.puesto}`.toLowerCase().includes(q.toLowerCase())
  )

  const resumen = Object.entries(ESTADOS)
    .map(([k, v]) => `${ofertas.filter((o) => o.estado === k).length} ${v.label.toLowerCase()}s`)
    .join(' · ')

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
          Ofertas
        </h1>
        <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
          {ofertas.length} ofertas · {resumen}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] border w-[300px]"
          style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
        >
          <Search size={15} style={{ color: 'var(--s-muted)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa o puesto…"
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          {[null, ...Object.keys(ESTADOS)].map((k) => (
            <button
              key={k ?? 'todas'}
              onClick={() => setFiltro(k)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={{
                background: filtro === k ? 'var(--s-accent)' : 'var(--s-surface)',
                color: filtro === k ? '#FDFBF4' : 'var(--s-muted)',
                borderColor: filtro === k ? 'var(--s-accent)' : 'var(--s-border)',
              }}
            >
              {k ? ESTADOS[k].label : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
      >
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-xs font-semibold"
          style={{ background: '#F5F1E6', color: 'var(--s-muted)', letterSpacing: '0.3px' }}
        >
          <span className="w-[210px]">EMPRESA</span>
          <span className="flex-1">PUESTO</span>
          <span className="w-[130px]">ESTADO</span>
          <span className="w-[170px]">VARIANTE</span>
          <span className="w-[100px]">FECHA</span>
          <span className="w-[90px] text-right">ACCIONES</span>
        </div>

        {visibles.length === 0 && (
          <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--s-muted)' }}>
            Ninguna oferta coincide. Cambia el filtro o añade una nueva.
          </p>
        )}

        {visibles.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-4 px-5 py-3.5 border-t"
            style={{ borderColor: 'var(--s-border)' }}
          >
            <span className="w-[210px] text-sm font-semibold truncate">{o.empresa}</span>
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--s-muted)' }}>
              {o.puesto}
            </span>
            <span className="w-[130px]">
              {/* Chip del diseño, pero editable: cambiar de estado es la acción
                  que más se repite y no merece abrir otra pantalla. */}
              <select
                value={o.estado}
                onChange={(e) => onEstado(o.id, e.target.value)}
                className="outline-none cursor-pointer appearance-none px-2.5 py-1 rounded-full text-xs font-semibold text-center"
                style={{ background: ESTADOS[o.estado].bg, color: ESTADOS[o.estado].fg }}
                aria-label={`Estado de ${o.empresa}`}
              >
                {Object.entries(ESTADOS).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: '#FDFBF4', color: '#24261C' }}>
                    {v.label}
                  </option>
                ))}
              </select>
            </span>
            <span className="w-[170px]">
              {o.variante ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--s-chip-green)', color: 'var(--s-accent-dark)' }}
                >
                  <FileText size={12} /> {o.variante}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
                  sin variante
                </span>
              )}
            </span>
            <span className="w-[100px] text-[13px]" style={{ color: 'var(--s-muted)' }}>
              {o.fecha}
            </span>
            <span className="w-[90px] flex items-center justify-end gap-3.5">
              <button onClick={() => onEditar(o)} title="Adaptar CV a esta oferta">
                <Sparkles size={16} style={{ color: 'var(--s-accent)' }} />
              </button>
              <button onClick={() => onEditar(o)} title="Editar variante">
                <Pencil size={16} style={{ color: 'var(--s-muted)' }} />
              </button>
              <button onClick={() => onBorrar(o.id)} title="Eliminar oferta">
                <Trash2 size={16} style={{ color: 'var(--s-muted)' }} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Ofertas
