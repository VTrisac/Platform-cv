import { AlertTriangle, ExternalLink, FileDown, FileText, Info, Sparkles, TrendingUp } from 'lucide-react'
import { ESTADOS, agrupar, desdeCuando, diasDesde } from './store'

// El tablero: dónde está cada candidatura, no cuántas hay de cada.
//
// Cuatro columnas —preparadas, enviadas, entrevistas, fuera— con sus ofertas
// dentro. El estado se cambia en la propia tarjeta: es la acción que más se
// repite y antes obligaba a ir a Ofertas a buscar la fila.
//
// ponytail: aquí no se calcula nada. `agrupar()` en store.js devuelve las listas
// hechas y esto solo las pinta; así se puede probar sin React.

// Tres semanas sin respuesta es cuando toca reclamar, no antes.
const CALLADA = 21

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
  <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.8px' }}>
    {children}
  </span>
)

const euros = (n) => `${Number(n).toLocaleString('es-ES')} €`
const plural = (n, palabra) => `${n} ${palabra}${n === 1 ? '' : 's'}`

// Cuántos días lleva en el estado en el que está. null en las ofertas de antes de
// que se guardara la historia, y entonces no se pinta nada: una fecha inventada
// es peor que ninguna.
const Espera = ({ o }) => {
  const d = diasDesde(desdeCuando(o, o.estado))
  if (d === null) return null
  return (
    <span
      className="text-[11px] font-semibold shrink-0"
      style={{ color: d >= CALLADA ? 'var(--s-atencion)' : 'var(--s-muted)' }}
      title={d >= CALLADA ? 'Lleva más de tres semanas sin moverse' : undefined}
    >
      {d === 0 ? 'hoy' : `${d} d`}
    </span>
  )
}

// Una candidatura en el tablero. El chip cambia el estado sin salir de aquí.
const Tarjeta = ({ o, onEditar, onEstado }) => (
  <div
    className="flex flex-col gap-1.5 p-3 rounded-xl border"
    style={{ background: 'var(--s-bg)', borderColor: 'var(--s-border)' }}
  >
    <button onClick={() => onEditar(o)} className="flex items-start justify-between gap-2 text-left">
      <span className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold truncate">{o.empresa || 'Sin empresa'}</span>
        <span className="text-[11px] truncate" style={{ color: 'var(--s-muted)' }}>{o.puesto}</span>
      </span>
      <Espera o={o} />
    </button>

    <div className="flex items-center gap-1.5 flex-wrap">
      {/* El estado, editable en la tarjeta. Sigue ofreciendo los siete, incluido
          volver atrás: equivocarse al marcar es lo más normal del mundo. */}
      <select
        value={o.estado}
        onChange={(e) => onEstado(o.id, e.target.value)}
        className="outline-none cursor-pointer appearance-none px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ background: ESTADOS[o.estado].bg, color: ESTADOS[o.estado].fg }}
        aria-label={`Estado de ${o.empresa}`}
      >
        {Object.entries(ESTADOS).map(([k, v]) => (
          <option key={k} value={k} style={{ background: 'var(--s-surface)', color: 'var(--s-text)' }}>
            {v.label}
          </option>
        ))}
      </select>
      {o.auditoria?.encaje?.imprescindibles != null && (
        <span className="text-[11px] font-bold" style={{ color: 'var(--s-muted)' }}>
          {o.auditoria.encaje.imprescindibles}%
        </span>
      )}
      {/* Lo que ibas a pedir. Es el dato que se olvida entre que la preparas y
          te llaman, y el que más caro sale olvidar. */}
      {o.auditoria?.salario?.pedir != null && (
        <span className="text-[11px] font-semibold" style={{ color: 'var(--s-accent)' }}>
          {euros(o.auditoria.salario.pedir)}
        </span>
      )}
      {o.cv && <FileText size={11} style={{ color: 'var(--s-accent)' }} title="CV adaptado" />}
    </div>
  </div>
)

// Una columna del tablero.
const Columna = ({ titulo, hint, ofertas, onEditar, onEstado, vacio }) => (
  <Tile h={420} className="gap-3">
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{titulo}</Label>
        <span className="text-[22px] leading-none font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
          {ofertas.length}
        </span>
      </div>
      <span className="text-[11px]" style={{ color: 'var(--s-muted)' }}>{hint}</span>
    </div>
    <div className="flex flex-col gap-2 overflow-auto">
      {ofertas.length === 0
        ? <p className="text-xs py-3" style={{ color: 'var(--s-muted)' }}>{vacio}</p>
        : ofertas.map((o) => <Tarjeta key={o.id} o={o} onEditar={onEditar} onEstado={onEstado} />)}
    </div>
  </Tile>
)

// Un grupo de la tira de arriba: lo que aún no ha entrado en ninguna columna.
const Grupo = ({ n, titulo, hint, onClick, destacado }) => (
  <button
    onClick={onClick}
    disabled={!n}
    className="flex flex-col gap-0.5 items-start p-3 rounded-xl border text-left disabled:opacity-45 flex-1"
    style={{
      background: destacado && n ? 'var(--s-atencion-f)' : 'var(--s-bg)',
      borderColor: destacado && n ? 'var(--s-accent)' : 'var(--s-border)',
    }}
  >
    <span className="text-[26px] leading-none font-semibold" style={{ fontFamily: 'var(--s-display)' }}>{n}</span>
    <span className="text-[13px] font-semibold">{titulo}</span>
    <span className="text-xs leading-snug" style={{ color: 'var(--s-muted)' }}>{hint}</span>
  </button>
)

const Bento = ({ ofertas, onNav, onEditar, onEstado, onVerOfertas }) => {
  const g = agrupar(ofertas)
  const conVariante = ofertas.filter((o) => o.variante).length

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
          Hola, Víctor
        </h1>
        <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
          {g.vivas.length} candidaturas en marcha · {g.porRevisar.length} por revisar · {conVariante} variantes de CV
        </p>
      </div>

      {/* El final bueno, y solo si lo hay: una tarjeta de contratados a cero
          todos los días es desmoralizante y no informa de nada. */}
      {g.contratado.length > 0 && (
        <div
          className="flex items-center gap-2 px-5 py-3 rounded-[14px] text-sm font-semibold"
          style={{ background: 'var(--s-ganada)', color: 'var(--s-sobre-acento)' }}
        >
          <Sparkles size={15} />
          Contratado en {g.contratado.map((o) => o.empresa).join(', ')}.
        </div>
      )}

      {/* --- el tablero ------------------------------------------------------ */}
      <div className="flex gap-4">
        <Columna
          titulo="PREPARADAS" hint="CV hecho, sin mandar todavía."
          ofertas={g.preparadas} onEditar={onEditar} onEstado={onEstado}
          vacio="Nada preparado. Audita una oferta y adapta el CV."
        />
        <Columna
          titulo="ENVIADAS" hint="Mandadas y esperando respuesta."
          ofertas={g.sinRespuesta} onEditar={onEditar} onEstado={onEstado}
          vacio="Ninguna enviada todavía."
        />
        <Columna
          titulo="ENTREVISTAS" hint="Procesos abiertos ahora mismo."
          ofertas={g.entrevistas} onEditar={onEditar} onEstado={onEstado}
          vacio="Ninguna todavía."
        />
        {/* Descartada y rechazada van juntas porque las dos están fuera, pero
            cada una conserva su chip y su recuento: descartada es que no llegaste
            a mandarla, rechazada es que te dijeron que no, y juntarlas taparía si
            el problema está en tu criterio al elegir o en lo que mandas. */}
        <Columna
          titulo="FUERA"
          hint={`${plural(g.descartadas.length, 'descartada')} · ${plural(g.rechazadas.length, 'rechazada')}`}
          ofertas={g.archivadas} onEditar={onEditar} onEstado={onEstado}
          vacio="Nada descartado ni rechazado."
        />
      </div>

      {/* La honestidad que hace falta: el botón de enviar no lo pulsa la
          extensión, así que "enviada" es lo que TÚ marcaste al aplicar. */}
      <p className="text-xs flex gap-1.5 -mt-2" style={{ color: 'var(--s-muted)' }}>
        <Info size={12} className="shrink-0 mt-0.5" />
        «Enviada» significa que la preparaste y abriste el portal: el botón de enviar lo pulsas tú,
        así que la app no puede saber si llegó a salir. El chip de cada tarjeta lo corrige.
      </p>

      {/* --- lo que todavía no ha entrado en el tablero ---------------------- */}
      <Tile className="gap-3">
        <div className="flex items-baseline justify-between">
          <Label>ANTES DEL TABLERO — {g.porRevisar.length} SIN MANDAR</Label>
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--s-muted)' }}>
            <Info size={12} />
            De pegarla a poder aplicar. Cada paso lleva a Ofertas con ese filtro.
          </span>
        </div>
        <div className="flex gap-3">
          <Grupo
            n={g.sinAuditar.length} titulo="Sin auditar"
            hint="Solo el nombre. No sabes si encajas."
            onClick={() => onVerOfertas('guardada')}
          />
          <Grupo
            n={g.soloAuditadas.length} titulo="Solo auditadas"
            hint="Sabes el encaje; el CV sigue sin adaptar."
            onClick={() => onVerOfertas('guardada')}
          />
          <Grupo
            n={g.prometedoras.length} titulo="Merecen la pena"
            hint="La auditoría recomienda aplicar, y siguen sin adaptar."
            onClick={() => onVerOfertas('guardada')}
            destacado
          />
          <Grupo
            n={g.listas.length} titulo="Listas para aplicar"
            hint="Enlace + CV. A un clic."
            onClick={() => onVerOfertas('preparada')}
            destacado
          />
        </div>
      </Tile>

      {/* --- lo de siempre, comprimido -------------------------------------- */}
      <div className="flex gap-4">
        <Tile h={190} className="gap-3">
          <Label>VARIANTES DE CV</Label>
          <div className="flex flex-wrap gap-2 overflow-auto">
            {conVariante === 0 && (
              <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
                Ninguna todavía. Adapta el CV a una oferta y aparecerá aquí.
              </p>
            )}
            {ofertas.filter((o) => o.variante).map((o) => (
              <button
                key={o.id}
                onClick={() => onEditar(o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium h-fit"
                style={{ background: 'var(--s-chip-green)', color: 'var(--s-ganada)' }}
              >
                <FileText size={12} /> {o.variante}
              </button>
            ))}
          </div>
        </Tile>
        <Tile w={380} h={190} className="gap-2">
          <Label>ACCIONES</Label>
          <button
            onClick={() => onNav('feed')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold"
            style={{ background: 'var(--s-accent)', color: 'var(--s-sobre-acento)' }}
          >
            <TrendingUp size={15} /> Buscar ofertas nuevas
          </button>
          <button
            onClick={() => onNav('editor')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold border"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
          >
            <FileDown size={15} style={{ color: 'var(--s-muted)' }} /> Abrir el editor de CV
          </button>
          <a
            href="https://cv-victor-trisac.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs mt-auto"
            style={{ color: 'var(--s-muted)' }}
          >
            <ExternalLink size={12} /> CV maestro · 6 puestos · ES / EN
          </a>
        </Tile>
      </div>

      {ofertas.length === 0 && (
        <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-muted)' }}>
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          Todavía no hay ninguna oferta. Pulsa «Nueva oferta» y pega un enlace.
        </p>
      )}
    </div>
  )
}

export default Bento
