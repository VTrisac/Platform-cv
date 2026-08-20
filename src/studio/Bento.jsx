import { AlertTriangle, ExternalLink, FileDown, FileText, Info, Send, Sparkles, TrendingUp } from 'lucide-react'
import { ESTADOS, agrupar, contar, desdeCuando, diasDesde } from './store'

// Pantalla "Resumen": los números de la búsqueda de un vistazo y qué hacer a
// continuación.
//
// Los contadores de arriba son los que se miran todos los días —enviadas y
// descartadas— y todos llevan a Ofertas con ese filtro puesto: un número que no
// te lleva a lo que cuenta es un adorno.
//
// La lista de seguimiento va ordenada por lo que lleva callada, no por fecha de
// creación: lo que quieres ver primero es lo que toca reclamar.
//
// ponytail: aquí no se calcula nada. `agrupar()` en store.js devuelve las listas
// ya hechas y esto solo las pinta; así se puede probar sin React.
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

const Big = ({ children }) => (
  <span className="text-[56px] leading-none font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
    {children}
  </span>
)

// Una fila de oferta, la misma en los tres bloques que listan ofertas.
const Fila = ({ o, onEditar, derecha }) => (
  <button
    onClick={() => onEditar(o)}
    className="flex items-center justify-between gap-3 py-2.5 border-b text-left w-full"
    style={{ borderColor: 'var(--s-border)' }}
  >
    <span className="flex flex-col min-w-0">
      <span className="text-sm font-semibold truncate">{o.empresa || 'Sin empresa'}</span>
      <span className="text-xs truncate" style={{ color: 'var(--s-muted)' }}>{o.puesto}</span>
    </span>
    <span className="shrink-0">{derecha}</span>
  </button>
)

// Un grupo del bloque "por revisar": número grande, qué es, y salta a Ofertas.
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

// Los números que se miran de un vistazo. Clicables: un contador que no te lleva
// a lo que cuenta es un adorno.
const Contador = ({ n, titulo, hint, estado, onVerOfertas, destacado }) => (
  <button
    onClick={() => onVerOfertas(estado)}
    disabled={!n}
    className="rounded-[20px] p-5 flex flex-col gap-1 items-start text-left disabled:opacity-45 flex-1"
    style={{
      background: destacado ? 'var(--s-ganada-f)' : 'var(--s-surface)',
      border: `1px solid ${destacado ? 'var(--s-accent)' : 'var(--s-border)'}`,
      boxShadow: 'var(--s-shadow)',
    }}
  >
    <Label>{titulo}</Label>
    <Big>{n}</Big>
    <span className="text-xs leading-snug" style={{ color: 'var(--s-muted)' }}>{hint}</span>
  </button>
)

// Cuántos días lleva en el estado en el que está. null en las ofertas de antes de
// que se guardara la historia, y entonces no se pinta nada.
const Espera = ({ o }) => {
  const d = diasDesde(desdeCuando(o, o.estado))
  if (d === null) return null
  return (
    <span className="text-[11px] font-semibold" style={{ color: d >= 21 ? 'var(--s-atencion)' : 'var(--s-muted)' }}>
      {d === 0 ? 'hoy' : `${d} d`}
    </span>
  )
}

const Bento = ({ ofertas, onNav, onEditar, onVerOfertas }) => {
  const c = contar(ofertas)
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

      {/* Los cuatro números de un vistazo. */}
      <div className="flex gap-4">
        <Contador
          n={g.preparadas.length} titulo="PREPARADAS" estado="preparada" onVerOfertas={onVerOfertas}
          hint="CV hecho, sin mandar todavía."
        />
        <Contador
          n={g.enviadas.length} titulo="ENVIADAS" estado="enviada" onVerOfertas={onVerOfertas}
          hint="Mandadas y esperando respuesta."
        />
        <Contador
          n={g.entrevistas.length} titulo="ENTREVISTAS" estado="entrevista" onVerOfertas={onVerOfertas}
          hint="Procesos abiertos ahora mismo."
        />
        <Contador
          n={g.descartadas.length} titulo="DESCARTADAS" estado="descartada" onVerOfertas={onVerOfertas}
          hint={g.rechazadas.length
            ? `Que ni llegaste a mandar. Y ${g.rechazadas.length} rechazada${g.rechazadas.length > 1 ? 's' : ''} tras aplicar.`
            : 'Que ni llegaste a mandar.'}
        />
        {/* Solo si hay: una tarjeta de contratados a cero todos los días es
            desmoralizante y no informa de nada. */}
        {g.contratado.length > 0 && (
          <Contador
            n={g.contratado.length} titulo="CONTRATADO" estado="contratado" onVerOfertas={onVerOfertas}
            hint="Se acabó la búsqueda." destacado
          />
        )}
      </div>

      {/* --- (a) en cuáles he postulado ------------------------------------- */}
      <div className="flex gap-4">
        <Tile h={300} className="gap-3">
          <div className="flex items-baseline justify-between">
            <Label>SEGUIMIENTO — LA QUE MÁS TIEMPO LLEVA CALLADA, PRIMERO</Label>
            <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
              {c.enviada} enviadas · {c.entrevista} en entrevista
            </span>
          </div>
          <div className="flex flex-col overflow-auto">
            {g.vivas.length === 0 && (
              <p className="text-sm py-4" style={{ color: 'var(--s-muted)' }}>
                Ninguna todavía. Prepara una oferta y pulsa «Aplicar».
              </p>
            )}
            {[...g.sinRespuesta, ...g.entrevistas].map((o) => (
              <Fila
                key={o.id}
                o={o}
                onEditar={onEditar}
                derecha={
                  <span className="flex items-center gap-2">
                    {/* Qué le mandaste de verdad, que es lo que no recuerdas
                        tres semanas después. */}
                    {o.cv && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--s-accent)' }}>
                        <FileText size={10} /> CV{o.carta ? ' + carta' : ''}
                      </span>
                    )}
                    <Espera o={o} />
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: ESTADOS[o.estado].bg, color: ESTADOS[o.estado].fg }}
                    >
                      {ESTADOS[o.estado].label}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
          {/* La honestidad que hace falta aquí: el botón de enviar no lo pulsa
              la extensión, así que "enviada" es lo que TÚ marcaste al aplicar. */}
          <p className="text-xs flex gap-1.5 mt-auto pt-2" style={{ color: 'var(--s-muted)' }}>
            <Info size={12} className="shrink-0 mt-0.5" />
            «Enviada» significa que la preparaste y abriste el portal: el botón de enviar lo pulsas tú,
            así que la app no puede saber si llegó a salir.
          </p>
        </Tile>

        <Tile w={300} h={300} alt className="gap-1.5 justify-center">
          <Label>LISTAS PARA APLICAR</Label>
          <Big>{g.listas.length}</Big>
          <span className="text-[13px]" style={{ color: 'var(--s-muted)' }}>
            Tienen enlace y CV adaptado: solo falta pulsar «Aplicar».
          </span>
          <button
            onClick={() => onVerOfertas('preparada')}
            disabled={!g.listas.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold mt-3 w-fit disabled:opacity-45"
            style={{ background: 'var(--s-accent)', color: 'var(--s-sobre-acento)' }}
          >
            <Send size={14} /> Ver en Ofertas
          </button>
        </Tile>
      </div>

      {/* --- (b) cuáles solo he auditado ------------------------------------ */}
      <Tile className="gap-3">
        <div className="flex items-baseline justify-between">
          <Label>POR REVISAR — {g.porRevisar.length} SIN MANDAR</Label>
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--s-muted)' }}>
            <Info size={12} />
            De pegarla a poder aplicar. Cada paso lleva a Ofertas con ese filtro.
          </span>
        </div>
        <div className="flex gap-3">
          <Grupo
            n={g.sinAuditar.length}
            titulo="Sin auditar"
            hint="Solo el nombre. No sabes si encajas."
            onClick={() => onVerOfertas('guardada')}
          />
          <Grupo
            n={g.soloAuditadas.length}
            titulo="Solo auditadas"
            hint="Sabes el encaje; el CV sigue sin adaptar."
            onClick={() => onVerOfertas('guardada')}
          />
          <Grupo
            n={g.preparadas.length}
            titulo="Preparadas"
            hint="CV adaptado, sin mandar."
            onClick={() => onVerOfertas('preparada')}
          />
          <Grupo
            n={g.listas.length}
            titulo="Listas para aplicar"
            hint="Enlace + CV. A un clic."
            destacado
            onClick={() => onVerOfertas('preparada')}
          />
        </div>
      </Tile>

      {/* --- lo que está a un paso ------------------------------------------ */}
      <div className="flex gap-4">
        <Tile h={280} className="gap-3">
          <Label>MERECEN LA PENA — AUDITADAS CON BUEN ENCAJE, SIN ADAPTAR</Label>
          <div className="flex flex-col overflow-auto">
            {g.prometedoras.length === 0 && (
              <p className="text-sm py-4" style={{ color: 'var(--s-muted)' }}>
                Nada pendiente con un 75 % o más de imprescindibles.
              </p>
            )}
            {g.prometedoras.map((o) => (
              <Fila
                key={o.id}
                o={o}
                onEditar={onEditar}
                derecha={
                  <span className="flex items-center gap-2">
                    {o.auditoria?.salario?.pedir && (
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--s-text)' }}>
                        {o.auditoria.salario.pedir.toLocaleString('es-ES')} €
                      </span>
                    )}
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'var(--s-ganada-f)', color: 'var(--s-ganada)' }}
                    >
                      {o.auditoria.encaje.imprescindibles}%
                    </span>
                    <Sparkles size={13} style={{ color: 'var(--s-accent)' }} />
                  </span>
                }
              />
            ))}
          </div>
        </Tile>

        <Tile w={300} h={280} className="gap-4">
          <Label>PIPELINE</Label>
          <div className="flex flex-col gap-2.5">
            {Object.entries(ESTADOS).map(([k, v]) => {
              const n = c[k]
              const pct = ofertas.length ? Math.round((n / ofertas.length) * 100) : 0
              return (
                <button key={k} onClick={() => onVerOfertas(k)} className="flex flex-col gap-1.5 text-left">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--s-muted)' }}>
                    <span>{v.label}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--s-hueco)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: v.fg }} />
                  </div>
                </button>
              )
            })}
          </div>
          {/* La semilla de demo cuenta como candidaturas enviadas hasta que se
              borra, así que el pipeline miente mientras siga ahí. */}
          {g.semilla.length > 0 && (
            <p className="text-xs flex gap-1.5 mt-auto" style={{ color: 'var(--s-atencion)' }}>
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              {g.semilla.length} filas son la demo inicial. Quítalas en Ofertas: hasta entonces estos números no son tuyos.
            </p>
          )}
        </Tile>
      </div>

      {/* --- lo de siempre, comprimido -------------------------------------- */}
      <div className="flex gap-4">
        <Tile h={190} className="gap-3">
          <Label>VARIANTES DE CV</Label>
          <div className="flex flex-wrap gap-2 overflow-auto">
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
    </div>
  )
}

export default Bento
