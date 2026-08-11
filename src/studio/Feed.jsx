import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, TriangleAlert } from 'lucide-react'
import { buscarFeed } from './api'

// Pantalla "Feed": las ofertas que hay AHORA en los tableros públicos de las
// empresas que sigues, ordenadas por cuántas de tus keywords aparecen.
//
// ponytail: sin cron y sin base de datos. El feed se recalcula al abrir la app
// como mucho una vez al día (la marca vive en el store); un cron necesitaría
// dónde escribir mientras tienes el navegador cerrado, y estas ofertas son dato
// derivado que no merece almacenamiento.
const ATS = ['greenhouse', 'lever', 'ashby', 'workable', 'remoteok', 'adzuna']

const campo = {
  background: 'var(--s-bg)', border: '1px solid var(--s-border)', borderRadius: 10,
  padding: '8px 11px', outline: 'none', fontSize: 13,
}

const Feed = ({ feed, setFeed, preset, setPreset, ofertas, onAuditar }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [abierto, setAbierto] = useState(false)

  const cargar = async () => {
    setLoading(true); setError(null)
    try {
      setFeed(await buscarFeed(preset))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Sin preset propio, se edita a partir del que el servidor dice haber usado:
  // así el panel arranca con las 11 empresas de siempre sin que el front tenga
  // que importarlas (arrastraría el SDK de OpenAI al bundle).
  const actual = preset ?? feed?.preset
  const editar = (patch) => actual && setPreset({ ...actual, ...patch })
  const editarEmpresa = (i, patch) =>
    editar({ empresas: actual.empresas.map((e, n) => (n === i ? { ...e, ...patch } : e)) })

  // Solo si no hay caché de hoy: el store devuelve null cuando ha caducado.
  useEffect(() => {
    if (!feed && !loading && !error) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed])

  // "Ya en el tracker": misma empresa y mismo puesto. Es el equivalente al
  // cruce que el CLI hace contra ofertas/, aplicado a lo que tienes guardado.
  const vistas = new Set(ofertas.map((o) => `${o.empresa}|${o.puesto}`.toLowerCase()))
  const jobs = feed?.jobs ?? []

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
            Feed
          </h1>
          <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
            {loading
              ? 'Consultando los tableros…'
              : feed
                ? `${jobs.length} ofertas · ${feed.total - jobs.length} descartadas con pocas coincidencias`
                : 'Sin resultados todavía.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAbierto((v) => !v)}
            disabled={!actual}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border disabled:opacity-50"
            style={{
              background: abierto ? 'var(--s-chip)' : 'var(--s-surface)',
              borderColor: 'var(--s-border)',
            }}
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

      {abierto && actual && (
        <div
          className="rounded-[20px] border p-5 flex flex-col gap-4"
          style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
        >
          <div className="flex items-center gap-6">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)' }}>UBICACIÓN (regex)</span>
              <input
                value={actual.ubicacion}
                onChange={(e) => editar({ ubicacion: e.target.value })}
                style={campo}
              />
            </label>
            <label className="flex flex-col gap-1.5 w-[200px]">
              <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)' }}>
                MÍNIMO DE COINCIDENCIAS
              </span>
              <input
                type="number"
                min={0}
                value={actual.minHits}
                onChange={(e) => editar({ minHits: Number(e.target.value) })}
                style={campo}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)' }}>
              EMPRESAS ({actual.empresas.length})
            </span>
            {actual.empresas.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={e.name}
                  onChange={(ev) => editarEmpresa(i, { name: ev.target.value })}
                  placeholder="Nombre"
                  style={{ ...campo, width: 200 }}
                />
                <select
                  value={e.ats}
                  onChange={(ev) => editarEmpresa(i, { ats: ev.target.value })}
                  style={{ ...campo, width: 140, cursor: 'pointer' }}
                >
                  {ATS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <input
                  value={e.token}
                  onChange={(ev) => editarEmpresa(i, { token: ev.target.value })}
                  placeholder="token (el slug de su página de empleo)"
                  style={{ ...campo, flex: 1 }}
                />
                <button
                  onClick={() => editar({ empresas: actual.empresas.filter((_, n) => n !== i) })}
                  title={`Quitar ${e.name}`}
                >
                  <Trash2 size={15} style={{ color: 'var(--s-muted)' }} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => editar({ empresas: [...actual.empresas, { name: '', ats: 'greenhouse', token: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--s-accent)' }}
              >
                <Plus size={14} /> Añadir empresa
              </button>
              {preset && (
                <button
                  onClick={() => setPreset(null)}
                  className="text-xs underline"
                  style={{ color: 'var(--s-muted)' }}
                >
                  volver a los criterios por defecto
                </button>
              )}
            </div>
          </div>

          <p className="text-xs" style={{ color: 'var(--s-muted)' }}>
            El token es el slug de su página de empleo: boards.greenhouse.io/<b>token</b>,
            jobs.lever.co/<b>token</b>, <b>token</b>.workable.com. Pulsa Actualizar para aplicar.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
        </p>
      )}

      {/* Un token caducado no da error, da cero ofertas: sin este aviso la
          empresa desaparece del feed y no te enteras. */}
      {feed?.dead?.length > 0 && (
        <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: '#F9F1E4', color: '#8A6D2E' }}>
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />
          <span>
            <b>Sin resultados:</b> {feed.dead.map((d) => `${d.name} (${d.error})`).join(', ')}. El token o el ATS
            han cambiado.
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
          <span className="w-[60px]">MATCH</span>
          <span className="w-[150px]">EMPRESA</span>
          <span className="flex-1">PUESTO</span>
          <span className="w-[180px]">UBICACIÓN</span>
          <span className="w-[260px]">COINCIDENCIAS</span>
          <span className="w-[90px] text-right">ACCIONES</span>
        </div>

        {!loading && jobs.length === 0 && (
          <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--s-muted)' }}>
            No hay ofertas que cumplan el umbral. Baja el mínimo de coincidencias o añade empresas.
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
                    background: j.hits.length >= 5 ? '#E3EBDC' : j.hits.length >= 3 ? '#F3EAD6' : '#EFEADB',
                    color: j.hits.length >= 5 ? '#48603F' : j.hits.length >= 3 ? '#8A6D2E' : '#6C6F5C',
                  }}
                >
                  {j.hits.length}
                </span>
              </span>
              <span className="w-[150px] text-sm font-semibold truncate" title={j.company}>
                {j.company}
              </span>
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
              <span className="w-[180px] text-[13px] truncate" style={{ color: 'var(--s-muted)' }} title={j.location}>
                {j.location}
              </span>
              <span className="w-[260px] text-xs truncate" style={{ color: 'var(--s-muted)' }} title={j.hits.join(', ')}>
                {j.hits.join(', ')}
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
