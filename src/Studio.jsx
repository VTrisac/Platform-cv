import { useState } from 'react'
import Topbar from './studio/Topbar'
import Bento from './studio/Bento'
import Feed from './studio/Feed'
import Ofertas from './studio/Ofertas'
import Editor from './studio/Editor'
import NuevaOferta from './studio/NuevaOferta'
import { useStudio } from './studio/store'

// La oferta se crea a partir de la auditoría: empresa, puesto y encaje salen
// del scraper, no los escribes tú. Se guarda la auditoría entera para que
// reabrirla no vuelva a gastar una llamada al modelo.
const desdeAuditoria = (a, lang) => ({
  empresa: a.empresa,
  puesto: a.rol,
  estado: a.recomendacion === 'descartar' ? 'descartada' : 'guardada',
  fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  variante: null,
  auditoria: a,
  lang,
})

// Shell de CV Studio. ponytail: sin react-router — cuatro vistas y un estado.
// Una dependencia de routing para esto sería peso muerto.
const Studio = () => {
  const { ofertas, feed, setFeed, preset, setPreset, addOferta, updateOferta, removeOferta } = useStudio()
  const [view, setView] = useState('bento')
  const [actual, setActual] = useState(null)
  const [urlInicial, setUrlInicial] = useState(null)
  const [modal, setModal] = useState(false)

  const abrirEditor = (oferta, url = null) => {
    setActual(oferta ?? null)
    setUrlInicial(url)
    setView('editor')
  }

  const guardarAuditada = (a, lang) => {
    setActual(addOferta(desdeAuditoria(a, lang)))
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

      {view === 'feed' && (
        <Feed
          feed={feed}
          setFeed={setFeed}
          preset={preset}
          setPreset={setPreset}
          ofertas={ofertas}
          onAuditar={(url) => abrirEditor(null, url)}
        />
      )}

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
          urlInicial={urlInicial}
          onBack={() => setView(actual ? 'ofertas' : 'bento')}
          onGuardar={(nombre) => {
            if (actual) updateOferta(actual.id, { variante: nombre })
            setView('ofertas')
          }}
          // Sin oferta previa (desde el feed o desde "Adaptar a una oferta") la
          // auditoría no se guardaba en ningún sitio y se perdía al volver:
          // aquí se crea la oferta, igual que hace el modal de nueva oferta.
          onAuditada={(a, lang) => {
            if (actual) updateOferta(actual.id, { auditoria: a, lang, empresa: a.empresa, puesto: a.rol })
            else setActual(addOferta(desdeAuditoria(a, lang)))
          }}
          // La carta se guarda con la oferta, igual que la auditoría: volver a
          // abrirla no debe costar otra llamada al modelo.
          onCarta={(carta) => actual && updateOferta(actual.id, { carta })}
          // Descartar desde la auditoría. Siempre hay oferta que marcar: para
          // llegar aquí ha habido una auditoría, y onAuditada ya la creó.
          onDescartar={() => {
            if (actual) updateOferta(actual.id, { estado: 'descartada' })
            setView('ofertas')
          }}
        />
      )}
    </div>
  )
}

export default Studio
