import { useEffect, useMemo, useRef, useState } from 'react'
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { RotateCcw } from 'lucide-react'
import { esqueleto } from './flujo'
import { guardarMapa, leerMapa } from './store'

// El mapa del flujo, editable. Este fichero es el que arrastra el paquete de
// Excalidraw (2,6 MB), así que Studio.jsx lo carga con lazy(): quien no abra
// esta pestaña no lo descarga.
//
// regenerateIds: false es obligatorio. Por defecto convertToExcalidrawElements
// inventa ids nuevos, y entonces las flechas —que se enganchan por id— apuntan
// a cajas que ya no existen y el diagrama sale sin una sola línea.
const dibujar = () => leerMapa() ?? convertToExcalidrawElements(esqueleto(), { regenerateIds: false })

// Excalidraw incrementa element.version en cada cambio de verdad, así que la
// suma distingue "lo han movido" de "acaba de montarse". Hace falta porque
// onChange dispara YA al montar: sin esto, abrir la pestaña y no tocar nada
// guardaba el mapa igualmente, y a partir de ahí tu copia congelada tapaba para
// siempre lo que dijera flujo.js.
const huella = (els) => `${els.length}:${els.reduce((n, e) => n + e.version, 0)}`

const Mapa = ({ tema }) => {
  // Cambiar la versión remonta el lienzo: initialData solo se lee al montar.
  const [version, setVersion] = useState(0)
  const [editado, setEditado] = useState(() => !!leerMapa())
  const elementos = useMemo(dibujar, [version])
  const reloj = useRef(0)
  const partida = useRef('')
  const [api, setApi] = useState(null)

  // El diagrama mide 1.900 x 2.100: al 100% se abre por una esquina y parece
  // que falta la mitad. initialData.scrollToContent centra pero NO cambia el
  // zoom; encuadrarlo es esto, y hay que esperar a tener la API.
  useEffect(() => {
    if (!api) return undefined
    // Un frame de espera: la API llega en el montaje, cuando el contenedor aún
    // mide cero, y encuadrar contra un lienzo de cero no hace nada.
    const t = requestAnimationFrame(() => api.scrollToContent(api.getSceneElements(), { fitToContent: true }))
    return () => cancelAnimationFrame(t)
  }, [api, version])

  // onChange dispara en CADA movimiento del ratón, también al pasar por encima
  // sin tocar nada. Sin el retardo, escribir en localStorage sería el trabajo
  // principal del navegador mientras arrastras una caja.
  const cambio = (els) => {
    const ahora = huella(els)
    if (!partida.current) { partida.current = ahora; return } // el del montaje
    if (ahora === partida.current) return
    clearTimeout(reloj.current)
    reloj.current = setTimeout(() => {
      guardarMapa(els)
      setEditado(true)
    }, 1000)
  }

  // Sin esto, tu versión editada taparía para siempre los cambios que haga
  // flujo.js: el mapa del código nunca volvería a verse.
  const restablecer = () => {
    if (!window.confirm('¿Volver al mapa del código y perder lo que hayas dibujado?')) return
    clearTimeout(reloj.current)
    partida.current = ''
    guardarMapa(null)
    setEditado(false)
    setVersion((v) => v + 1)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-8 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
            El flujo
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--s-muted)' }}>
            {editado
              ? 'Con tus cambios encima. Se guarda solo en este navegador.'
              : 'Salido de src/studio/flujo.js. Muévelo, escribe encima: se guarda solo.'}
          </p>
        </div>
        {editado && (
          <button
            onClick={restablecer}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold"
            style={{ background: 'var(--s-chip)', color: 'var(--s-accent-dark)' }}
          >
            <RotateCcw size={14} /> Restablecer
          </button>
        )}
      </div>

      {/* .lienzo está en index.css y es imprescindible: el `height: 100%` que
          trae Excalidraw se resuelve contra la altura declarada del padre, que
          aquí sale de flex-grow, así que computa a cero y el lienzo desaparece
          sin un solo error. Ver la regla, que lo explica entero. */}
      <div className="lienzo flex-1 min-h-0">
        <Excalidraw
          key={version}
          // Excalidraw no lee los tokens de la app: tiene su propio tema, y en
          // oscuro INVIERTE el lienzo. Por eso el fondo se queda en blanco pase
          // lo que pase: dárselo ya oscuro lo invertía a claro, que es justo lo
          // contrario de lo que se pedía.
          theme={tema === 'oscuro' ? 'dark' : 'light'}
          initialData={{ elements: elementos, appState: { viewBackgroundColor: '#ffffff' } }}
          excalidrawAPI={setApi}
          onChange={cambio}
          langCode="es-ES"
        />
      </div>
    </div>
  )
}

export default Mapa
