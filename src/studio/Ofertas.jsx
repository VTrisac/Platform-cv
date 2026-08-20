import { useEffect, useState } from 'react'
import { Search, ExternalLink, Sparkles, FileText, Send, Trash2, X } from 'lucide-react'
import { ESTADOS, esSemilla } from './store'

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

const Ofertas = ({ ofertas, onEditar, onAplicar, onEstado, onBorrar, onBorrarVarias, filtroInicial = null }) => {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState(filtroInicial)
  // Un Set, no un array: marcar y desmarcar 44 filas es lo que más se toca aquí.
  const [seleccion, setSeleccion] = useState(() => new Set())

  // El Resumen entra con un filtro puesto ("enséñame las descartadas"). Sin esto
  // el filtro solo se aplicaba la primera vez que se monta la pantalla.
  useEffect(() => setFiltro(filtroInicial), [filtroInicial])

  const visibles = ofertas.filter(
    (o) =>
      (!filtro || o.estado === filtro) &&
      `${o.empresa} ${o.puesto}`.toLowerCase().includes(q.toLowerCase())
  )

  // Seleccionar todas son LAS VISIBLES, no las 44: si has filtrado por
  // "Descartada", eso es lo que esperas que se marque. Cualquier otra lectura
  // acaba en un borrado que no querías.
  const todasMarcadas = visibles.length > 0 && visibles.every((o) => seleccion.has(o.id))
  const alternar = (id) => setSeleccion((s) => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const marcarVisibles = () =>
    setSeleccion(todasMarcadas ? new Set() : new Set(visibles.map((o) => o.id)))

  // El confirm dice el número: es lo único que frena un borrado de 22 de golpe.
  const borrar = (ids, que) => {
    if (!ids.length) return
    if (!window.confirm(`¿Eliminar ${ids.length} ${que}? No se puede deshacer.`)) return
    onBorrarVarias(ids)
    setSeleccion(new Set())
  }

  const descartadas = ofertas.filter((o) => o.estado === 'descartada')
  const semilla = ofertas.filter(esSemilla)

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

      {/* Solo aparece con algo seleccionado, y los atajos solo si hay qué
          borrar: una barra de acciones siempre visible es ruido las 40 veces que
          entras a mirar y no a limpiar. */}
      {(seleccion.size > 0 || descartadas.length > 0 || semilla.length > 0) && (
        <div
          className="flex items-center gap-3 flex-wrap px-4 py-2.5 rounded-[14px] border"
          style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
        >
          {seleccion.size > 0 ? (
            <>
              <span className="text-[13px] font-semibold">{seleccion.size} seleccionada{seleccion.size > 1 ? 's' : ''}</span>
              <button
                onClick={() => borrar([...seleccion], 'ofertas seleccionadas')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#F3E4E1', color: '#8A4A3C' }}
              >
                <Trash2 size={13} /> Borrar
              </button>
              <button
                onClick={() => setSeleccion(new Set())}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--s-muted)' }}
              >
                <X size={13} /> Quitar la selección
              </button>
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
              Marca filas para borrarlas en bloque, o usa un atajo:
            </span>
          )}

          <span className="flex-1" />

          {descartadas.length > 0 && (
            <button
              onClick={() => borrar(descartadas.map((o) => o.id), 'ofertas descartadas')}
              className="text-xs font-semibold underline"
              style={{ color: 'var(--s-muted)' }}
              title={descartadas.slice(0, 5).map((o) => o.empresa).join(', ')}
            >
              Borrar las {descartadas.length} descartadas
            </button>
          )}
          {/* La semilla de `load()`: nunca la creaste tú y cuatro de ellas cuentan
              como candidaturas enviadas en la portada. */}
          {semilla.length > 0 && (
            <button
              onClick={() => borrar(semilla.map((o) => o.id), 'ofertas de la demo inicial')}
              className="text-xs font-semibold underline"
              style={{ color: 'var(--s-muted)' }}
              title={semilla.map((o) => o.empresa).join(', ')}
            >
              Quitar las {semilla.length} de demo
            </button>
          )}
        </div>
      )}

      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
      >
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-xs font-semibold"
          style={{ background: '#F5F1E6', color: 'var(--s-muted)', letterSpacing: '0.3px' }}
        >
          <span className="w-[22px] flex items-center">
            <input
              type="checkbox"
              checked={todasMarcadas}
              onChange={marcarVisibles}
              disabled={visibles.length === 0}
              title={todasMarcadas ? 'Desmarcar' : `Seleccionar las ${visibles.length} visibles`}
              aria-label="Seleccionar todas las visibles"
              className="cursor-pointer"
            />
          </span>
          <span className="w-[188px]">EMPRESA</span>
          <span className="flex-1">PUESTO</span>
          <span className="w-[90px]">ENCAJE</span>
          <span className="w-[130px]">ESTADO</span>
          <span className="w-[170px]">VARIANTE</span>
          <span className="w-[100px]">FECHA</span>
          <span className="w-[180px] text-right">ACCIONES</span>
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
            style={{
              borderColor: 'var(--s-border)',
              background: seleccion.has(o.id) ? 'var(--s-chip-green)' : 'transparent',
            }}
          >
            <span className="w-[22px] flex items-center">
              <input
                type="checkbox"
                checked={seleccion.has(o.id)}
                onChange={() => alternar(o.id)}
                aria-label={`Seleccionar ${o.empresa}`}
                className="cursor-pointer"
              />
            </span>
            <span className="w-[188px] text-sm font-semibold truncate">{o.empresa}</span>
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--s-muted)' }}>
              {o.puesto}
            </span>
            {/* El % de imprescindibles, no un promedio: los valorables no
                compensan un requisito bloqueante. "—" si no se ha auditado. */}
            <span className="w-[90px]">
              {o.auditoria?.encaje?.imprescindibles != null ? (
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: o.auditoria.encaje.imprescindibles >= 75 ? '#E3EBDC'
                      : o.auditoria.encaje.imprescindibles >= 50 ? '#F3EAD6' : '#F3E4E1',
                    color: o.auditoria.encaje.imprescindibles >= 75 ? '#48603F'
                      : o.auditoria.encaje.imprescindibles >= 50 ? '#8A6D2E' : '#8A4A3C',
                  }}
                  title={`${o.auditoria.encaje.bloqueantes.length} bloqueantes`}
                >
                  {o.auditoria.encaje.imprescindibles}%
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>—</span>
              )}
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
            <span className="w-[170px] flex flex-col gap-1">
              {o.variante ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit"
                  style={{ background: 'var(--s-chip-green)', color: 'var(--s-accent-dark)' }}
                >
                  <FileText size={12} /> {o.variante}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
                  sin variante
                </span>
              )}
              {/* Lista para enviar = tiene CV adaptado y carta. El envío es tuyo. */}
              {o.variante && o.carta && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--s-accent)' }}>
                  <Send size={10} /> lista para enviar
                </span>
              )}
            </span>
            <span className="w-[100px] text-[13px]" style={{ color: 'var(--s-muted)' }}>
              {o.fecha}
            </span>
            <span className="w-[180px] flex items-center justify-end gap-2.5">
              {/* Con CV adaptado y enlace ya hay algo que mandar, así que la
                  acción es aplicar. Sin las dos cosas, lo que toca es prepararla. */}
              {o.url && o.cv ? (
                <button
                  onClick={() => onAplicar(o)}
                  title="Rellenar el formulario del portal con este CV. No lo envía: confirmas tú."
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
                >
                  <Send size={12} /> Aplicar
                </button>
              ) : (
                <button
                  onClick={() => onEditar(o)}
                  title="Auditar la oferta y adaptar el CV"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', color: 'var(--s-muted)' }}
                >
                  <Sparkles size={12} style={{ color: 'var(--s-accent)' }} /> Preparar
                </button>
              )}
              {o.url && o.cv && (
                <button onClick={() => onEditar(o)} title="Ver o editar la candidatura">
                  <Sparkles size={15} style={{ color: 'var(--s-accent)' }} />
                </button>
              )}
              {o.url && (
                <a href={o.url} target="_blank" rel="noreferrer" title="Abrir la oferta en el portal">
                  <ExternalLink size={15} style={{ color: 'var(--s-accent-dark)' }} />
                </a>
              )}
              <button onClick={() => onBorrar(o.id)} title="Eliminar oferta">
                <Trash2 size={15} style={{ color: 'var(--s-muted)' }} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Ofertas
