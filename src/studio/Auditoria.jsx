import { Check, Minus, X, TriangleAlert, Sparkles, Trash2, Info } from 'lucide-react'

// Paso 2 del flujo: el listado de encaje. Es la pantalla que decide si merece
// la pena aplicar, así que lo primero que se ve es el veredicto y los
// bloqueantes, no la lista completa.
const ENCAJE = {
  si: { icon: Check, color: 'var(--s-ganada)', bg: 'var(--s-ganada-f)', label: 'Lo cumples' },
  parcial: { icon: Minus, color: 'var(--s-atencion)', bg: 'var(--s-atencion-f)', label: 'Parcial' },
  no: { icon: X, color: 'var(--s-perdida)', bg: 'var(--s-perdida-f)', label: 'No lo cumples' },
}

const Barra = ({ label, pct }) => (
  <div className="flex flex-col gap-1.5 flex-1">
    <div className="flex justify-between text-xs" style={{ color: 'var(--s-muted)' }}>
      <span>{label}</span>
      <span className="font-semibold">{pct === null ? '—' : `${pct}%`}</span>
    </div>
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--s-hueco)' }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct ?? 0}%`, background: pct >= 70 ? 'var(--s-ganada)' : pct >= 40 ? 'var(--s-atencion)' : 'var(--s-perdida)' }}
      />
    </div>
  </div>
)

const euros = (n) => `${Number(n).toLocaleString('es-ES')} €`

// Lo que puedes pedir. La banda es de mercado y la estima el modelo; el punto
// dentro de ella lo calcula pedirSalario() en api/audit.js a partir de tu % de
// imprescindibles, que es el mismo número de la barra de arriba.
//
// Se dice que es una estimación y se dice sobre qué. Un número sin eso al lado se
// convierte en un dato en tu cabeza a los dos días.
const Salario = ({ s }) => {
  const banda = s.min != null && s.max != null
  return (
    <div className="flex flex-col gap-2.5 p-4 rounded-xl" style={{ background: 'var(--s-bg)' }}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.3px' }}>
          LO QUE PUEDES PEDIR
        </span>
        <span className="text-[26px] font-semibold leading-none" style={{ fontFamily: 'var(--s-display)', color: 'var(--s-text)' }}>
          {euros(s.pedir)}
        </span>
      </div>

      {banda && (
        <>
          {/* La marca dice dónde caes dentro de la banda, que es la mitad de la
              información: el mismo 60.000 significa cosas distintas en una banda
              de 55-65 que en una de 45-90. */}
          <div className="relative h-2 rounded-full" style={{ background: 'var(--s-chip)' }}>
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${Math.round(s.punto * 100)}%`, background: 'var(--s-accent)', border: '2px solid var(--s-surface)' }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--s-muted)' }}>
            <span>{euros(s.min)}</span>
            <span>banda de mercado</span>
            <span>{euros(s.max)}</span>
          </div>
        </>
      )}

      <p className="text-xs flex gap-1.5" style={{ color: 'var(--s-muted)' }}>
        <Info size={13} className="shrink-0 mt-0.5" />
        <span>
          {s.publicado
            ? <><b>La oferta publica {euros(s.publicado)}</b>: eso no es una estimación, es lo que dice. </>
            : <>Estimación, no un dato. </>}
          {s.base}
          {banda && !s.publicado && ' El punto sale de tu % de imprescindibles, no del modelo.'}
        </span>
      </p>
    </div>
  )
}

const Auditoria = ({ a, onAdaptar, onDescartar }) => {
  const rec = {
    aplicar: { txt: 'Aplica', bg: 'var(--s-ganada-f)', fg: 'var(--s-ganada)' },
    aplicar_con_reservas: { txt: 'Aplica con reservas', bg: 'var(--s-atencion-f)', fg: 'var(--s-atencion)' },
    descartar: { txt: 'Descártala', bg: 'var(--s-perdida-f)', fg: 'var(--s-perdida)' },
  }[a.recomendacion] ?? { txt: a.recomendacion, bg: 'var(--s-hueco)', fg: 'var(--s-muted)' }

  const imprescindibles = a.requisitos.filter((r) => r.tipo === 'imprescindible')
  const valorables = a.requisitos.filter((r) => r.tipo === 'valorable')

  const Lista = ({ titulo, items }) =>
    items.length > 0 && (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--s-muted)', letterSpacing: '0.3px' }}>
          {titulo}
        </span>
        {items.map((r, i) => {
          const e = ENCAJE[r.encaje]
          const Icon = e.icon
          return (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-xl border"
              style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: e.bg }}
              >
                <Icon size={12} style={{ color: e.color }} />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium">{r.texto}</span>
                <span className="text-xs" style={{ color: 'var(--s-muted)' }}>{r.evidencia}</span>
              </span>
            </div>
          )
        })}
      </div>
    )

  return (
    <div className="flex flex-col gap-5 max-w-[860px]">
      <div
        className="rounded-[20px] border p-5 flex flex-col gap-4"
        style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', boxShadow: 'var(--s-shadow)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
              {a.rol}
            </h2>
            <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
              {a.empresa} · {a.ubicacion} · {a.modalidad} · {a.seniority}
            </p>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
            style={{ background: rec.bg, color: rec.fg }}
          >
            {rec.txt}
          </span>
        </div>

        <div className="flex gap-6">
          <Barra label="Imprescindibles" pct={a.encaje.imprescindibles} />
          <Barra label="Valorables" pct={a.encaje.valorables} />
        </div>

        {/* null cuando la banda que devolvió el modelo no era de fiar: mejor no
            pintar nada que pintar una cifra que te llevas a la negociación. */}
        {a.salario && <Salario s={a.salario} />}

        <p className="text-sm leading-relaxed" style={{ color: 'var(--s-muted)' }}>{a.veredicto}</p>

        {/* El filtro que ninguna palabra clave puede aplicar. Se enseña la
            frase exacta: si te descarta una oferta, quieres poder juzgarla. */}
        {a.ingles && (
          <div className="flex gap-2 p-3 rounded-xl text-xs" style={{ background: 'var(--s-perdida-f)', color: 'var(--s-perdida)' }}>
            <TriangleAlert size={14} className="shrink-0 mt-0.5" />
            <span>
              <b>Inglés imprescindible:</b> «{a.ingles}». Con el filtro activo en Criterios, esta oferta
              queda descartada automáticamente.
            </span>
          </div>
        )}

        {a.encaje.bloqueantes.length > 0 && (
          <div className="flex gap-2 p-3 rounded-xl text-xs" style={{ background: 'var(--s-perdida-f)', color: 'var(--s-perdida)' }}>
            <TriangleAlert size={14} className="shrink-0 mt-0.5" />
            <span>
              <b>Bloqueantes:</b> {a.encaje.bloqueantes.join(' · ')}. Son imprescindibles que no cumples;
              adaptar el CV no los va a resolver.
            </span>
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onAdaptar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold"
            style={{ background: 'var(--s-accent)', color: 'var(--s-sobre-acento)' }}
          >
            <Sparkles size={15} /> Tengo encaje — adaptar CV
          </button>
          <button
            onClick={onDescartar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold border"
            style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)', color: 'var(--s-muted)' }}
          >
            <Trash2 size={15} /> Descartar oferta
          </button>
        </div>
      </div>

      <Lista titulo="IMPRESCINDIBLES" items={imprescindibles} />
      <Lista titulo="VALORABLES" items={valorables} />
    </div>
  )
}

export default Auditoria
