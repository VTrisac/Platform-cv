import { useEffect } from 'react'
import { Info, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { criteriosPorDefecto } from './api'

// Pantalla de criterios: qué buscar, qué descartar y en qué ventana de tiempo.
//
// Desde el 28-08-2026 solo TRES cosas descartan de verdad —ubicación, ventana y
// palabras vetadas—, porque son inequívocas y las escribes tú. El resto ordena:
// la oferta que no los cumple sigue estando, marcada, más abajo. Antes cada uno
// tiraba ofertas por su cuenta y todos juntos eran un AND: medido sobre 534
// ofertas reales, "remoto" tiraba 388 y el combo de todos los días dejaba 26.
// Un feed vacío no es un filtro fino, es un filtro roto.
//
// El preset vive en localStorage y viaja a /api/feed en cada búsqueda. Mientras
// sea null manda el servidor con sus valores de siempre; en cuanto tocas algo
// se guarda entero y mandas tú.
// Sin adzuna: su fuente existe en api/feed.js pero necesita ADZUNA_APP_ID y
// ADZUNA_APP_KEY, que no están puestas. Ofrecerla era ofrecer una opción que
// solo puede devolver "faltan las claves". Vuelve a la lista cuando las haya.
const ATS = ['greenhouse', 'lever', 'ashby', 'workable', 'workday', 'amazon', 'remoteok']
const VENTANAS = [['24h', 'Últimas 24 horas'], ['semana', 'Última semana'], ['todo', 'Sin límite']]
const MODALIDADES = [['presencial', 'Presencial'], ['hibrido', 'Híbrido'], ['remoto', 'Remoto']]
const IA = [['indiferente', 'Indiferente'], ['con', 'Solo con IA'], ['sin', 'Solo sin IA']]

const campo = {
  background: 'var(--s-bg)', border: '1px solid var(--s-border)', borderRadius: 10,
  padding: '8px 11px', outline: 'none', fontSize: 13,
}

const Card = ({ title, hint, children }) => (
  <div
    className="rounded-[20px] border p-5 flex flex-col gap-3.5"
    style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
  >
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.3px' }}>{title}</span>
      {hint && <span className="text-xs" style={{ color: 'var(--s-muted)' }}>{hint}</span>}
    </div>
    {children}
  </div>
)

const Pills = ({ opciones, valor, onChange, multi }) => (
  <div className="flex gap-2 flex-wrap">
    {opciones.map(([id, label]) => {
      const activo = multi ? valor.includes(id) : valor === id
      return (
        <button
          key={id}
          onClick={() => onChange(multi ? (activo ? valor.filter((v) => v !== id) : [...valor, id]) : id)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border"
          style={{
            background: activo ? 'var(--s-accent)' : 'var(--s-surface)',
            color: activo ? 'var(--s-sobre-acento)' : 'var(--s-muted)',
            borderColor: activo ? 'var(--s-accent)' : 'var(--s-border)',
          }}
        >
          {label}
        </button>
      )
    })}
  </div>
)

const Criterios = ({ preset, setPreset, base, setBase, lenguajesCV }) => {
  // Sin `base` no hay de dónde partir ni con qué comparar tu lista de empresas,
  // y solo llegaba al refrescar el feed —que se cachea un día entero—. Se pide
  // aparte: no sale a buscar ofertas, así que es inmediato.
  useEffect(() => {
    if (!base) criteriosPorDefecto().then(setBase).catch(() => {})
  }, [base, setBase])

  // Sin preset propio se edita a partir del que el servidor dice usar de fábrica.
  const c = preset ?? base?.preset

  if (!c) {
    return (
      <div className="p-8">
        <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>Criterios</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--s-muted)' }}>
          Abre el Feed una vez para cargar los criterios de partida.
        </p>
      </div>
    )
  }

  const editar = (patch) => setPreset({ ...c, ...patch })
  const fuentes = c.empresas ?? []
  const busquedas = fuentes.filter((f) => f.ats === 'linkedin')
  const tableros = fuentes.filter((f) => f.ats !== 'linkedin')
  // Se reconstruye la lista entera para no depender del orden: las dos secciones
  // editan el mismo array.
  const guardar = (nuevasBusquedas, nuevosTableros) =>
    editar({ empresas: [...nuevasBusquedas, ...nuevosTableros] })

  // Las de fábrica que tu preset no tiene, y al revés. Se comparan por ats+token,
  // no por nombre: renombrar "New Relic" a "NewRelic" no debe duplicarla.
  const deFabrica = (base?.empresasPorDefecto ?? []).filter((f) => f.ats !== 'linkedin')
  const tiene = new Set(fuentes.map((f) => `${f.ats}|${f.token}`))
  const esDeFabrica = new Set(deFabrica.map((f) => `${f.ats}|${f.token}`))
  const faltan = deFabrica.filter((f) => !tiene.has(`${f.ats}|${f.token}`))
  const sobran = tableros.filter((t) => !esDeFabrica.has(`${t.ats}|${t.token}`))

  return (
    <div className="p-8 flex flex-col gap-6 max-w-[1100px]">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
          Criterios
        </h1>
        <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
          Solo la ubicación, la ventana y las palabras vetadas descartan ofertas. El resto las ordena:
          lo que cumple todo lo que pides sale arriba. Se aplica en la siguiente búsqueda del Feed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="VENTANA DE TIEMPO" hint="Las ofertas más viejas suelen estar ya cerradas.">
          <Pills opciones={VENTANAS} valor={c.ventana} onChange={(ventana) => editar({ ventana })} />
        </Card>

        <Card title="INTELIGENCIA ARTIFICIAL">
          <Pills opciones={IA} valor={c.ia} onChange={(ia) => editar({ ia })} />
        </Card>

        <Card title="MODALIDAD" hint="Se busca la palabra en el texto, y casi ninguna oferta la escribe: por eso ya no descarta. Las que no la dicen bajan marcadas como «no dice la modalidad».">
          <Pills multi opciones={MODALIDADES} valor={c.modalidades} onChange={(modalidades) => editar({ modalidades })} />
        </Card>

        <Card title="LENGUAJES" hint="Los de tu CV. Cada uno cuenta por separado: cumplir dos de tres sube más que cumplir uno. Ninguno descarta.">
          <Pills
            multi
            opciones={lenguajesCV.map((l) => [l, l])}
            valor={c.lenguajes}
            onChange={(lenguajes) => editar({ lenguajes })}
          />
        </Card>
      </div>

      <Card title="SALARIO" hint="No descarta: las que no lleguen bajan en la lista, marcadas.">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            Mínimo
            <input
              type="number"
              min={0}
              step={1000}
              value={c.salarioMin}
              onChange={(e) => editar({ salarioMin: Number(e.target.value) })}
              style={{ ...campo, width: 120 }}
            />
            € brutos/año
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              // ?? false: un preset guardado antes del 28-08-2026 trae
              // `descartarSinSalario` y no esto, y React se queja del control suelto.
              checked={c.exigirSalario ?? false}
              onChange={(e) => editar({ exigirSalario: e.target.checked })}
            />
            Priorizar las que publican salario
          </label>
        </div>
        {/* El número está medido, no estimado: 21 ofertas reales de LinkedIn de
            la última semana, tres con cifra. */}
        <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: 'var(--s-atencion-f)', color: 'var(--s-atencion)' }}>
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            Solo el <b>14%</b> de las ofertas publica salario (medido sobre 21 reales de LinkedIn).
            Este interruptor <b>ya no descarta</b> ese 86%: las manda al fondo marcadas como
            «sin salario». Antes tiraba 392 de 534 ofertas de golpe.
          </span>
        </p>
      </Card>

      {/* El filtro de inglés se quitó el 28-08-2026: frenaba la búsqueda y llegaba
          demasiado tarde, cuando la oferta ya te había costado una llamada al
          modelo. La auditoría sigue diciendo qué frase lo exige. */}
      <Card title="EXCLUSIONES" hint="Lo único de esta pantalla que descarta ofertas de verdad, junto con la ubicación y la ventana.">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)' }}>
            PALABRAS VETADAS EN EL TÍTULO
          </span>
          <input
            value={(c.veto ?? []).join(', ')}
            onChange={(e) => editar({ veto: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
            placeholder="intern, becario, sales, recruiter"
            style={{ ...campo, width: '100%' }}
          />
        </div>
      </Card>

      <Card title="BÚSQUEDAS DE LINKEDIN" hint="Cada línea es una búsqueda: qué puesto y dónde. Se bajan 30 ofertas por búsqueda.">
        {busquedas.map((b, i) => {
          const [kw = '', loc = ''] = String(b.token).split('|')
          const cambiar = (k, l) => guardar(
            busquedas.map((x, n) => (n === i ? { ...x, name: `LinkedIn · ${k || '—'}`, token: `${k}|${l}` } : x)),
            tableros
          )
          return (
            <div key={i} className="flex items-center gap-2">
              <input value={kw} onChange={(e) => cambiar(e.target.value, loc)} placeholder="Puesto (AI Engineer)" style={{ ...campo, flex: 1 }} />
              <input value={loc} onChange={(e) => cambiar(kw, e.target.value)} placeholder="Ubicación (Barcelona, Catalonia, Spain)" style={{ ...campo, flex: 1 }} />
              <button onClick={() => guardar(busquedas.filter((_, n) => n !== i), tableros)} title="Quitar búsqueda">
                <Trash2 size={15} style={{ color: 'var(--s-muted)' }} />
              </button>
            </div>
          )
        })}
        <button
          onClick={() => guardar([...busquedas, { name: 'LinkedIn · nueva', ats: 'linkedin', token: '|Spain' }], tableros)}
          className="flex items-center gap-1.5 text-xs font-semibold w-fit"
          style={{ color: 'var(--s-accent)' }}
        >
          <Plus size={14} /> Añadir búsqueda
        </button>
      </Card>

      <Card
        title="TABLEROS DE EMPRESA"
        hint="El token es el slug de su página de empleo: boards.greenhouse.io/token, jobs.lever.co/token, token.workable.com. Workday lleva cuatro trozos separados por «|» — inquilino|centro|sitio|búsqueda, que salen de inquilino.centro.myworkdayjobs.com/sitio — porque su tablero es global y hay que acotarlo. Amazon lleva «puesto|ubicación»."
      >
        {tableros.map((t, i) => {
          const cambiar = (patch) => guardar(busquedas, tableros.map((x, n) => (n === i ? { ...x, ...patch } : x)))
          return (
            <div key={i} className="flex items-center gap-2">
              <input value={t.name} onChange={(e) => cambiar({ name: e.target.value })} placeholder="Nombre" style={{ ...campo, width: 200 }} />
              <select value={t.ats} onChange={(e) => cambiar({ ats: e.target.value })} style={{ ...campo, width: 140, cursor: 'pointer' }}>
                {ATS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input value={t.token} onChange={(e) => cambiar({ token: e.target.value })} placeholder="token" style={{ ...campo, flex: 1 }} />
              <button onClick={() => guardar(busquedas, tableros.filter((_, n) => n !== i))} title={`Quitar ${t.name}`}>
                <Trash2 size={15} style={{ color: 'var(--s-muted)' }} />
              </button>
            </div>
          )
        })}
        <div className="flex items-center gap-4">
          <button
            onClick={() => guardar(busquedas, [...tableros, { name: '', ats: 'greenhouse', token: '' }])}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--s-accent)' }}
          >
            <Plus size={14} /> Añadir empresa
          </button>
          {/* Tu preset guarda TU lista de empresas y gana sobre la del servidor,
              así que una empresa nueva ahí no te llega nunca. Esto es el puente. */}
          {faltan.length > 0 && (
            <button
              onClick={() => guardar(busquedas, [...tableros, ...faltan])}
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--s-accent)' }}
              title={faltan.map((f) => f.name).join(', ')}
            >
              <Plus size={14} /> Añadir las {faltan.length} que faltan ({faltan.slice(0, 3).map((f) => f.name).join(', ')}{faltan.length > 3 ? '…' : ''})
            </button>
          )}
          {/* El simétrico del botón de arriba, y el único que QUITA: tu preset
              guarda su propia lista y se congeló el día que tocaste un criterio,
              así que arrastra empresas que en el servidor ya no existen (los
              tokens muertos no dan error, dan cero ofertas). Deja tu lista
              exactamente igual que la de fábrica.
              Las búsquedas de LinkedIn NO se tocan: su token son tus palabras
              clave y tu ubicación, no un slug que ponga nadie más. */}
          {(faltan.length > 0 || sobran.length > 0) && (
            <button
              onClick={() => guardar(busquedas, deFabrica)}
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--s-muted)' }}
              title={sobran.length
                ? `Quita: ${sobran.map((f) => f.name || f.token || '(sin nombre)').join(', ')}`
                : 'Tu lista ya tiene todas las de fábrica'}
            >
              <RotateCcw size={14} /> Dejar solo las {deFabrica.length} de fábrica
              {sobran.length > 0 && ` (quita ${sobran.length})`}
            </button>
          )}
        </div>
      </Card>

      {/* La NOTA MÍNIMA vivía aquí y se ha borrado (28-08-2026). Era el filtro
          que más ofertas tiraba —430 de 534— y con la peor explicación posible:
          "encaje bajo". Ahora la nota solo ORDENA. Si algún día sobran
          resultados, el sitio para cortar es aquí, no en el motor. */}

      <div className="flex items-center gap-4">
        <span className="text-xs" style={{ color: 'var(--s-muted)' }}>
          Ubicación (regex, se aplica a todas las fuentes)
        </span>
        <input
          value={c.ubicacion}
          onChange={(e) => editar({ ubicacion: e.target.value })}
          style={{ ...campo, flex: 1 }}
        />
        {preset && (
          <button onClick={() => setPreset(null)} className="text-xs underline shrink-0" style={{ color: 'var(--s-muted)' }}>
            volver a los criterios por defecto
          </button>
        )}
      </div>
    </div>
  )
}

export default Criterios
