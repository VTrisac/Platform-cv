import { useEffect, useState } from 'react'
import { Check, Copy, Info, TriangleAlert } from 'lucide-react'
import { conPerfil } from '../perfil'
import { hayExtension } from './api'

// La ruta que hay que elegir en "Cargar descomprimida". Va a pelo porque es la
// de ESTE repo en ESTA máquina; una web no puede averiguar dónde está su propio
// código fuente.
const RUTA = '/Users/victortrisacperez/Documents/PROYECTOS/CV/extension'

// Si la extensión está o no. La app lo sabe desde siempre (bridge.js deja un
// atributo en el <html>), pero solo lo miraba al pulsar "Aplicar", así que la
// única forma de enterarte de que no estaba era que fallase.
//
// El estado se recalcula al montar y no en el render: bridge.js se inyecta en
// document_start, pero si acabas de cargar la extensión con la pestaña abierta
// hace falta recargar, y eso hay que poder decirlo.
const Extension = () => {
  const [instalada, setInstalada] = useState(false)
  const [copiada, setCopiada] = useState(false)
  useEffect(() => setInstalada(hayExtension()), [])

  return (
    <Card
      title="EXTENSIÓN DE CHROME"
      hint="Es quien rellena el formulario del portal. Una web no puede tocar el formulario de otro dominio; la extensión sí, en tu propia sesión."
    >
      {instalada ? (
        <p className="text-[13px] flex gap-2 items-center p-2.5 rounded-lg" style={{ background: 'var(--s-chip-green)', color: 'var(--s-accent-dark)' }}>
          <Check size={15} className="shrink-0" />
          <span><b>Instalada.</b> El botón «Aplicar» de una oferta con enlace y CV ya funciona.</span>
        </p>
      ) : (
        <>
          <p className="text-[13px] flex gap-2 p-2.5 rounded-lg" style={{ background: '#F9F1E4', color: '#8A6D2E' }}>
            <TriangleAlert size={15} className="shrink-0 mt-0.5" />
            <span>
              <b>No está instalada</b>, así que «Aplicar» no va a hacer nada. Se carga una vez y se queda.
            </span>
          </p>
          <ol className="text-[13px] flex flex-col gap-1.5 pl-4 list-decimal" style={{ color: 'var(--s-muted)' }}>
            <li>Abre <b>chrome://extensions</b> (el modo desarrollador ya lo tienes puesto).</li>
            <li>Pulsa <b>Cargar descomprimida</b>.</li>
            <li>Elige esta carpeta:</li>
          </ol>
          <div className="flex items-center gap-2">
            <code
              className="text-xs px-2.5 py-2 rounded-lg flex-1 truncate"
              style={{ background: 'var(--s-bg)', border: '1px solid var(--s-border)' }}
              title={RUTA}
            >
              {RUTA}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(RUTA); setCopiada(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border shrink-0"
              style={{ background: 'var(--s-surface)', borderColor: 'var(--s-border)' }}
            >
              {copiada ? <Check size={13} /> : <Copy size={13} />} {copiada ? 'Copiada' : 'Copiar'}
            </button>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs underline w-fit"
            style={{ color: 'var(--s-muted)' }}
          >
            Ya la he cargado — recargar y comprobar
          </button>
        </>
      )}
    </Card>
  )
}

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

      <Extension />

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
