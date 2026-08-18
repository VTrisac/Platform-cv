import { Info } from 'lucide-react'
import { conPerfil } from '../perfil'

// Los datos de candidatura: lo que un formulario pregunta y un CV no dice.
// Se rellenan una vez y la extensión los usa en todos los portales.
//
// Lo que ya está en el CV (email, teléfono, ubicación, LinkedIn, portfolio) se
// enseña editable pero viene de src/data.js: cambiar el CV cambia esto, y
// cambiarlo aquí solo afecta a los formularios.
const campo = {
  background: 'var(--s-bg)', border: '1px solid var(--s-border)', borderRadius: 10,
  padding: '8px 11px', outline: 'none', fontSize: 13, width: '100%',
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

const SiNo = ({ label, valor, onChange }) => (
  <label className="flex items-center justify-between gap-4 text-[13px]">
    <span>{label}</span>
    <span className="flex rounded-[10px] p-0.5 shrink-0" style={{ background: 'var(--s-bg)', border: '1px solid var(--s-border)' }}>
      {[[true, 'Sí'], [false, 'No']].map(([v, t]) => (
        <button
          key={t}
          onClick={() => onChange(v)}
          className="px-3 py-1 rounded-lg text-xs font-semibold"
          style={{ background: valor === v ? 'var(--s-accent)' : 'transparent', color: valor === v ? '#FDFBF4' : 'var(--s-muted)' }}
        >
          {t}
        </button>
      ))}
    </span>
  </label>
)

// Fuera del componente a propósito: definido dentro, React lo ve como un tipo
// distinto en cada render, desmonta el input y pierdes el foco a cada tecla.
const Texto = ({ p, editar, k, label, placeholder }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[13px]">{label}</span>
    <input value={p[k]} placeholder={placeholder} onChange={(e) => editar({ [k]: e.target.value })} style={campo} />
  </label>
)

const Perfil = ({ perfil, setPerfil }) => {
  const p = conPerfil(perfil)
  const editar = (patch) => setPerfil({ ...p, ...patch })

  return (
    <div className="p-8 flex flex-col gap-5 max-w-[860px]">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-semibold leading-tight" style={{ fontFamily: 'var(--s-display)' }}>
          Perfil
        </h1>
        <p className="text-sm" style={{ color: 'var(--s-muted)' }}>
          Lo que los formularios de candidatura preguntan y el CV no dice. Se rellena una vez.
        </p>
      </div>

      <p className="text-xs flex gap-1.5 p-2.5 rounded-lg" style={{ background: '#F5F1E6', color: 'var(--s-muted)' }}>
        <Info size={13} className="shrink-0 mt-0.5" />
        <span>
          Al pulsar «Aplicar» en una oferta, la extensión rellena el formulario del portal con esto
          y adjunta el CV adaptado. <b>Nunca pulsa enviar</b>: confirmar es tuyo.
        </span>
      </p>

      <Card title="QUIÉN ERES" hint="Los formularios piden nombre y apellidos por separado, y el país en un desplegable en inglés.">
        <div className="grid grid-cols-2 gap-3.5">
          <Texto p={p} editar={editar} k="nombre" label="Nombre" />
          <Texto p={p} editar={editar} k="apellidos" label="Apellidos" />
          <Texto p={p} editar={editar} k="email" label="Email" />
          <Texto p={p} editar={editar} k="telefono" label="Teléfono" />
          <Texto p={p} editar={editar} k="ubicacion" label="Ciudad" />
          <Texto p={p} editar={editar} k="pais" label="País" placeholder="Spain" />
          <Texto p={p} editar={editar} k="aniosExperiencia" label="Años de experiencia" />
        </div>
      </Card>

      <Card title="ENLACES">
        <div className="grid grid-cols-2 gap-3.5">
          <Texto p={p} editar={editar} k="linkedin" label="LinkedIn" placeholder="https://linkedin.com/in/…" />
          <Texto p={p} editar={editar} k="github" label="GitHub" placeholder="https://github.com/…" />
          <Texto p={p} editar={editar} k="web" label="Portfolio" placeholder="https://…" />
          <Texto p={p} editar={editar} k="fuente" label="Cómo has conocido la oferta" placeholder="LinkedIn" />
        </div>
      </Card>

      <Card
        title="AUTORIZACIÓN DE TRABAJO"
        hint="Son dos preguntas distintas y los portales hacen las dos. Responderlas al revés te descarta solo."
      >
        <SiNo label="¿Estás autorizado a trabajar en España / la UE?" valor={p.autorizado} onChange={(v) => editar({ autorizado: v })} />
        <SiNo label="¿Necesitas que te patrocinen un visado?" valor={p.necesitaVisado} onChange={(v) => editar({ necesitaVisado: v })} />
      </Card>

      <Card title="CONDICIONES" hint="En blanco = el campo se deja vacío y lo escribes tú en el portal.">
        <div className="grid grid-cols-2 gap-3.5">
          <Texto p={p} editar={editar} k="salarioObjetivo" label="Salario objetivo" placeholder="60.000 € brutos/año" />
          <Texto p={p} editar={editar} k="preaviso" label="Preaviso" />
          <Texto p={p} editar={editar} k="disponibilidad" label="Disponibilidad" />
        </div>
      </Card>

      <Card
        title="DIVERSIDAD (EEO)"
        hint="Greenhouse y Lever preguntan raza, género y discapacidad porque la ley de EE. UU. se lo exige. Declinar es una respuesta válida."
      >
        <div className="flex gap-2">
          {[['decline', 'Prefiero no responder'], ['', 'Dejar en blanco y responder yo']].map(([v, t]) => (
            <button
              key={t}
              onClick={() => editar({ eeo: v })}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                background: p.eeo === v ? 'var(--s-accent)' : 'var(--s-surface)',
                color: p.eeo === v ? '#FDFBF4' : 'var(--s-muted)',
                borderColor: p.eeo === v ? 'var(--s-accent)' : 'var(--s-border)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default Perfil
