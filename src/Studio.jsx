import { useState } from 'react'
import Topbar from './studio/Topbar'
import Bento from './studio/Bento'
import Feed from './studio/Feed'
import Criterios from './studio/Criterios'
import Ofertas from './studio/Ofertas'
import Editor from './studio/Editor'
import NuevaOferta from './studio/NuevaOferta'
import Perfil from './studio/Perfil'
import Cola from './studio/Cola'
import { enLote, esUrl, preparar } from './studio/lote'
import { conCV, useStudio } from './studio/store'

// La oferta se crea a partir de la auditoría: empresa, puesto y encaje salen
// del scraper, no los escribes tú. Se guarda la auditoría entera para que
// reabrirla no vuelva a gastar una llamada al modelo.
//
// El inglés YA NO descarta (28-08-2026). Era un stopper al final del embudo: la
// oferta ya te había costado una llamada al modelo y aun así nacía descartada y
// desaparecía del tracker. La auditoría sigue diciendo qué frase lo exige —eso
// es información, y se ve en Auditoria.jsx—; decidir es tuyo.
const desdeAuditoria = (a, lang, url = null) => ({
  empresa: a.empresa,
  puesto: a.rol,
  estado: a.recomendacion === 'descartar' ? 'descartada' : 'guardada',
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
  const { ofertas, feed, setFeed, base, setBase, preset, setPreset, perfil, setPerfil, addOferta, updateOferta, removeOferta, removeOfertas } = useStudio()
  const [view, setView] = useState('bento')
  const [actual, setActual] = useState(null)
  const [urlInicial, setUrlInicial] = useState(null)
  const [autoAplicar, setAutoAplicar] = useState(false)
  const [modal, setModal] = useState(false)
  const [cola, setCola] = useState([])
  // El Resumen salta a Ofertas con un filtro ya puesto ("enséñame las
  // descartadas"). Vive aquí porque lo decide quien navega, no la tabla.
  const [filtroOfertas, setFiltroOfertas] = useState(null)

  // `aplicar` entra en el editor con el botón ya pulsado: desde el tracker, una
  // oferta que ya tiene CV adaptado no necesita otra pantalla de por medio.
  const abrirEditor = (oferta, url = null, aplicar = false) => {
    setActual(oferta ?? null)
    setUrlInicial(url)
    setAutoAplicar(aplicar)
    setView('editor')
  }

  const guardarAuditada = (a, lang) => {
    setActual(addOferta(desdeAuditoria(a, lang)))
    setModal(false)
    setView('editor')
  }

  // Varias ofertas a la vez. Cada trozo se guarda con su oferta EN CUANTO existe
  // —la auditoría al llegar, luego el CV, luego la carta—, igual que hace el
  // editor con una sola: si te vas a otra pantalla o cierras a mitad, lo que ya
  // se ha pagado al modelo no se pierde.
  // El avance de una fila: crea la oferta en cuanto cae su auditoría y le va
  // colgando el CV y la carta. Sacado aquí fuera porque lo comparten el lote
  // entero y el reintento de una fila suelta.
  //
  // El id y el nombre de variante de cada oferta creada van por índice: el
  // estado de React no se puede leer desde dentro de este callback.
  const avance = (entradas, lang, ids = [], nombres = [], estados = []) =>
    (i, fase, extra = {}) => {
      const parche = { ...extra }
      if (extra.a) {
        const nueva = addOferta(desdeAuditoria(extra.a, lang, esUrl(entradas[i]) ? entradas[i].trim() : null))
        ids[i] = nueva.id
        nombres[i] = `${extra.a.empresa} · ${lang.toUpperCase()}`
        estados[i] = nueva.estado
        parche.id = nueva.id
      }
      // Mismo automatismo que en el editor: el CV adelanta la candidatura. El
      // estado de partida siempre es "guardada" aquí —la acaba de crear
      // desdeAuditoria—, pero se pasa por conCV igual para no tener dos reglas.
      if (ids[i] && extra.cv) {
        updateOferta(ids[i], { variante: nombres[i], cv: extra.cv, estado: conCV(estados[i]) })
      }
      if (ids[i] && extra.carta) updateOferta(ids[i], { carta: extra.carta })
      setCola((c) => c.map((t, n) => (n === i ? { ...t, fase, ...parche } : t)))
    }

  const lanzarLote = async (entradas, lang) => {
    setModal(false)
    // El idioma viaja en la fila: el reintento lo necesita y no puede adivinarlo.
    setCola(entradas.map((entrada) => ({ entrada, fase: 'espera', lang })))
    setView('cola')
    await enLote(entradas, lang, avance(entradas, lang))
  }

  // Repite SOLO lo que le faltó a esa fila. Se pasa por enLote —con un solo
  // elemento— para no duplicar su try/catch, que es quien marca la fila en error.
  const reintentar = (i) => {
    const t = cola[i]
    // Todo va indexado por la posición de la fila, que es la que `avance` lee:
    // sembrarlo en la 0 le haría perder el id y crear una oferta duplicada.
    const entradas = []; entradas[i] = t.entrada
    const ids = []; ids[i] = t.id
    const nombres = []; nombres[i] = t.a && `${t.a.empresa} · ${String(t.lang).toUpperCase()}`
    const estados = []; estados[i] = ofertas.find((o) => o.id === t.id)?.estado
    const alFase = avance(entradas, t.lang, ids, nombres, estados)

    setCola((c) => c.map((f, n) => (n === i ? { ...f, error: null } : f)))
    return enLote([t.entrada], t.lang, (_, fase, extra) => alFase(i, fase, extra), 1,
      (entrada, lang, onFase) => preparar(entrada, lang, onFase, { a: t.a, cv: t.cv }))
  }

  return (
    <div className="studio min-h-screen flex flex-col">
      <div className="no-print">
        <Topbar
          view={view}
          onNav={(v) => { if (v === 'ofertas') setFiltroOfertas(null); setView(v) }}
          onNueva={() => setModal(true)}
          cola={cola.length}
        />
      </div>

      {modal && <NuevaOferta onListo={guardarAuditada} onLote={lanzarLote} onCerrar={() => setModal(false)} />}

      {view === 'bento' && (
        <Bento
          ofertas={ofertas}
          onNav={setView}
          onEditar={abrirEditor}
          onVerOfertas={(filtro) => { setFiltroOfertas(filtro); setView('ofertas') }}
        />
      )}

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
          filtroInicial={filtroOfertas}
          onEditar={abrirEditor}
          onAplicar={(o) => abrirEditor(o, null, true)}
          onEstado={(id, estado) => updateOferta(id, { estado })}
          onBorrar={(id) => window.confirm('¿Eliminar esta oferta?') && removeOferta(id)}
          // El confirm lo pone la tabla, que es quien sabe cuántas y de qué tipo.
          onBorrarVarias={removeOfertas}
        />
      )}

      {view === 'cola' && (
        <Cola
          cola={cola}
          onReintentar={reintentar}
          onNueva={() => setModal(true)}
          onAbrir={(id) => {
            const o = ofertas.find((x) => x.id === id)
            if (o) abrirEditor(o)
          }}
        />
      )}

      {view === 'perfil' && <Perfil perfil={perfil} setPerfil={setPerfil} />}

      {view === 'editor' && (
        <Editor
          oferta={actual}
          urlInicial={urlInicial}
          perfil={perfil}
          autoAplicar={autoAplicar}
          onBack={() => setView(cola.length ? 'cola' : actual ? 'ofertas' : 'bento')}
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
          // Y el estado avanza solo: en cuanto existe el CV, la candidatura pasa
          // a "Preparada". conCV() se encarga de que una ya enviada no retroceda.
          //
          // El estado se lee del store, NO de `actual`: `actual` es la foto de
          // cuando abriste el editor, y si has pulsado Aplicar en esta misma
          // sesión ahí sigue poniendo "guardada". Regenerar el CV después la
          // habría devuelto a "preparada" — justo la regresión que conCV existe
          // para evitar.
          onCV={(nombre, cv) => actual && updateOferta(actual.id, {
            variante: nombre,
            cv,
            estado: conCV(ofertas.find((o) => o.id === actual.id)?.estado ?? actual.estado),
          })}
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
              })
            } else setActual(addOferta(desdeAuditoria(a, lang, url)))
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
