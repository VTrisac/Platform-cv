import { AlertTriangle, ExternalLink, FileDown, FileText, Info, Send, Sparkles, TrendingUp } from 'lucide-react'
import { ESTADOS, agrupar, contar } from './store'

// Pantalla "Resumen". Antes era el bento del diseño: cinco contadores por
// `estado` y una rejilla bonita. El problema es que no respondía a las dos
// preguntas que se le hacen todos los días —en cuáles he postulado, y cuáles solo
// he auditado—, porque `estado` lo pones a mano y no dice qué se ha preparado:
// una oferta recién auditada y una con el CV ya adaptado son las dos "guardada".
//
// ponytail: sigue sin haber una etapa derivada guardada en ninguna parte.
// `agrupar()` cuenta campos que ya existen (auditoria, cv, url) y devuelve las
// listas; aquí solo se pintan.
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
  <span className="text-xs font-semibold" style={{ color: 'var(--s-accent-dark)', letterSpacing: '0.8px' }}>
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
      background: destacado && n ? 'var(--s-chip-green)' : 'var(--s-bg)',
      borderColor: destacado && n ? 'var(--s-accent)' : 'var(--s-border)',
    }}
  >
    <span className="text-[26px] leading-none font-semibold" style={{ fontFamily: 'var(--s-display)' }}>{n}</span>
    <span className="text-[13px] font-semibold">{titulo}</span>
    <span className="text-xs leading-snug" style={{ color: 'var(--s-muted)' }}>{hint}</span>
  </button>
)

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
          {g.vivas.length} candidaturas en marcha · {g.abiertas.length} por revisar · {conVariante} variantes de CV
        </p>
      </div>

      {/* --- (a) en cuáles he postulado ------------------------------------- */}
      <div className="flex gap-4">
        <Tile h={300} className="gap-3">
          <div className="flex items-baseline justify-between">
            <Label>CANDIDATURAS EN MARCHA</Label>
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
            {g.vivas.map((o) => (
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
                    <span className="text-xs" style={{ color: 'var(--s-muted)' }}>{o.fecha}</span>
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
            onClick={() => onVerOfertas('guardada')}
            disabled={!g.listas.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold mt-3 w-fit disabled:opacity-45"
            style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
          >
            <Send size={14} /> Ver en Ofertas
          </button>
        </Tile>
      </div>

      {/* --- (b) cuáles solo he auditado ------------------------------------ */}
      <Tile className="gap-3">
        <div className="flex items-baseline justify-between">
          <Label>POR REVISAR — {g.abiertas.length} GUARDADAS</Label>
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--s-muted)' }}>
            <Info size={12} />
            Todas son «Guardada»: lo que las separa es lo que ya se ha preparado, no el estado.
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
            n={g.conCV.length}
            titulo="Con CV adaptado"
            hint="Preparadas, sin aplicar todavía."
            onClick={() => onVerOfertas('guardada')}
          />
          <Grupo
            n={g.listas.length}
            titulo="Listas para aplicar"
            hint="Enlace + CV. A un clic."
            destacado
            onClick={() => onVerOfertas('guardada')}
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
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--s-accent-dark)' }}>
                        {o.auditoria.salario.pedir.toLocaleString('es-ES')} €
                      </span>
                    )}
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#E3EBDC', color: '#48603F' }}
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
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EFEADB' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: v.fg }} />
                  </div>
                </button>
              )
            })}
          </div>
          {/* La semilla de demo cuenta como candidaturas enviadas hasta que se
              borra, así que el pipeline miente mientras siga ahí. */}
          {g.semilla.length > 0 && (
            <p className="text-xs flex gap-1.5 mt-auto" style={{ color: '#8A6D2E' }}>
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
                style={{ background: 'var(--s-chip-green)', color: 'var(--s-accent-dark)' }}
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
            style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
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
