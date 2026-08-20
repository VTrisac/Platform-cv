import { Check, TriangleAlert } from 'lucide-react'

// Un proceso largo, con nombre y con raíl. Cuatro pantallas tenían cada una su
// Loader2 con un texto distinto, y ninguna decía en qué paso iba ni cuántos
// quedaban: con 50 s de auditoría y 35 s de adaptación, eso es un minuto y medio
// mirando un icono girar.
//
// ponytail: CSS y un array, sin librería de animación. Los keyframes están en
// index.css (s-rail, s-barrido, s-punto).
//
// `pasos` es [[id, label], …] y `activo` el id que corre AHORA. Lo anterior sale
// marcado, lo posterior en gris. Dos finales:
//   'listo'  -> los tres hechos.
//   'parado' -> se quedó donde estaba y lo de después NO ha pasado. Es el caso de
//               una oferta que la auditoría manda descartar: pintar "Adaptando CV"
//               como hecho sería mentir sobre lo que se ha ejecutado.
const Proceso = ({ pasos, activo, error = null, compacto = false, nota = null }) => {
  const parado = activo === 'parado'
  const i = parado ? 0 : pasos.findIndex(([id]) => id === activo)
  const acabado = activo === 'listo'

  return (
    <div className={`flex flex-col ${compacto ? 'gap-1.5' : 'gap-2.5'} min-w-0`}>
      <div className="flex items-center gap-2 flex-wrap">
        {pasos.map(([id, label], n) => {
          const corriendo = n === i && !error && !acabado && !parado
          const hecho = acabado || (i >= 0 && (n < i || (parado && n === i)))
          return (
            <span key={id} className="flex items-center gap-2">
              {n > 0 && <span style={{ color: 'var(--s-border)' }}>›</span>}
              <span
                className={`flex items-center gap-1.5 ${compacto ? 'text-[11px]' : 'text-xs'} font-semibold`}
                style={{ color: corriendo ? 'var(--s-accent-dark)' : hecho ? 'var(--s-accent)' : 'var(--s-muted)' }}
              >
                {hecho && <Check size={compacto ? 11 : 13} />}
                {corriendo
                  ? <span className="s-barrido">{label}</span>
                  : <span style={{ opacity: hecho ? 1 : 0.6 }}>{label}</span>}
                {corriendo && (
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="s-punto w-1 h-1 rounded-full"
                        style={{ background: 'var(--s-accent)' }}
                      />
                    ))}
                  </span>
                )}
              </span>
            </span>
          )
        })}
      </div>

      {/* El raíl solo mientras corre: parado sería decir que sigue pasando algo. */}
      {!error && !acabado && !parado && (
        <div className={`s-rail rounded-full ${compacto ? 'h-1' : 'h-1.5'}`} />
      )}

      {error && (
        <p className="text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
        </p>
      )}

      {nota && !error && (
        <p className={compacto ? 'text-[11px]' : 'text-xs'} style={{ color: 'var(--s-muted)' }}>{nota}</p>
      )}
    </div>
  )
}

export default Proceso
