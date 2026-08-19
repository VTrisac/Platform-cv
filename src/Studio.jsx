import { useState } from 'react'
import Topbar from './studio/Topbar'
import Bento from './studio/Bento'
import Feed from './studio/Feed'
import Criterios from './studio/Criterios'
import Ofertas from './studio/Ofertas'
import Editor from './studio/Editor'
import NuevaOferta from './studio/NuevaOferta'
import Perfil from './studio/Perfil'
import { useStudio } from './studio/store'

// La oferta se crea a partir de la auditoría: empresa, puesto y encaje salen
// del scraper, no los escribes tú. Se guarda la auditoría entera para que
// reabrirla no vuelva a gastar una llamada al modelo.
//
// El filtro de inglés se aplica AQUÍ y no en el feed porque solo la auditoría
// sabe distinguir "se valora inglés" de "inglés imprescindible": es la única
// que ha clasificado los requisitos. Descartada, pero guardada con su motivo
// para que puedas leer qué frase la tumbó.
const desdeAuditoria = (a, lang, excluirIngles, url = null) => ({
  empresa: a.empresa,
  puesto: a.rol,
  estado: a.recomendacion === 'descartar' || (excluirIngles && a.ingles) ? 'descartada' : 'guardada',
  fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  variante: null,
  auditoria: a,
  url, // el enlace para postular; null si pegaste el texto a mano
  lang,
})

// `feed.keywords` son las 36 tecnologías del CV enteras: RAG, JWT, n8n,
// Industrial Automation, Tailwind CSS… Ofrecerlas TODAS como "lenguajes
// obligatorios" —que se exigen todos a la vez— vaciaba el feed y el único motivo
// que veías era un "falta lenguaje" sin más. Se ofrecen solo lenguajes de verdad.
const LENGUAJES = ['Python', 'Java', 'JavaScript', 'TypeScript', 'SQL', 'HTML5', 'CSS3']

// Shell de CV Studio. ponytail: sin react-router — cuatro vistas y un estado.
// Una dependencia de routing para esto sería peso muerto.
const Studio = () => {
  const { ofertas, feed, setFeed, base, setBase, preset, setPreset, perfil, setPerfil, addOferta, updateOferta, removeOferta } = useStudio()
  const [view, setView] = useState('bento')
  const [actual, setActual] = useState(null)
  const [urlInicial, setUrlInicial] = useState(null)
  const [autoAplicar, setAutoAplicar] = useState(false)
  const [modal, setModal] = useState(false)

  // `aplicar` entra en el editor con el botón ya pulsado: desde el tracker, una
  // oferta que ya tiene CV adaptado no necesita otra pantalla de por medio.
  const abrirEditor = (oferta, url = null, aplicar = false) => {
    setActual(oferta ?? null)
    setUrlInicial(url)
    setAutoAplicar(aplicar)
    setView('editor')
  }

  // El criterio efectivo: el tuyo si has tocado la pantalla, y si no el que el
  // servidor dice haber aplicado.
  const excluirIngles = (preset ?? base?.preset)?.excluirInglesImprescindible ?? false

  const guardarAuditada = (a, lang) => {
    setActual(addOferta(desdeAuditoria(a, lang, excluirIngles)))
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
          ofertas={ofertas}
          onAuditar={(url) => abrirEditor(null, url)}
          onCriterios={() => setView('criterios')}
        />
      )}

      {view === 'criterios' && (
        <Criterios
          preset={preset}
          setPreset={setPreset}
          base={base}
          setBase={setBase}
          lenguajesCV={(base?.keywords ?? []).filter((k) => LENGUAJES.includes(k))}
        />
      )}

      {view === 'ofertas' && (
        <Ofertas
          ofertas={ofertas}
          onEditar={abrirEditor}
          onAplicar={(o) => abrirEditor(o, null, true)}
          onEstado={(id, estado) => updateOferta(id, { estado })}
          onBorrar={(id) => window.confirm('¿Eliminar esta oferta?') && removeOferta(id)}
        />
      )}

      {view === 'perfil' && <Perfil perfil={perfil} setPerfil={setPerfil} />}

      {view === 'editor' && (
        <Editor
          oferta={actual}
          urlInicial={urlInicial}
          perfil={perfil}
          autoAplicar={autoAplicar}
          onBack={() => setView(actual ? 'ofertas' : 'bento')}
          // El CV adaptado se guarda con la oferta, no solo su nombre: sin
          // esto, reabrirla desde el tracker volvía a pagar la adaptación y no
          // había nada que mandar al portal.
          onGuardar={(nombre, cv) => {
            if (actual) updateOferta(actual.id, { variante: nombre, ...(cv ? { cv } : {}) })
            setView('ofertas')
          }}
          // Lo mismo que onGuardar pero SIN navegar: se dispara solo, en cuanto
          // el CV existe. Antes el CV solo se guardaba si pulsabas "Guardar
          // variante", y sin él el tracker no tenía nada que mandar al portal:
          // por eso el botón "Aplicar" no aparecía nunca.
          onCV={(nombre, cv) => actual && updateOferta(actual.id, { variante: nombre, cv })}
          // Pulsar "Aplicar" no es enviar —la extensión no toca ese botón—,
          // pero es lo que vas a hacer a continuación. El desplegable del
          // tracker lo corrige en un clic si te arrepientes.
          onAplicado={() => actual && updateOferta(actual.id, { estado: 'enviada' })}
          // Sin oferta previa (desde el feed o desde "Adaptar a una oferta") la
          // auditoría no se guardaba en ningún sitio y se perdía al volver:
          // aquí se crea la oferta, igual que hace el modal de nueva oferta.
          onAuditada={(a, lang, url) => {
            if (actual) {
              updateOferta(actual.id, {
                auditoria: a, lang, empresa: a.empresa, puesto: a.rol,
                ...(url ? { url } : {}), // no pisar una URL guardada con null
                ...(excluirIngles && a.ingles ? { estado: 'descartada' } : {}),
              })
            } else setActual(addOferta(desdeAuditoria(a, lang, excluirIngles, url)))
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
