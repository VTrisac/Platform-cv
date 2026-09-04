import { lazy, Suspense, useState } from 'react'
import Topbar from './studio/Topbar'
import Bento from './studio/Bento'
import Feed from './studio/Feed'
import Criterios from './studio/Criterios'
import Ofertas from './studio/Ofertas'
import Editor from './studio/Editor'
import NuevaOferta from './studio/NuevaOferta'
import Perfil from './studio/Perfil'
import Cola from './studio/Cola'
import Salarios from './studio/Salarios'

// El mapa del flujo se lleva dentro el paquete de Excalidraw, 2,6 MB. Con lazy()
// sale en su propio chunk y solo lo descarga quien abre la pestaña; importado
// arriba lo pagaría todo el que abre la app.
const Mapa = lazy(() => import('./studio/Mapa'))
import { enLote, esUrl, preparar } from './studio/lote'
import { nuevaOferta, useStudio } from './studio/store'

// `feed.keywords` son las 36 tecnologías del CV enteras: RAG, JWT, n8n,
// Industrial Automation, Tailwind CSS… Ofrecerlas TODAS como "lenguajes
// obligatorios" —que se exigen todos a la vez— vaciaba el feed y el único motivo
// que veías era un "falta lenguaje" sin más. Se ofrecen solo lenguajes de verdad.
const LENGUAJES = ['Python', 'Java', 'JavaScript', 'TypeScript', 'SQL', 'HTML5', 'CSS3']

// Shell de CV Studio. ponytail: sin react-router — cuatro vistas y un estado.
// Una dependencia de routing para esto sería peso muerto.
const Studio = () => {
  const { ofertas, feed, setFeed, base, setBase, preset, setPreset, perfil, setPerfil,
    addOferta, updateOferta, suceso, removeOferta, removeOfertas } = useStudio()
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
    setActual(addOferta(nuevaOferta(a, lang)))
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
  // estado de React no se puede leer desde dentro de este callback. El ESTADO ya
  // no: lo decide SUCESOS leyendo la oferta viva dentro del store, así que ya no
  // hay que acarrearlo por aquí ni mantener la regla en dos sitios.
  const avance = (entradas, lang, ids = [], nombres = []) =>
    (i, fase, extra = {}) => {
      const parche = { ...extra }
      if (extra.a) {
        const nueva = addOferta(nuevaOferta(extra.a, lang, esUrl(entradas[i]) ? entradas[i].trim() : null))
        ids[i] = nueva.id
        nombres[i] = `${extra.a.empresa} · ${lang.toUpperCase()}`
        parche.id = nueva.id
      }
      if (ids[i] && extra.cv) {
        suceso(ids[i], 'cv', null, { variante: nombres[i], cv: extra.cv })
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
    const alFase = avance(entradas, t.lang, ids, nombres)

    setCola((c) => c.map((f, n) => (n === i ? { ...f, error: null } : f)))
    return enLote([t.entrada], t.lang, (_, fase, extra) => alFase(i, fase, extra), 1,
      (entrada, lang, onFase) => preparar(entrada, lang, onFase, { a: t.a, cv: t.cv }))
  }

  // Todo lo que el editor puede provocar, junto. Cada una es una línea contra el
  // store, y a qué estado lleva cada suceso lo decide SUCESOS: por eso esto ya no
  // puede contradecirse con lo que hace el lote, que era el fallo de tener nueve
  // callbacks sueltos escribiendo `estado` cada uno por su cuenta.
  const acciones = {
    // Sin oferta previa (desde el feed o desde "Adaptar a una oferta") la
    // auditoría no se guardaba en ningún sitio y se perdía al volver.
    auditada: (a, lang, url) => {
      if (!actual) return setActual(addOferta(nuevaOferta(a, lang, url)))
      updateOferta(actual.id, {
        auditoria: a, lang, empresa: a.empresa, puesto: a.rol,
        ...(url ? { url } : {}), // no pisar una URL guardada con null
      })
    },
    // El CV se guarda con la oferta en cuanto existe, no al pulsar "Guardar
    // variante": sin él el tracker no tiene nada que mandar al portal.
    cv: (variante, cv) => actual && suceso(actual.id, 'cv', null, { variante, cv }),
    carta: (carta) => actual && updateOferta(actual.id, { carta }),
    aplicada: () => actual && suceso(actual.id, 'aplicada'),
    descartada: () => {
      if (actual) suceso(actual.id, 'marcada', 'descartada')
      setView('ofertas')
    },
    // Guardar y salir, que es lo que hace el botón de la barra.
    guardar: (variante, cv) => {
      if (actual) suceso(actual.id, 'cv', null, { variante, ...(cv ? { cv } : {}) })
      setView('ofertas')
    },
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
          onEstado={(id, estado) => suceso(id, 'marcada', estado)}
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
          onEstado={(id, estado) => suceso(id, 'marcada', estado)}
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

      {view === 'salarios' && <Salarios ofertas={ofertas} onEditar={abrirEditor} />}

      {view === 'mapa' && (
        <Suspense fallback={<div className="p-8 text-sm" style={{ color: 'var(--s-muted)' }}>Cargando el lienzo…</div>}>
          <Mapa />
        </Suspense>
      )}

      {view === 'editor' && (
        <Editor
          oferta={actual}
          urlInicial={urlInicial}
          perfil={perfil}
          autoAplicar={autoAplicar}
          onBack={() => setView(cola.length ? 'cola' : actual ? 'ofertas' : 'bento')}
          acciones={acciones}
        />
      )}

    </div>
  )
}

export default Studio
