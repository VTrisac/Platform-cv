import { useState } from 'react'
import { Info, TrendingUp } from 'lucide-react'
import { salarios } from './store'

// El dinero que te dije que pidieras, por oferta.
//
// El dato se guardaba desde el 20-08 dentro de `auditoria.salario`, pero no había
// dónde verlo: en cuanto la oferta bajaba en el tracker, la cifra desaparecía. Y
// una cifra que no puedes volver a mirar es una cifra que no tienes.
//
// ponytail: aquí no se calcula nada, `salarios()` en store.js devuelve las filas y
// la mediana; esto ordena y pinta.

const euros = (n) => (n == null ? '—' : `${Number(n).toLocaleString('es-ES')} €`)
const miles = (n) => (n == null ? null : `${Math.round(n / 1000)}k`)

const COLUMNAS = [
  { id: 'dia', label: 'FECHA', w: 'w-[90px]' },
  { id: 'empresa', label: 'EMPRESA', w: 'w-[170px]' },
  { id: null, label: 'PUESTO', w: 'flex-1' },
  { id: 'encaje', label: 'ENCAJE', w: 'w-[80px]' },
  { id: null, label: 'BANDA', w: 'w-[120px]' },
  { id: null, label: 'PUBLICA', w: 'w-[90px]' },
  { id: 'pedir', label: 'PIDE', w: 'w-[100px]' },
  { id: null, label: 'SUELO', w: 'w-[100px]' },
]

const Salarios = ({ ofertas, onEditar }) => {
  // Por fecha, que es como llega de store.js. Las otras dos son numéricas y van
  // de mayor a menor: quien ordena por dinero quiere ver primero lo que más paga.
  const [orden, setOrden] = useState('dia')
  const { filas, mediana } = salarios(ofertas)

  const ordenadas = orden === 'dia' ? filas : [...filas].sort((a, b) => (b[orden] ?? -1) - (a[orden] ?? -1))

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
          Salarios
        </h1>
        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--s-muted)' }}>
          {filas.length} ofertas auditadas con cifra
          {mediana != null && (
            <>
              <span>·</span>
              <TrendingUp size={14} style={{ color: 'var(--s-accent)' }} />
              <span>mediana <b style={{ color: 'var(--s-text)' }}>{euros(mediana)}</b></span>
            </>
          )}
        </p>
      </div>

      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
      >
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-xs font-semibold"
          style={{ background: 'var(--s-bg)', color: 'var(--s-muted)', letterSpacing: '0.3px' }}
        >
          {COLUMNAS.map((col) => (
            <span key={col.label} className={col.w}>
              {col.id ? (
                <button
                  onClick={() => setOrden(col.id)}
                  className="font-semibold"
                  style={{ color: orden === col.id ? 'var(--s-accent)' : 'inherit' }}
                >
                  {col.label}
                </button>
              ) : col.label}
            </span>
          ))}
        </div>

        {ordenadas.length === 0 && (
          <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--s-muted)' }}>
            Todavía no hay ninguna auditoría con banda salarial. Audita una oferta y la cifra aparece aquí.
          </p>
        )}

        {ordenadas.map((f) => (
          <button
            key={f.id}
            onClick={() => onEditar(ofertas.find((o) => o.id === f.id))}
            className="flex items-center gap-4 px-5 py-3.5 border-t w-full text-left"
            style={{ borderColor: 'var(--s-border)' }}
          >
            <span className="w-[90px] text-[13px]" style={{ color: 'var(--s-muted)' }}>
              {f.dia
                ? new Date(`${f.dia}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                : '—'}
            </span>
            <span className="w-[170px] text-sm font-semibold truncate">{f.empresa}</span>
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--s-muted)' }}>{f.puesto}</span>
            <span className="w-[80px] text-[13px]" style={{ color: 'var(--s-muted)' }}>
              {f.encaje == null ? '—' : `${f.encaje}%`}
            </span>
            {/* En miles: la banda es contexto, no una cifra que se apunte. */}
            <span className="w-[120px] text-[13px]" style={{ color: 'var(--s-muted)' }}>
              {f.min != null ? `${miles(f.min)}–${miles(f.max)}` : '—'}
            </span>
            {/* Si la oferta la publica, la banda no es una estimación y eso cambia
                cuánto te la puedes creer. */}
            <span className="w-[90px] text-[13px]" style={{ color: f.publica ? 'var(--s-ganada)' : 'var(--s-muted)' }}>
              {f.publica ? `sí · ${miles(f.max)}` : f.publicado ? miles(f.publicado) : '—'}
            </span>
            <span className="w-[100px] text-sm font-semibold">{euros(f.pedir)}</span>
            <span className="w-[100px] text-[13px]" style={{ color: 'var(--s-muted)' }}>{euros(f.suelo)}</span>
          </button>
        ))}
      </div>

      <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-muted)' }}>
        <Info size={12} className="shrink-0 mt-0.5" />
        La banda sale de la oferta cuando la publica y del modelo cuando no; el punto dentro de ella se
        calcula con tu % de imprescindibles, no lo decide el modelo. El «suelo» es donde te levantas de la mesa.
      </p>
    </div>
  )
}

export default Salarios
