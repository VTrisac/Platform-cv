import { ExternalLink, FileText, TriangleAlert } from 'lucide-react'
import Proceso from './Proceso'
import { FASES } from './lote'

// La cola: varias ofertas preparándose a la vez. Cada fila enseña en qué paso va
// la suya, y al terminar el encaje y lo que puedes pedir.
//
// Las ofertas NO viven aquí: se guardan en el tracker en cuanto su auditoría cae
// (lo hace Studio en cada fase). Esto es solo la ventana a lo que está pasando —
// si te vas a otra pantalla a mitad, no pierdes nada.
const REC = {
  aplicar: { txt: 'Aplica', bg: 'var(--s-ganada-f)', fg: 'var(--s-ganada)' },
  aplicar_con_reservas: { txt: 'Con reservas', bg: 'var(--s-atencion-f)', fg: 'var(--s-atencion)' },
  descartar: { txt: 'Descártala', bg: 'var(--s-perdida-f)', fg: 'var(--s-perdida)' },
}

// El enlace entero no cabe y el texto pegado tampoco: la primera línea basta
// para reconocer cuál es cuál mientras corren.
const titulo = (t) => {
  const primera = String(t).split('\n')[0].trim()
  return primera.length > 90 ? `${primera.slice(0, 90)}…` : primera
}

const Cola = ({ cola, onAbrir, onNueva }) => {
  const corriendo = cola.filter((t) => !['listo', 'parado', 'error'].includes(t.fase)).length

  return (
    <div className="p-8 flex flex-col gap-5 max-w-[1100px]">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
            Cola
          </h1>
          <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
            {corriendo
              ? `${corriendo} de ${cola.length} en marcha · de dos en dos, para no acabar limitado por ritmo`
              : `${cola.length} ofertas preparadas. Están todas en Ofertas.`}
          </p>
        </div>
        <button
          onClick={onNueva}
          className="px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border"
          style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
        >
          Añadir más
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {cola.map((t, i) => {
          const a = t.a
          // La empresa puede venir vacía si pegaste el texto sin nombre: un
          // separador suelto delante del puesto queda a medio hacer.
          const cabecera = a && [a.empresa, a.rol].filter(Boolean).join(' · ')
          const rec = a && (REC[a.recomendacion] ?? { txt: a.recomendacion, bg: 'var(--s-hueco)', fg: 'var(--s-muted)' })
          return (
            <div
              key={i}
              className="rounded-[20px] border p-4 flex flex-col gap-3"
              style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold truncate" title={t.entrada}>
                    {cabecera || titulo(t.entrada)}
                  </span>
                  {a && (
                    <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
                      {a.ubicacion} · {a.modalidad} · {a.seniority}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {rec && (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: rec.bg, color: rec.fg }}>
                      {rec.txt}
                    </span>
                  )}
                  {t.id && (
                    <button
                      onClick={() => onAbrir(t.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: 'var(--s-accent)' }}
                    >
                      <FileText size={13} /> Abrir
                    </button>
                  )}
                  {/^https?:\/\//i.test(t.entrada.trim()) && (
                    <a
                      href={t.entrada.trim()}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir la oferta en el portal"
                      className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: 'var(--s-text)' }}
                    >
                      <ExternalLink size={13} /> Portal
                    </a>
                  )}
                </div>
              </div>

              <Proceso
                compacto
                pasos={FASES}
                activo={t.fase === 'espera' ? null : t.fase}
                error={t.error}
                nota={t.fase === 'espera' ? 'En cola…'
                  : t.fase === 'parado' ? 'Parada aquí: la auditoría dice que la descartes, así que no se ha gastado la adaptación.'
                  : null}
              />

              {a && (
                <div className="flex items-center gap-5 flex-wrap text-xs" style={{ color: 'var(--s-muted)' }}>
                  <span>
                    Imprescindibles <b style={{ color: 'var(--s-text)' }}>
                      {a.encaje.imprescindibles === null ? '—' : `${a.encaje.imprescindibles}%`}
                    </b>
                  </span>
                  {a.salario?.pedir && (
                    <span>
                      Puedes pedir <b style={{ color: 'var(--s-text)' }}>
                        {a.salario.pedir.toLocaleString('es-ES')} €
                      </b>
                      {a.salario.publicado ? ' (publicado)' : ''}
                    </span>
                  )}
                  {a.encaje.bloqueantes.length > 0 && (
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--s-perdida)' }}>
                      <TriangleAlert size={12} /> {a.encaje.bloqueantes.length} bloqueante
                      {a.encaje.bloqueantes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Cola
