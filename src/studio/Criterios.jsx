import { useEffect, useRef, useState } from 'react'
import { Info, Plus, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { criteriosPorDefecto } from './api'
import { Card, campo } from './ui'

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
const ATS = ['greenhouse', 'lever', 'ashby', 'workable', 'workday', 'amazon', 'remoteok']
const VENTANAS = [['24h', 'Últimas 24 horas'], ['semana', 'Última semana'], ['todo', 'Sin límite']]
const MODALIDADES = [['presencial', 'Presencial'], ['hibrido', 'Híbrido'], ['remoto', 'Remoto']]
const IA = [['indiferente', 'Indiferente'], ['con', 'Solo con IA'], ['sin', 'Solo sin IA']]

// Cómo se llama cada familia de PUESTOS en pantalla. Las claves y las
// expresiones vienen del servidor (`base.familias`), que es quien filtra: aquí
// solo está el nombre bonito, y una familia sin nombre se pinta con su clave en
// vez de desaparecer del panel.
const NOMBRES = {
  ia: 'IA · ML · GenAI',
  ops: 'AI Ops · MLOps · Platform',
  backend: 'Backend',
  fullstack: 'Full Stack',
}

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
  // El error de la carga, PINTADO. Antes era un `.catch(() => {})`: si la
  // llamada fallaba o cancelabas la contraseña, la pantalla se quedaba en «abre
  // el Feed una vez» para siempre —sin ubicación, sin salario y sin decir por
  // qué—, que es justo la forma de que parezca que los criterios no se pueden
  // tocar.
  const [error, setError] = useState(null)

  // Sin `base` no hay de dónde partir ni con qué comparar tu lista de empresas,
  // y solo llegaba al refrescar el feed —que se cachea un día entero—. Se pide
  // aparte: no sale a buscar ofertas, así que es inmediato.
  //
  // SIEMPRE al abrir la pantalla, no solo `if (!base)`. `base` vive en
  // localStorage, así que con la condición se congelaba el día que se guardó y
  // no se enteraba nunca de que la lista de fábrica había cambiado en el
  // servidor: el 09-09-2026 el feed pasó de 25 fuentes a 18 y esta pantalla
  // seguía diciendo «21 de fábrica» y ofreciendo añadir Cabify y Anthropic, que
  // ya no existen. Comparar tu lista contra una foto vieja de lo que es de
  // fábrica es peor que no compararla: el aviso de «te sobran estas» no llega.
  // La ref evita el bucle —setBase se recrea en cada render y no sirve de guard—
  // y deja exactamente una llamada por visita.
  const pedido = useRef(false)
  useEffect(() => {
    if (pedido.current) return
    pedido.current = true
    criteriosPorDefecto().then(setBase).catch((e) => setError(e.message))
  }, [setBase])

  // Sin preset propio se edita a partir del que el servidor dice usar de fábrica.
  const c = preset ?? base?.preset

  if (!c) {
    return (
      <div className="p-8 flex flex-col gap-2">
        <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>Criterios</h1>
        {error ? (
          <>
            <p className="text-sm flex gap-1.5" style={{ color: 'var(--s-perdida)' }}>
              <TriangleAlert size={14} className="shrink-0 mt-0.5" />
              No se han podido cargar los criterios: {error}
            </p>
            <button
              onClick={() => { setError(null); criteriosPorDefecto().then(setBase).catch((e) => setError(e.message)) }}
              className="text-xs underline w-fit"
              style={{ color: 'var(--s-accent)' }}
            >
              Volver a intentarlo
            </button>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--s-muted)' }}>Cargando los criterios de partida…</p>
        )}
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
          Solo la ubicación, el puesto, la ventana y las palabras vetadas descartan ofertas. El resto
          las ordena: lo que cumple todo lo que pides sale arriba. Se aplica en la siguiente búsqueda del Feed.
        </p>
      </div>

      {/* La ubicación va PRIMERO y con tarjeta. Vivía en la última fila de la
          pantalla, debajo de la tabla de 21 empresas, sin tarjeta y pidiendo una
          expresión regular a pelo: existir, existía, pero no había forma de dar
          con ella ni de escribirla bien. Poner «Barcelona, España» a mano dejaba
          el feed a cero, porque las fuentes dicen «Barcelona, Catalonia, Spain». */}
      <Card
        title="UBICACIÓN"
        hint="Descarta de verdad. Las 23 fuentes escriben el sitio cada una a su manera, así que el filtro es una expresión regular: estos cuatro botones la escriben por ti."
      >
        <Pills opciones={base?.ubicaciones ?? []} valor={c.ubicacion} onChange={(ubicacion) => editar({ ubicacion })} />
        <input
          value={c.ubicacion ?? ''}
          onChange={(e) => editar({ ubicacion: e.target.value })}
          spellCheck={false}
          style={{ ...campo, fontFamily: 'var(--s-mono, ui-monospace, monospace)', fontSize: 12 }}
        />
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card
          title="PUESTOS"
          hint="Descarta por el TÍTULO de la oferta. Sin esto los tableros de empresa se bajan enteros y entran «B2B Travel Advisor», «Global Tax Trainee» o «Clinical Study Data Lead»."
        >
          <Pills
            multi
            opciones={(base?.familias ?? []).map((f) => [f, NOMBRES[f] ?? f])}
            valor={c.puestos ?? []}
            onChange={(puestos) => editar({ puestos })}
          />
        </Card>

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
        {/* Los números están medidos, no estimados. El 08-09-2026 se
            comprobaron las APIs una a una: Ashby con includeCompensation=true
            devuelve 0 bandas de 103 ofertas de Preply, y Greenhouse y Lever
            traen el campo a null. No es que el feed no lo lea: no está. */}
        <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: 'var(--s-atencion-f)', color: 'var(--s-atencion)' }}>
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            Aquí casi nadie publica salario: <b>0 de 103</b> ofertas de Preply, y Greenhouse y Lever
            devuelven el campo vacío. Este interruptor <b>no descarta</b> ese 86%, pero desde ahora
            manda en el orden: las que llevan cifra salen <b>arriba del todo</b>, por delante de
            cualquier otro criterio. Antes valía un punto entre varios y se mezclaban.
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

      {/* La ubicación ya no está aquí: se ha subido a su propia tarjeta, arriba
          del todo. Enterrada al final de la pantalla no la encontraba nadie. */}
      {preset && (
        <button onClick={() => setPreset(null)} className="text-xs underline w-fit" style={{ color: 'var(--s-muted)' }}>
          volver a los criterios por defecto
        </button>
      )}
    </div>
  )
}

export default Criterios
