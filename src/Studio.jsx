import { useState } from 'react'
import Topbar from './studio/Topbar'
import Bento from './studio/Bento'
import Ofertas from './studio/Ofertas'
import Editor from './studio/Editor'
import NuevaOferta from './studio/NuevaOferta'
import { useStudio } from './studio/store'

// Shell de CV Studio. ponytail: sin react-router — tres vistas y un estado.
// Una dependencia de routing para esto sería peso muerto.
const Studio = () => {
  const { ofertas, addOferta, updateOferta, removeOferta } = useStudio()
  const [view, setView] = useState('bento')
  const [actual, setActual] = useState(null)
  const [modal, setModal] = useState(false)

  const abrirEditor = (oferta) => {
    setActual(oferta ?? null)
    setView('editor')
  }

  // La oferta se crea a partir de la auditoría: empresa, puesto y encaje salen
  // del scraper. Se guarda la auditoría entera para que reabrirla no vuelva a
  // gastar una llamada al modelo, y se salta directo al informe de encaje.
  const guardarAuditada = (a, lang) => {
    const oferta = {
      empresa: a.empresa,
      puesto: a.rol,
      estado: a.recomendacion === 'descartar' ? 'descartada' : 'guardada',
      fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      variante: null,
      auditoria: a,
      lang,
    }
    setActual(addOferta(oferta))
    setModal(false)
    setView('editor')
  }

  return (
    <div className="studio min-h-screen flex flex-col">
      <div className="no-print">
        <Topbar view={view} onNav={setView} onNueva={() => setModal(true)} />
      </div>

      {modal && <NuevaOferta onListo={guardarAuditada} onCerrar={() => setModal(false)} />}

      {view === 'bento' && <Bento ofertas={ofertas} onNav={setView} onEditar={abrirEditor} />}

      {view === 'ofertas' && (
        <Ofertas
          ofertas={ofertas}
          onEditar={abrirEditor}
          onEstado={(id, estado) => updateOferta(id, { estado })}
          onBorrar={(id) => window.confirm('¿Eliminar esta oferta?') && removeOferta(id)}
        />
      )}

      {view === 'editor' && (
        <Editor
          oferta={actual}
          onBack={() => setView(actual ? 'ofertas' : 'bento')}
          onGuardar={(nombre) => {
            if (actual) updateOferta(actual.id, { variante: nombre })
            setView('ofertas')
          }}
          onAuditada={(a, lang) => {
            if (actual) updateOferta(actual.id, { auditoria: a, lang, empresa: a.empresa, puesto: a.rol })
          }}
          // Descartar desde la auditoría: si la oferta ya estaba en el tracker
          // se marca; si venía de cero, se guarda descartada para no volver a
          // auditar lo mismo dentro de dos semanas.
          onDescartar={(a) => {
            if (actual) updateOferta(actual.id, { estado: 'descartada' })
            else
              addOferta({
                empresa: a.empresa,
                puesto: a.rol,
                estado: 'descartada',
                fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                variante: null,
              })
            setView('ofertas')
          }}
        />
      )}
    </div>
  )
}

export default Studio
