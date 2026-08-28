import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { buscarFeed } from './api'
import Proceso from './Proceso'

// Pantalla "Feed": las ofertas que hay AHORA en LinkedIn y en los tableros
// públicos que sigues, ya filtradas por tus criterios.
//
// ponytail: sin cron y sin base de datos. El feed se recalcula al abrir la app
// como mucho una vez al día (la marca vive en el store); un cron necesitaría
// dónde escribir mientras tienes el navegador cerrado, y estas ofertas son dato
// derivado que no merece almacenamiento.
// Los tres pasos del motor de api/feed.js, que es lo que está pasando de verdad
// mientras esperas: consultar cada tablero, bajar la descripción de lo que pasa
// la criba barata, y filtrar por el texto. Tarda minutos y antes solo se veía
// una línea fija.
const BUSQUEDA = [
  ['tableros', 'Consultando tableros'],
  ['detalle', 'Bajando descripciones'],
  ['filtrar', 'Ordenando por tus criterios'],
]

// Un criterio que no se cumple es un aviso, no una desaparición (28-08-2026).
// Antes cada uno borraba la oferta y el único rastro era un contador de
// descartes: "388 por modalidad" y a saber cuál era la buena.
const Aviso = ({ children }) => (
  <span
    className="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
    style={{ background: 'var(--s-atencion-f)', color: 'var(--s-atencion)' }}
  >
    {children}
  </span>
)

const Feed = ({ feed, setFeed, preset, ofertas, onAuditar, onCriterios }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Lo recién traído vive aquí además de en la caché. El store no sella con
  // fecha un resultado con fuentes caídas por algo pasajero, así que devolvería
  // null y el efecto de abajo volvería a pedirlo en bucle. Lo que se ve es esto.
  const [datos, setDatos] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const vista = datos ?? feed

  // Un segundero mientras busca, y solo mientras busca: es lo que hace avanzar
  // los pasos del raíl.
  useEffect(() => {
    if (!loading) return setSegundos(0)
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [loading])

  const cargar = async () => {
    setLoading(true); setError(null)
    try {
      const r = await buscarFeed(preset)
      setDatos(r)
      setFeed(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Solo si no hay caché de hoy: el store devuelve null cuando ha caducado.
  useEffect(() => {
    if (!vista && !loading && !error) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  // "Ya en el tracker": misma empresa y mismo puesto.
  const vistas = new Set(ofertas.map((o) => `${o.empresa}|${o.puesto}`.toLowerCase()))
  const jobs = vista?.jobs ?? []
  const descartes = Object.entries(vista?.descartes ?? {})
  const ventana = vista?.preset?.ventana
  // Cuántos criterios blandos tienes puestos. Con cero, no hay nada que separar
  // y la lista es simplemente el orden por encaje.
  const criterios = jobs[0]?.cumple?.de ?? 0
  const corte = criterios ? jobs.findIndex((j) => j.cumple.ok < j.cumple.de) : -1

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
            Feed
          </h1>
          {loading ? (
            <div className="max-w-[440px]">
              {/* ponytail: el paso activo NO viene del servidor —la respuesta llega
                  entera al final— sino de cuánto lleva esperando. Es honesto: los
                  tiempos están medidos y el orden es el real. Sacar el progreso de
                  verdad pediría streaming, que es otra arquitectura por un adorno. */}
              <Proceso
                pasos={BUSQUEDA}
                activo={BUSQUEDA[Math.min(Math.floor(segundos / 20), 2)][0]}
                nota="LinkedIn y los tableros públicos. Suele tardar entre uno y tres minutos."
              />
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
              {vista
                ? `${jobs.length} de ${vista.total} ofertas`
                  + (corte > 0 ? ` · ${corte} cumplen todo lo que pides` : '')
                  + (ventana === '24h' ? ' · últimas 24 horas' : ventana === 'semana' ? ' · última semana' : '')
                : 'Sin resultados todavía.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onCriterios}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
          >
            <SlidersHorizontal size={15} /> Criterios
          </button>
          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border disabled:opacity-50"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-perdida)' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
        </p>
      )}

      {/* Solo quedan tres motivos de descarte —ubicación, ventana y palabra
          vetada—, los tres inequívocos. Los demás criterios ya no borran nada. */}
      {descartes.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--s-muted)' }}>
          Descartadas: {descartes.map(([m, n]) => `${n} por ${m}`).join(' · ')}.
        </p>
      )}

      {/* El presupuesto de tiempo del detalle. Estas ofertas puntúan con el
          texto de su tarjeta, no con la descripción: su encaje es peor de lo que
          les toca, y callarlo sería volver a descartar en silencio. */}
      {vista?.parcial > 0 && (
        <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: 'var(--s-atencion-f)', color: 'var(--s-atencion)' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />
          <span>
            <b>{vista.parcial} ofertas sin descripción:</b> se agotó el tiempo de búsqueda y se han
            puntuado solo con su titular. Vuelve a pulsar «Actualizar» dentro de un rato.
          </span>
        </p>
      )}

      {/* Un token caducado no da error, da cero ofertas: sin este aviso la
          fuente desaparece del feed y no te enteras. */}
      {vista?.dead?.length > 0 && (
        <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: 'var(--s-atencion-f)', color: 'var(--s-atencion)' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />
          <span>
            <b>Sin resultados:</b> {vista.dead.map((d) => `${d.name} (${d.error})`).join(', ')}.
            {vista.dead.some((d) => d.reintentable)
              ? ' Es pasajero: este resultado no se ha guardado, vuelve a intentarlo en unos minutos.'
              : ' El token o el ATS han cambiado.'}
          </span>
        </p>
      )}

      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
      >
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-xs font-semibold"
          style={{ background: 'var(--s-bg)', color: 'var(--s-muted)', letterSpacing: '0.3px' }}
        >
          <span className="w-[76px]">ENCAJE</span>
          <span className="w-[90px]">FECHA</span>
          <span className="w-[150px]">EMPRESA</span>
          <span className="flex-1">PUESTO</span>
          <span className="w-[160px]">UBICACIÓN</span>
          <span className="w-[90px]">SALARIO</span>
          <span className="w-[220px]">CUBRES</span>
          <span className="w-[150px] text-right">ACCIONES</span>
        </div>

        {/* Ya solo puede quedarse vacío por los tres filtros que descartan de
            verdad, así que se nombran: "afloja los criterios" mandaba a mirar
            seis interruptores que ahora no tiran nada. */}
        {!loading && jobs.length === 0 && (
          <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--s-muted)' }}>
            Ninguna oferta pasa la ubicación, la ventana de tiempo ni las palabras vetadas.
            Son los tres únicos criterios que descartan: amplía la ventana o revisa la ubicación.
          </p>
        )}

        {jobs.map((j, i) => {
          const yaVista = vistas.has(`${j.company}|${j.title}`.toLowerCase())
          return (
            <div key={j.url}>
            {/* Dónde acaba lo que cumple todo lo que pediste. Sin esta línea, las
                dos mitades se leen como una sola lista y el orden no se ve. */}
            {i === corte && corte > 0 && (
              <p className="px-5 py-2 text-xs border-t" style={{ borderColor: 'var(--s-border)', background: 'var(--s-bg)', color: 'var(--s-muted)' }}>
                A partir de aquí, no cumplen todo lo que pides. Siguen ordenadas por encaje.
              </p>
            )}
            <div
              className="flex items-center gap-4 px-5 py-3.5 border-t"
              style={{ borderColor: 'var(--s-border)', opacity: yaVista ? 0.55 : 1 }}
            >
              <span className="w-[76px] flex flex-col items-start gap-1">
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: j.nota >= 8 ? 'var(--s-ganada-f)' : j.nota >= 6 ? 'var(--s-atencion-f)' : 'var(--s-hueco)',
                    color: j.nota >= 8 ? 'var(--s-ganada)' : j.nota >= 6 ? 'var(--s-atencion)' : 'var(--s-muted)',
                  }}
                  title={j.falta.length
                    ? `Cubres ${j.hits.length} de las ${j.stack.length} tecnologías que pide. Además usa: ${j.falta.join(', ')}`
                    : `Cubres ${j.hits.length} de las ${j.stack.length} tecnologías que pide`}
                >
                  {j.nota}/10
                </span>
                {j.cumple.de > 0 && (
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--s-muted)' }} title="Criterios tuyos que cumple">
                    {j.cumple.ok}/{j.cumple.de} criterios
                  </span>
                )}
              </span>
              <span className="w-[90px] text-[13px]" style={{ color: 'var(--s-muted)' }}>{j.fecha ?? '—'}</span>
              <span className="w-[150px] text-sm font-semibold truncate" title={j.company}>{j.company}</span>
              <span className="flex-1 min-w-0 flex flex-col gap-1">
                <a
                  href={j.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm truncate flex items-center gap-1.5 hover:underline"
                  title={j.title}
                >
                  {j.title}
                  <ExternalLink size={12} className="shrink-0" style={{ color: 'var(--s-muted)' }} />
                </a>
                {j.avisos.length > 0 && (
                  <span className="flex gap-1 flex-wrap">
                    {j.avisos.map((av) => <Aviso key={av}>{av}</Aviso>)}
                  </span>
                )}
              </span>
              <span className="w-[160px] text-[13px] truncate" style={{ color: 'var(--s-muted)' }} title={j.location}>
                {j.location}
              </span>
              <span className="w-[90px] text-[13px]" style={{ color: j.salario ? 'var(--s-text)' : 'var(--s-muted)' }}>
                {j.salario ? `${Math.round(j.salario / 1000)}k €` : 'sin salario'}
              </span>
              {/* Los dos números que hay detrás de la nota: qué cubres y de
                  cuánto. Un 8 de 10 pedidas no es lo mismo que un 8 de 4. */}
              <span
                className="w-[220px] text-xs truncate"
                style={{ color: 'var(--s-muted)' }}
                title={`Pide: ${j.stack.join(', ')}`}
              >
                <b>{j.hits.length}/{j.stack.length}</b> · {j.hits.join(', ')}
              </span>
              {/* Aquí no hay "Aplicar": sin auditar y sin adaptar no hay nada
                  que mandar, y saltarse ese orden es justo lo que no quieres. */}
              <span className="w-[150px] flex items-center justify-end gap-3">
                <a
                  href={j.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir la oferta en el portal"
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: 'var(--s-accent-dark)' }}
                >
                  <ExternalLink size={13} /> Abrir
                </a>
                {yaVista ? (
                  <span className="text-xs" style={{ color: 'var(--s-muted)' }}>en tracker</span>
                ) : (
                  <button
                    onClick={() => onAuditar(j.url)}
                    title="Auditar esta oferta contra tu CV"
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--s-accent)' }}
                  >
                    <Search size={14} /> Auditar
                  </button>
                )}
              </span>
            </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Feed
