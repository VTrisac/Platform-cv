import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { buscarFeed } from './api'

// Pantalla "Feed": las ofertas que hay AHORA en LinkedIn y en los tableros
// públicos que sigues, ya filtradas por tus criterios.
//
// ponytail: sin cron y sin base de datos. El feed se recalcula al abrir la app
// como mucho una vez al día (la marca vive en el store); un cron necesitaría
// dónde escribir mientras tienes el navegador cerrado, y estas ofertas son dato
// derivado que no merece almacenamiento.
const Feed = ({ feed, setFeed, preset, ofertas, onAuditar, onCriterios }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Lo recién traído vive aquí además de en la caché. El store no sella con
  // fecha un resultado con fuentes caídas por algo pasajero, así que devolvería
  // null y el efecto de abajo volvería a pedirlo en bucle. Lo que se ve es esto.
  const [datos, setDatos] = useState(null)
  const vista = datos ?? feed

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

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
            Feed
          </h1>
          <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
            {loading
              ? 'Consultando LinkedIn y los tableros…'
              : vista
                ? `${jobs.length} de ${vista.total} ofertas`
                  + (ventana === '24h' ? ' · últimas 24 horas' : ventana === 'semana' ? ' · última semana' : '')
                : 'Sin resultados todavía.'}
          </p>
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
        <p className="text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
        </p>
      )}

      {/* Por qué se cayó cada oferta. Un filtro que descarta en silencio es un
          filtro en el que dejas de confiar a la semana. */}
      {descartes.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--s-muted)' }}>
          Descartadas: {descartes.map(([m, n]) => `${n} por ${m}`).join(' · ')}.
        </p>
      )}

      {/* Un token caducado no da error, da cero ofertas: sin este aviso la
          fuente desaparece del feed y no te enteras. */}
      {vista?.dead?.length > 0 && (
        <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: '#F9F1E4', color: '#8A6D2E' }}>
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
          style={{ background: '#F5F1E6', color: 'var(--s-muted)', letterSpacing: '0.3px' }}
        >
          <span className="w-[60px]">ENCAJE</span>
          <span className="w-[90px]">FECHA</span>
          <span className="w-[150px]">EMPRESA</span>
          <span className="flex-1">PUESTO</span>
          <span className="w-[160px]">UBICACIÓN</span>
          <span className="w-[90px]">SALARIO</span>
          <span className="w-[220px]">CUBRES</span>
          <span className="w-[90px] text-right">ACCIONES</span>
        </div>

        {!loading && jobs.length === 0 && (
          <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--s-muted)' }}>
            Ninguna oferta pasa los filtros. Amplía la ventana de tiempo o afloja los criterios.
          </p>
        )}

        {jobs.map((j) => {
          const yaVista = vistas.has(`${j.company}|${j.title}`.toLowerCase())
          return (
            <div
              key={j.url}
              className="flex items-center gap-4 px-5 py-3.5 border-t"
              style={{ borderColor: 'var(--s-border)', opacity: yaVista ? 0.55 : 1 }}
            >
              <span className="w-[60px]">
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: j.nota >= 8 ? '#E3EBDC' : j.nota >= 6 ? '#F3EAD6' : '#EFEADB',
                    color: j.nota >= 8 ? '#48603F' : j.nota >= 6 ? '#8A6D2E' : '#6C6F5C',
                  }}
                  title={`Cubres ${j.hits.length} de las ${j.stack.length} tecnologías que pide`}
                >
                  {j.nota}/10
                </span>
              </span>
              <span className="w-[90px] text-[13px]" style={{ color: 'var(--s-muted)' }}>{j.fecha ?? '—'}</span>
              <span className="w-[150px] text-sm font-semibold truncate" title={j.company}>{j.company}</span>
              <a
                href={j.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-sm truncate flex items-center gap-1.5 hover:underline"
                title={j.title}
              >
                {j.title}
                <ExternalLink size={12} className="shrink-0" style={{ color: 'var(--s-muted)' }} />
              </a>
              <span className="w-[160px] text-[13px] truncate" style={{ color: 'var(--s-muted)' }} title={j.location}>
                {j.location}
              </span>
              <span className="w-[90px] text-[13px]" style={{ color: j.salario ? 'var(--s-accent-dark)' : 'var(--s-muted)' }}>
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
              <span className="w-[90px] flex items-center justify-end">
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
          )
        })}
      </div>
    </div>
  )
}

export default Feed
