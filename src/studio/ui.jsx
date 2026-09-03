// Las dos piezas de interfaz que estaban copiadas en tres pantallas.
//
// `Card` vivía por triplicado —Editor con `right`, Criterios y Perfil con
// `hint`— y `campo` por triplicado también, con un píxel de diferencia entre
// copias. Esto es la unión de las tres, no una capa nueva: si una pantalla
// necesita algo que no está aquí, se le pasa por style, no se copia el fichero.
export const Card = ({ title, hint, right, children }) => (
  <div
    className="rounded-[20px] border p-5 flex flex-col gap-3.5"
    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.3px' }}>
          {title}
        </span>
        {hint && <span className="text-xs" style={{ color: 'var(--s-muted)' }}>{hint}</span>}
      </div>
      {right}
    </div>
    {children}
  </div>
)

// El ancho va al 100% porque es lo que quieren casi todos; quien necesita otra
// cosa lo sobrescribe (`{ ...campo, width: 120 }`, `flex: 1`…), que es lo que
// ya hacía Criterios en sus ocho campos.
export const campo = {
  background: 'var(--s-bg)', border: '1px solid var(--s-border)', borderRadius: 10,
  padding: '9px 12px', outline: 'none', width: '100%', fontSize: 13,
}
