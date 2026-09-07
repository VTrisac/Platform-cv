import { useEffect, useState } from 'react'
import { Search, ExternalLink, Sparkles, FileText, Send, Trash2, X, ChevronRight } from 'lucide-react'
import { ESTADOS, SIGUIENTE, contar, desdeCuando, diasDesde, porQueDescartada } from './store'

// Pantalla "Ofertas — Tracker" del diseño: cabecera con recuento, buscador,
// filtros por estado y tabla. Las columnas replican los anchos del mockup
// (210 / fill / 130 / 170 / 100 / 90).
// Lo que sigue en juego. Descartada y rechazada NO están: en cuanto marcas una
// sale de la tabla, que es lo que pediste — la lista de trabajo es lo que puedes
// mover, y arrastrar veinte muertas por debajo la vuelve inútil. Siguen a un clic
// en el chip «Archivadas» y en la cuarta columna del tablero.
const VIVAS = ['guardada', 'preparada', 'enviada', 'entrevista', 'contratado']
const ARCHIVO = 'archivadas'

// Los dos saltos que se dan a mano todo el rato: «ya la preparé» y «ya la mandé».
// El desplegable de los siete sigue estando, pero esto es un clic en vez de tres.
const RAPIDOS = ['preparada', 'enviada']

const Ofertas = ({ ofertas, onEditar, onAplicar, onEstado, onBorrar, onBorrarVarias, filtroInicial = null }) => {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState(filtroInicial)
  // Un Set, no un array: marcar y desmarcar 44 filas es lo que más se toca aquí.
  const [seleccion, setSeleccion] = useState(() => new Set())

  // El Resumen entra con un filtro puesto ("enséñame las descartadas"). Sin esto
  // el filtro solo se aplicaba la primera vez que se monta la pantalla.
  useEffect(() => setFiltro(filtroInicial), [filtroInicial])

  const archivadas = ofertas.filter((o) => !VIVAS.includes(o.estado))
  const enFiltro = (o) => (filtro === ARCHIVO ? !VIVAS.includes(o.estado)
    : filtro ? o.estado === filtro
      : VIVAS.includes(o.estado))

  const visibles = ofertas.filter(
    (o) => enFiltro(o) && `${o.empresa} ${o.puesto}`.toLowerCase().includes(q.toLowerCase())
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

  const c = contar(ofertas)
  // La "s" solo cuando toca: "1 guardadas" en la cabecera es lo primero que se lee.
  const resumen = Object.entries(ESTADOS)
    .map(([k, v]) => `${c[k]} ${v.label.toLowerCase()}${c[k] === 1 ? '' : 's'}`)
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
          {[null, ...VIVAS, ARCHIVO].map((k) => (
            <button
              key={k ?? 'todas'}
              onClick={() => setFiltro(k)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={{
                background: filtro === k ? 'var(--s-accent)' : 'var(--s-surface)',
                color: filtro === k ? 'var(--s-sobre-acento)' : 'var(--s-muted)',
                borderColor: filtro === k ? 'var(--s-accent)' : 'var(--s-border)',
              }}
            >
              {k === ARCHIVO ? `Archivadas (${archivadas.length})` : k ? ESTADOS[k].label : 'En juego'}
            </button>
          ))}
        </div>
      </div>

      {/* Solo aparece con algo seleccionado, y el atajo solo si hay qué borrar:
          una barra de acciones siempre visible es ruido las 40 veces que entras a
          mirar y no a limpiar. */}
      {(seleccion.size > 0 || archivadas.length > 0) && (
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
                style={{ background: 'var(--s-perdida-f)', color: 'var(--s-perdida)' }}
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
              Marca filas para borrarlas en bloque, o vacía el archivo:
            </span>
          )}

          <span className="flex-1" />

          {archivadas.length > 0 && (
            <button
              onClick={() => borrar(archivadas.map((o) => o.id), 'ofertas archivadas (descartadas y rechazadas)')}
              className="text-xs font-semibold underline"
              style={{ color: 'var(--s-muted)' }}
              title={archivadas.slice(0, 5).map((o) => o.empresa).join(', ')}
            >
              Borrar las {archivadas.length} archivadas
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
          style={{ background: 'var(--s-bg)', color: 'var(--s-muted)', letterSpacing: '0.3px' }}
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
          <span className="w-[250px]">ESTADO</span>
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
              background: seleccion.has(o.id) ? 'var(--s-hueco)' : 'transparent',
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
                    background: o.auditoria.encaje.imprescindibles >= 75 ? 'var(--s-ganada-f)'
                      : o.auditoria.encaje.imprescindibles >= 50 ? 'var(--s-atencion-f)' : 'var(--s-perdida-f)',
                    color: o.auditoria.encaje.imprescindibles >= 75 ? 'var(--s-ganada)'
                      : o.auditoria.encaje.imprescindibles >= 50 ? 'var(--s-atencion)' : 'var(--s-perdida)',
                  }}
                  title={`${o.auditoria.encaje.bloqueantes.length} bloqueantes`}
                >
                  {o.auditoria.encaje.imprescindibles}%
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>—</span>
              )}
            </span>
            <span className="w-[250px] flex flex-col gap-1">
              <span className="flex items-center gap-1.5 flex-wrap">
                {/* Chip del diseño, pero editable: cambiar de estado es la acción
                    que más se repite y no merece abrir otra pantalla. Sigue
                    ofreciendo los siete, incluido volver atrás: equivocarse al
                    marcar es lo más normal del mundo. */}
                <select
                  value={o.estado}
                  onChange={(e) => onEstado(o.id, e.target.value)}
                  className="outline-none cursor-pointer appearance-none px-2.5 py-1 rounded-full text-xs font-semibold text-center"
                  style={{ background: ESTADOS[o.estado].bg, color: ESTADOS[o.estado].fg }}
                  aria-label={`Estado de ${o.empresa}`}
                  // Por qué está descartada, encima del chip. Si te descarta una
                  // oferta quieres saber si fue tu criterio o la auditoría, y con
                  // qué números. Es dato derivado: ver porQueDescartada().
                  title={porQueDescartada(o) ?? undefined}
                >
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <option key={k} value={k} style={{ background: 'var(--s-surface)', color: 'var(--s-text)' }}>
                      {v.label}
                    </option>
                  ))}
                </select>
                {/* Marcarla a mano, de un clic, sin abrir el desplegable: es lo
                    que más se repite —«esta ya la preparé», «esta ya la mandé»— y
                    hasta ahora exigía tres clics o pasar por el editor. El estado
                    en el que ya está no se ofrece. */}
                {RAPIDOS.filter((e) => e !== o.estado).map((e) => (
                  <button
                    key={e}
                    onClick={() => onEstado(o.id, e)}
                    title={`Marcar como ${ESTADOS[e].label.toLowerCase()}`}
                    className="px-2 py-1 rounded-full text-[11px] font-semibold border shrink-0"
                    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', color: 'var(--s-muted)' }}
                  >
                    {ESTADOS[e].label}
                  </button>
                ))}
                {/* Y el paso siguiente del recorrido, cuando no es ninguno de los
                    dos de arriba: entrevista y contratado. */}
                {SIGUIENTE[o.estado] && !RAPIDOS.includes(SIGUIENTE[o.estado]) && (
                  <button
                    onClick={() => onEstado(o.id, SIGUIENTE[o.estado])}
                    title={`Pasar a ${ESTADOS[SIGUIENTE[o.estado]].label}`}
                    className="flex items-center gap-0.5 px-1.5 py-1 rounded-full text-[11px] font-semibold border shrink-0"
                    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', color: 'var(--s-muted)' }}
                  >
                    <ChevronRight size={11} /> {ESTADOS[SIGUIENTE[o.estado]].label}
                  </button>
                )}
              </span>
              {/* Desde cuándo lleva ahí. Solo si hay historia: las ofertas de
                  antes no la tienen y una fecha inventada sería peor que nada. */}
              {(() => {
                const d = diasDesde(desdeCuando(o, o.estado))
                return d === null ? null : (
                  <span className="text-[11px]" style={{ color: 'var(--s-muted)' }}>
                    {d === 0 ? 'hoy' : `hace ${d} día${d > 1 ? 's' : ''}`}
                  </span>
                )
              })()}
            </span>
            <span className="w-[170px] flex flex-col gap-1">
              {o.variante ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit"
                  style={{ background: 'var(--s-chip-green)', color: 'var(--s-ganada)' }}
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
                  style={{ background: 'var(--s-accent)', color: 'var(--s-sobre-acento)' }}
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
