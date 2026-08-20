import { useEffect, useState } from 'react'

// Estado de CV Studio en localStorage.
//
// ponytail: localStorage, no base de datos. Es un usuario, un navegador, y el
// dato cabe en unos pocos KB. Cuando quieras verlo desde el móvil hará falta
// una BD de verdad (Neon/Upstash en el marketplace de Vercel), y ahí sí toca
// cambiar esto por un endpoint. Hasta entonces, una dependencia menos.
const KEY = 'cvStudio.v1'

export const ESTADOS = {
  guardada: { label: 'Guardada', bg: '#EFEADB', fg: '#6C6F5C' },
  enviada: { label: 'Enviada', bg: '#E7E9F0', fg: '#3B4A6B' },
  entrevista: { label: 'Entrevista', bg: '#E3EBDC', fg: '#48603F' },
  rechazada: { label: 'Rechazada', bg: '#F3E4E1', fg: '#8A4A3C' },
  descartada: { label: 'Descartada', bg: '#EDEDE8', fg: '#8A8C7E' },
}

// Semilla: tus ofertas reales de ofertas/, que son las del diseño. La carpeta
// no viaja al despliegue (.vercelignore), así que se copian aquí.
const SEED = [
  { empresa: 'Factorial', puesto: 'Staff AI Engineer', estado: 'enviada', variante: 'Factorial · EN', fecha: '14 jul' },
  { empresa: 'Landbot', puesto: 'AI Engineer (Agentic)', estado: 'enviada', variante: 'Landbot · EN', fecha: '15 jul' },
  { empresa: 'Schneider Electric', puesto: 'AI/ML Engineer', estado: 'guardada', variante: null, fecha: '16 jul' },
  { empresa: 'ERNI', puesto: 'Senior Fullstack AI/LLM', estado: 'enviada', variante: 'ERNI · ES', fecha: '15 jul' },
  { empresa: 'EcoVadis', puesto: 'Senior AI/ML Engineer', estado: 'rechazada', variante: 'EcoVadis · EN', fecha: '14 jul' },
  { empresa: 'LHH · Brezo Arnedo', puesto: 'AI Engineer', estado: 'entrevista', variante: 'LHH · ES', fecha: '21 jul' },
  { empresa: 'THEKER', puesto: 'Backend / IA', estado: 'guardada', variante: null, fecha: '22 jul' },
  { empresa: 'haddock', puesto: 'AI Engineer', estado: 'enviada', variante: 'haddock · EN', fecha: '23 jul' },
  { empresa: 'Preply', puesto: 'Senior Fullstack', estado: 'rechazada', variante: 'Preply · EN', fecha: '14 jul' },
  { empresa: 'Derby Hotels', puesto: 'IA Developer', estado: 'descartada', variante: null, fecha: '14 jul' },
  { empresa: 'Clarivate', puesto: 'Software Engineer', estado: 'descartada', variante: null, fecha: '15 jul' },
  { empresa: 'TheFork', puesto: 'Backend Engineer', estado: 'guardada', variante: null, fecha: '15 jul' },
]

const hoy = () => new Date().toISOString().slice(0, 10)

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // JSON corrupto: mejor volver a la semilla que dejar la app en blanco.
  }
  return { ofertas: SEED.map((o, i) => ({ id: `seed-${i}`, ...o })) }
}

// Hook único; toda la app comparte el mismo objeto y se persiste en cada cambio.
export function useStudio() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Cuota llena o modo privado: se pierde al recargar, no rompe la sesión.
    }
  }, [state])

  return {
    ofertas: state.ofertas,
    // El feed es dato derivado —lo que hay en los tableros AHORA—, así que se
    // cachea por día en vez de guardarse: esto sustituye al cron. Si la marca
    // es de hoy, abrir Studio no vuelve a salir a la red.
    // Se exige `preset` además de la fecha: una caché guardada por una versión
    // anterior del endpoint no lo trae, y sin él el panel de criterios no tiene
    // de dónde partir. Caducarla es más barato que defenderse campo a campo.
    feed: state.feed?.fecha === hoy() && state.feed.preset ? state.feed : null,
    // Lo que el servidor dice ser de fábrica: su preset, las keywords del CV y
    // su lista de empresas. Vive APARTE del feed cacheado a propósito: cambiar un
    // criterio invalida los resultados, pero no cambia lo que es por defecto.
    // Cuando esto salía de `feed`, tocar cualquier criterio dejaba la pantalla de
    // criterios sin nada de donde partir y el botón de "volver a los criterios
    // por defecto" era un callejón sin salida.
    base: state.base ?? null,
    setBase: (base) => setState((s) => ({ ...s, base })),
    // Si alguna fuente falló por algo pasajero (LinkedIn limitando el ritmo,
    // un 5xx) el resultado se enseña pero NO se sella con la fecha: si no, un
    // límite de ritmo de un minuto te dejaría el feed vacío hasta mañana.
    setFeed: (feed) => setState((s) => ({
      ...s,
      base: { preset: feed.preset, keywords: feed.keywords, empresasPorDefecto: feed.empresasPorDefecto },
      feed: { ...feed, fecha: feed.dead?.some((d) => d.reintentable) ? null : hoy() },
    })),
    // null = sin tocar: el servidor aplica los criterios de siempre. En cuanto
    // editas algo se guarda el objeto entero y manda él.
    preset: state.preset ?? null,
    // Los datos de candidatura que no salen del CV (visado, salario, preaviso).
    // null = todavía sin tocar; PERFIL de src/perfil.js manda.
    perfil: state.perfil ?? null,
    setPerfil: (perfil) => setState((s) => ({ ...s, perfil })),
    // Cambiar los criterios invalida el feed cacheado: si no, verías el
    // resultado viejo hasta mañana y parecería que el panel no hace nada.
    // `base` no se toca: es de donde parte la pantalla de criterios.
    setPreset: (preset) => setState((s) => ({ ...s, preset, feed: null })),
    // Devuelve la oferta creada: quien la añade necesita su id para abrirla.
    addOferta: (o) => {
      const nueva = { id: crypto.randomUUID(), estado: 'guardada', ...o }
      setState((s) => ({ ...s, ofertas: [nueva, ...s.ofertas] }))
      return nueva
    },
    updateOferta: (id, patch) =>
      setState((s) => ({ ...s, ofertas: s.ofertas.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    removeOferta: (id) => setState((s) => ({ ...s, ofertas: s.ofertas.filter((o) => o.id !== id) })),
    // Varias de golpe. Borrar 22 descartadas de una en una, confirmando cada una,
    // no lo hace nadie: se quedan ahí y el tablero deja de significar algo.
    removeOfertas: (ids) => {
      const fuera = new Set(ids)
      setState((s) => ({ ...s, ofertas: s.ofertas.filter((o) => !fuera.has(o.id)) }))
    },
    reset: () => setState(load()),
  }
}

export const contar = (ofertas) =>
  Object.keys(ESTADOS).reduce((acc, k) => ({ ...acc, [k]: ofertas.filter((o) => o.estado === k).length }), {})

// Las de la semilla de demo, que nunca has tocado tú. Se reconocen por el id que
// les pone load(); ninguna oferta real lo lleva.
export const esSemilla = (o) => String(o.id).startsWith('seed-')

// Lo que el Resumen necesita, contado sobre lo que YA está guardado.
//
// ponytail: no hay etapa derivada ni estado nuevo. `estado` sigue siendo tuyo y
// manda. Esto solo mira qué campos existen, porque `estado` no puede distinguir
// una oferta que solo has auditado de una con el CV ya adaptado — las dos son
// "guardada", y esa es justo la pregunta que no se podía responder mirando la
// portada.
export function agrupar(ofertas) {
  const abiertas = ofertas.filter((o) => o.estado === 'guardada')
  return {
    // Lo que has mandado y lo que está en marcha: la lista, no un número.
    vivas: ofertas.filter((o) => o.estado === 'enviada' || o.estado === 'entrevista'),
    abiertas,
    soloAuditadas: abiertas.filter((o) => o.auditoria && !o.cv),
    conCV: abiertas.filter((o) => o.cv),
    // Enlace + CV es exactamente lo que Ofertas.jsx exige para enseñar "Aplicar".
    listas: abiertas.filter((o) => o.url && o.cv),
    // A un paso: encaje alto y sin adaptar todavía. Adaptar cuesta una llamada al
    // modelo, así que la lista corta de las que la merecen vale más que el total.
    prometedoras: abiertas.filter(
      (o) => !o.cv && (o.auditoria?.encaje?.imprescindibles ?? 0) >= 75
    ),
    sinAuditar: abiertas.filter((o) => !o.auditoria),
    descartadas: ofertas.filter((o) => o.estado === 'descartada'),
    semilla: ofertas.filter(esSemilla),
  }
}
