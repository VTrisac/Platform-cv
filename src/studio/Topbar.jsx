import { FileText, Plus } from 'lucide-react'

// Topbar del diseño: marca, navegación de 3 secciones, acción primaria y avatar.
// Se repite idéntica en las tres pantallas, así que vive aquí una sola vez.
const NAV = [
  { id: 'bento', label: 'Resumen' },
  { id: 'feed', label: 'Feed' },
  { id: 'criterios', label: 'Criterios' },
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'editor', label: 'Variantes' },
  { id: 'perfil', label: 'Perfil' },
]

const Topbar = ({ view, onNav, onNueva }) => (
  <header
    className="h-16 px-8 flex items-center justify-between border-b shrink-0"
    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
  >
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-[10px] flex items-center justify-center"
        style={{ background: 'var(--s-accent)' }}
      >
        <FileText size={16} color="#FDFBF4" />
      </div>
      <span className="text-[17px] font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
        CV Studio
      </span>
    </div>

    <nav className="flex items-center gap-7">
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => onNav(n.id)}
          className="text-sm transition-colors"
          style={{
            color: view === n.id ? 'var(--s-accent-dark)' : 'var(--s-muted)',
            fontWeight: view === n.id ? 600 : 500,
          }}
        >
          {n.label}
        </button>
      ))}
    </nav>

    <div className="flex items-center gap-4">
      <button
        onClick={onNueva}
        className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold"
        style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
      >
        <Plus size={15} /> Nueva oferta
      </button>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
        style={{ background: 'var(--s-chip)', color: 'var(--s-accent-dark)' }}
      >
        VT
      </div>
    </div>
  </header>
)

export default Topbar
