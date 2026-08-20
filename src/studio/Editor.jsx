import { useEffect, useRef, useState, Suspense, lazy } from 'react'
import { ArrowLeft, Copy, FileDown, Loader2, Mail, Save, Search, Send, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { dataES, dataEN } from '../data'
import { conPerfil, conSalario } from '../perfil'
import Auditoria from './Auditoria'
import Proceso from './Proceso'
import { FASES } from './lote'
import { apiPost, auditar as auditarOferta, aplicar as mandarAExtension, base64, descargarPdf, hayExtension, INSTALAR, nombrePdf, olvidarCarpeta, pdfBlob } from './api'

const DESIGNS = [
  { id: 5, name: 'ATS', load: () => import('../designs/Design6ATS') },
  { id: 0, name: 'Minimalista', load: () => import('../designs/Design1Minimal') },
  { id: 3, name: 'Tarjetas', load: () => import('../designs/Design4Cards') },
]
const components = DESIGNS.map((d) => lazy(d.load))

const Card = ({ title, children, right }) => (
  <div
    className="rounded-[20px] border p-5 flex flex-col gap-2.5"
    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.3px' }}>
        {title}
      </span>
      {right}
    </div>
    {children}
  </div>
)

const field = {
  background: 'var(--s-bg)', border: '1px solid var(--s-border)', borderRadius: 10,
  padding: '9px 12px', outline: 'none', width: '100%', fontSize: 13,
}

const PASOS = [
  ['oferta', 'Auditar oferta'],
  ['auditoria', 'Ver encaje'],
  ['cv', 'Adaptar CV'],
]

// Lo que pasa al pulsar "Aplicar". El relleno del formulario ya no se ve aquí:
// lo cuenta el panel de la extensión, en la pestaña del portal.
const APLICAR = [
  ['aplicar', 'Generando el PDF'],
  ['portal', 'Abriendo el portal'],
]

// Flujo en tres pasos: auditar la oferta -> decidir si hay encaje -> adaptar.
// El orden importa: adaptar primero gastaba una llamada al modelo incluso en
// ofertas que no valían la pena, y enterraba los gaps DESPUÉS de haber decidido.
const Editor = ({ oferta, urlInicial, perfil, autoAplicar, onBack, onGuardar, onCV, onDescartar, onAuditada, onCarta, onAplicado }) => {
  // Si la oferta ya trae auditoría guardada, se entra directo al informe: es
  // el caso normal desde el tracker, y volver a auditar costaría otra llamada.
  const [audit, setAudit] = useState(oferta?.auditoria ?? null)
  // Con el CV ya adaptado guardado se entra directo al paso 3: reabrir una
  // oferta del tracker no debe volver a pagar la adaptación.
  const [paso, setPaso] = useState(oferta?.cv ? 'cv' : oferta?.auditoria ? 'auditoria' : 'oferta')
  const [lang, setLang] = useState(oferta?.lang ?? (oferta?.variante?.endsWith('ES') ? 'es' : 'en'))
  const [design, setDesign] = useState(0)
  // Del feed llega la URL ya puesta: la auditoría la scrapea igual que si la
  // hubieras pegado tú, así que no hace falta otro camino para esto.
  const [texto, setTexto] = useState(urlInicial ?? '')
  const [nombre, setNombre] = useState(oferta?.variante ?? '')
  const [data, setData] = useState(oferta?.cv ?? null)
  const [meta, setMeta] = useState(null)
  const [carta, setCarta] = useState(oferta?.carta ?? null)
  const [cartaInv, setCartaInv] = useState([])
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)
  const [guardado, setGuardado] = useState(null)
  const previewRef = useRef(null)

  const cv = data ?? (lang === 'es' ? dataES : dataEN)
  const Preview = components[design]

  // Los diseños se cargan con import() dinámico y Suspense. Si se manda a
  // imprimir antes de que resuelva, Chromium imprime el "Cargando…" y sale un
  // PDF de nueve caracteres. Pasó de verdad al aplicar desde el tracker, que no
  // da tiempo a que cargue porque no lo pulsa un humano.
  // El índice se pasa a mano: setDesign no actualiza la variable de este cierre,
  // así que al aplicar habría esperado al diseño anterior.
  const esperarPreview = async (idx = design, i = 0) => {
    await DESIGNS[idx].load()
    if ((previewRef.current?.textContent ?? '').length > 200 || i > 30) return
    await new Promise((r) => setTimeout(r, 100))
    return esperarPreview(idx, i + 1)
  }

  // El HTML que se ve, tal cual, para que Chromium lo imprima. Lo comparten
  // descargar y aplicar: el PDF que se adjunta es el mismo que te bajas.
  const paraImprimir = (filename) => ({
    html: previewRef.current.innerHTML,
    styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
    css: [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'),
    filename,
  })

  // El nombre de la variante, que es lo que se guarda con la oferta.
  const variante = () => `${audit?.empresa ?? oferta?.empresa ?? 'Oferta'} · ${lang.toUpperCase()}`

  // La empresa y el puesto ya los sabe la auditoría: el nombre sale de ahí.
  const nombreFichero = () =>
    nombrePdf(audit?.empresa ?? oferta?.empresa, audit?.rol ?? oferta?.puesto, lang)

  // Manda el HTML del CV que se ve a que Chromium lo imprima limpio en el
  // servidor. Sustituye a window.print(), que estampaba cabecera y pie del
  // navegador. Se envían los <link> del build y el CSS inline de dev para que
  // el PDF salga con estilo en los dos sitios.
  const bajarPdf = async () => {
    if (!previewRef.current) return
    setLoading('pdf'); setError(null)
    try {
      await esperarPreview()
      const carpeta = await descargarPdf(paraImprimir(nombreFichero()))
      setGuardado(carpeta ? `Guardado en ${carpeta}/${nombreFichero()}` : null)
    } catch (e) { setError(e.message) } finally { setLoading(null) }
  }

  // La URL de origen para postular: lo pegado si es un enlace, o la que ya
  // traía la oferta. Se persiste con la auditoría.
  const fuenteUrl = /^https?:\/\//i.test(texto.trim()) ? texto.trim() : (oferta?.url ?? null)

  // Aplicar: genera el PDF, arma el paquete y se lo pasa a la extensión, que
  // abre la oferta y rellena el formulario en TU sesión. Aquí no se puede
  // hacer: una web no toca el formulario de otro dominio, lo prohíbe el
  // navegador. Y la extensión no pulsa enviar: eso lo confirmas tú.
  const aplicar = async () => {
    if (!fuenteUrl) return setError('Esta oferta no tiene enlace. Pega su URL en el paso 1 o inscríbete a mano.')
    if (!hayExtension()) return setError(INSTALAR)
    setLoading('aplicar'); setError(null)
    try {
      // Al portal solo sube el diseño ATS: es el único que un parser lee bien.
      // Si estabas mirando otro, se cambia y se espera al repintado, porque el
      // PDF sale del DOM y no de los datos.
      if (design !== 0) setDesign(0)
      await esperarPreview(0)
      const filename = nombreFichero()
      const blob = await pdfBlob(paraImprimir(filename))
      await mandarAExtension({
        url: fuenteUrl,
        origin: window.location.origin,
        key: localStorage.getItem('tailorKey') ?? '',
        lang,
        // Las pretensiones salen de la auditoría de ESTA oferta si no las has
        // fijado tú en Perfil: es el campo que siempre acababa en naranja.
        perfil: conSalario(conPerfil(perfil), audit?.salario ?? oferta?.auditoria?.salario),
        carta,
        oferta: { empresa: audit?.empresa, puesto: audit?.rol, texto: audit?.texto },
        cv: { nombre: filename, tipo: 'application/pdf', base64: await base64(blob) },
      })
      onAplicado?.()
    } catch (e) { setError(e.message) } finally { setLoading(null) }
  }

  // Desde el tracker se entra con el "Aplicar" ya pulsado: es la acción que
  // pediste, no otra pantalla intermedia. La bandera evita repetirlo si el
  // componente vuelve a renderizar.
  const disparado = useRef(false)
  useEffect(() => {
    if (autoAplicar && paso === 'cv' && data && !disparado.current) {
      disparado.current = true
      aplicar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAplicar, paso, data])

  const auditar = async () => {
    if (!texto.trim()) return setError('Pega la URL de la oferta o su texto.')
    setLoading('auditar'); setError(null)
    try {
      const a = await auditarOferta(texto, lang)
      setAudit(a)
      setNombre(`${a.empresa} · ${lang.toUpperCase()}`)
      setPaso('auditoria')
      onAuditada?.(a, lang, fuenteUrl) // se guarda con la oferta, no se vuelve a pagar
    } catch (e) { setError(e.message) } finally { setLoading(null) }
  }

  // Preparar la candidatura entera de un tirón: auditar -> si hay encaje,
  // adaptar el CV -> escribir la carta. Deja todo listo para que el envío lo
  // des tú. Si la auditoría recomienda descartar, se para ahí y no gasta las
  // dos llamadas siguientes en una oferta que no vale la pena.
  const prepararTodo = async () => {
    if (!texto.trim()) return setError('Pega la URL de la oferta o su texto.')
    setError(null)
    try {
      setLoading('auditar')
      // `a.texto` (recién scrapeado), no el estado `audit`: setState es async y
      // aún no habría cuajado para los dos pasos siguientes.
      const a = await auditarOferta(texto, lang)
      setAudit(a); setNombre(`${a.empresa} · ${lang.toUpperCase()}`); setPaso('auditoria')
      onAuditada?.(a, lang, fuenteUrl)
      if (a.recomendacion === 'descartar') return // se para, decides tú desde el informe

      setLoading('adaptar')
      const j = await apiPost('/api/tailor', { text: a.texto, lang })
      setData(j.data); setMeta(j); setPaso('cv')
      // Se guarda con la oferta AQUÍ, igual que la auditoría y la carta. Sin
      // esto el CV solo vivía en este componente: al volver al tracker no había
      // nada que mandar al portal y por eso el botón "Aplicar" no salía nunca.
      onCV?.(`${a.empresa} · ${lang.toUpperCase()}`, j.data)

      setLoading('carta')
      const c = await apiPost('/api/cover', { text: a.texto, lang })
      setCarta(c.carta); setCartaInv(c.inventions ?? []); onCarta?.(c.carta)
    } catch (e) { setError(e.message) } finally { setLoading(null) }
  }

  const adaptar = async () => {
    setLoading('adaptar'); setError(null)
    try {
      // Se reenvía el texto que ya scrapeó la auditoría: ni se baja dos veces
      // ni se arriesga a que el portal devuelva algo distinto.
      const j = await apiPost('/api/tailor', { text: audit.texto, lang })
      setData(j.data); setMeta(j); setPaso('cv')
      setNombre(variante())
      onCV?.(variante(), j.data)
    } catch (e) { setError(e.message); setPaso('auditoria') } finally { setLoading(null) }
  }

  // Llamada aparte de la adaptación: no toda oferta merece carta y adaptar ya
  // tarda ~35 s. Se reenvía el mismo texto que scrapeó la auditoría.
  const generarCarta = async () => {
    setLoading('carta'); setError(null)
    try {
      const j = await apiPost('/api/cover', { text: audit.texto, lang })
      setCarta(j.carta)
      setCartaInv(j.inventions ?? [])
      onCarta?.(j.carta)
    } catch (e) { setError(e.message) } finally { setLoading(null) }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} title="Volver"><ArrowLeft size={18} style={{ color: 'var(--s-muted)' }} /></button>
          <h2 className="text-[22px] font-semibold" style={{ fontFamily: 'var(--s-display)' }}>
            {audit ? `${audit.empresa} · ${lang.toUpperCase()}` : oferta?.empresa ?? 'Nueva oferta'}
          </h2>
          {/* Migas de pan: dejan claro que adaptar viene DESPUÉS de decidir */}
          <div className="flex items-center gap-1.5 ml-2">
            {PASOS.map(([id, label], i) => {
              const activo = paso === id
              const hecho = PASOS.findIndex(([p]) => p === paso) > i
              return (
                <span key={id} className="flex items-center gap-1.5">
                  {i > 0 && <span style={{ color: 'var(--s-border)' }}>›</span>}
                  <span
                    className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{
                      background: activo ? 'var(--s-chip-green)' : 'transparent',
                      color: activo ? 'var(--s-accent-dark)' : hecho ? 'var(--s-accent)' : 'var(--s-muted)',
                    }}
                  >
                    {i + 1}. {label}
                  </span>
                </span>
              )
            })}
          </div>
        </div>

        {paso === 'cv' && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={bajarPdf}
              disabled={loading === 'pdf'}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border disabled:opacity-50"
              style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
            >
              {loading === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
              {loading === 'pdf' ? 'Generando…' : 'Descargar PDF'}
            </button>
            <button
              onClick={() => onGuardar(nombre, data)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border"
              style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
            >
              <Save size={15} /> Guardar variante
            </button>
            <button
              onClick={aplicar}
              disabled={!!loading}
              title={fuenteUrl ? `Rellenar el formulario de ${fuenteUrl}` : 'Esta oferta no tiene enlace'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold disabled:opacity-50"
              style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
            >
              {loading === 'aplicar' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {loading === 'aplicar' ? 'Preparando…' : 'Aplicar'}
            </button>
          </div>
        )}
      </div>

      <div className="px-8 pb-8 flex-1 min-h-0 overflow-auto">
        {paso === 'oferta' && (
          <div className="max-w-[720px] flex flex-col gap-4">
            <Card
              title="1. LA OFERTA"
              right={
                <div className="flex rounded-[10px] p-0.5" style={{ background: 'var(--s-bg)', border: '1px solid var(--s-border)' }}>
                  {['es', 'en'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: lang === l ? 'var(--s-accent)' : 'transparent', color: lang === l ? '#FDFBF4' : 'var(--s-muted)' }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              }
            >
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={7}
                placeholder="Pega la URL de la oferta (LinkedIn, Greenhouse…) o su texto completo…"
                style={{ ...field, resize: 'vertical' }}
              />
              <p className="text-xs" style={{ color: 'var(--s-muted)' }}>
                «Preparar todo» audita, y si encajas adapta el CV y escribe la carta, dejándolo
                listo para que envíes tú. «Solo auditar» se queda en el informe de encaje.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={prepararTodo}
                  disabled={!!loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold w-fit disabled:opacity-50"
                  style={{ background: 'var(--s-accent)', color: '#FDFBF4' }}
                >
                  <Sparkles size={15} />
                  {loading ? 'Preparando…' : 'Preparar todo'}
                </button>
                <button
                  onClick={auditar}
                  disabled={!!loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold w-fit border disabled:opacity-50"
                  style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', color: 'var(--s-muted)' }}
                >
                  <Search size={15} /> Solo auditar
                </button>
              </div>
              {/* Los tres pasos con nombre, no un icono girando dos minutos:
                  auditar son ~50 s y adaptar ~35 s más. */}
              {loading && loading !== 'pdf' && <Proceso pasos={FASES} activo={loading} />}
              {error && (
                <p className="text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
                  <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
                </p>
              )}
            </Card>
          </div>
        )}

        {paso === 'auditoria' && audit && (
          <>
            <Auditoria
              a={audit}
              onAdaptar={adaptar}
              onDescartar={() => { onDescartar?.(audit); onBack() }}
            />
            {loading === 'adaptar' && (
              <div className="mt-4 max-w-[420px]">
                <Proceso pasos={FASES} activo="adaptar" nota="Tarda unos 35 segundos." />
              </div>
            )}
            {error && (
              <p className="mt-4 text-xs flex gap-1.5" style={{ color: '#8A4A3C' }}>
                <TriangleAlert size={13} className="shrink-0 mt-0.5" />{error}
              </p>
            )}
          </>
        )}

        {paso === 'cv' && (
          <div className="flex gap-6 h-full">
            <div className="w-[420px] flex flex-col gap-4 overflow-auto no-print shrink-0">
              {/* En el paso 3 no había DÓNDE enseñar un error: bajarPdf() y
                  aplicar() llamaban a setError y el mensaje no se pintaba en
                  ningún sitio, así que pulsar "Aplicar" sin la extensión no
                  hacía nada visible. */}
              {error && (
                <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: '#F9EDEA', color: '#8A4A3C' }}>
                  <TriangleAlert size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                </p>
              )}
              {loading === 'aplicar' && (
                <Proceso pasos={APLICAR} activo="aplicar" nota="El formulario lo rellena la extensión en la pestaña que abra." />
              )}
              {guardado && (
                <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: 'var(--s-chip-green)', color: 'var(--s-accent-dark)' }}>
                  <FileDown size={13} className="shrink-0 mt-0.5" />
                  <span>
                    {guardado}{' · '}
                    <button
                      onClick={async () => { await olvidarCarpeta(); setGuardado(null) }}
                      className="underline"
                    >
                      cambiar carpeta
                    </button>
                  </span>
                </p>
              )}
              {/* El botón Aplicar se pinta con extensión o sin ella y solo falla
                  al pulsarlo. Decirlo antes cuesta cuatro líneas. */}
              {!hayExtension() && (
                <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: '#F9F1E4', color: '#8A6D2E' }}>
                  <TriangleAlert size={13} className="shrink-0 mt-0.5" /><span>{INSTALAR}</span>
                </p>
              )}
              {meta && (
                <Card title="RESULTADO">
                  <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-muted)' }}>
                    <ShieldCheck size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--s-accent)' }} />
                    <span><b>Bloqueado:</b> {meta.dropped?.join(', ') || 'nada inventado'}</span>
                  </p>
                  {meta.inventions?.length > 0 && (
                    <p className="text-xs flex gap-1.5 p-2 rounded-lg" style={{ background: '#F9EDEA', color: '#8A4A3C' }}>
                      <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                      <span><b>Revisa el perfil:</b> menciona {meta.inventions.join(', ')}, que no está en tu CV.</span>
                    </p>
                  )}
                  <button
                    onClick={() => setPaso('auditoria')}
                    className="text-xs w-fit underline"
                    style={{ color: 'var(--s-muted)' }}
                  >
                    ← volver al informe de encaje
                  </button>
                </Card>
              )}
              <Card title="PERFIL">
                <textarea
                  value={cv.profile}
                  onChange={(e) => setData({ ...cv, profile: e.target.value })}
                  rows={7}
                  style={{ ...field, resize: 'vertical' }}
                />
              </Card>
              <Card
                title="CARTA DE PRESENTACIÓN"
                right={carta && (
                  <button
                    onClick={() => navigator.clipboard.writeText(carta)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--s-muted)' }}
                    title="Copiar al portapapeles"
                  >
                    <Copy size={13} /> Copiar
                  </button>
                )}
              >
                {carta ? (
                  <>
                    <textarea
                      value={carta}
                      onChange={(e) => { setCarta(e.target.value); onCarta?.(e.target.value) }}
                      rows={12}
                      style={{ ...field, resize: 'vertical' }}
                    />
                    {/* Misma señal que en el CV: la carta es texto libre y no se
                        puede filtrar, solo avisar de lo que se contradice. */}
                    {cartaInv.length > 0 && (
                      <p className="text-xs flex gap-1.5 p-2 rounded-lg" style={{ background: '#F9EDEA', color: '#8A4A3C' }}>
                        <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                        <span><b>Revisa la carta:</b> menciona {cartaInv.join(', ')}, que no está en tu CV.</span>
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    onClick={generarCarta}
                    disabled={loading === 'carta'}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold border w-fit disabled:opacity-50"
                    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
                  >
                    {loading === 'carta' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} style={{ color: 'var(--s-accent)' }} />}
                    {loading === 'carta' ? 'Escribiendo…' : 'Generar carta'}
                  </button>
                )}
              </Card>
              <Card title="NOMBRE DE LA VARIANTE">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={field} />
              </Card>
            </div>

            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between no-print">
                <div className="flex gap-2">
                  {DESIGNS.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => setDesign(i)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={{
                        background: design === i ? 'var(--s-accent)' : 'var(--s-surface)',
                        color: design === i ? '#FDFBF4' : 'var(--s-muted)',
                        borderColor: design === i ? 'var(--s-accent)' : 'var(--s-border)',
                      }}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
                  Solo el diseño ATS se sube a un portal
                </span>
              </div>
              <div
                ref={previewRef}
                className="flex-1 overflow-auto rounded-[20px] border"
                style={{ background: '#fff', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
              >
                <Suspense fallback={<p className="p-8 text-sm" style={{ color: 'var(--s-muted)' }}>Cargando…</p>}>
                  <Preview data={cv} />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Editor
