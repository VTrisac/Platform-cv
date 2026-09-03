import { useEffect, useState } from 'react'

// Estado de CV Studio en localStorage.
//
// ponytail: localStorage, no base de datos. Es un usuario, un navegador, y el
// dato cabe en unos pocos KB. Cuando quieras verlo desde el móvil hará falta
// una BD de verdad (Neon/Upstash en el marketplace de Vercel), y ahí sí toca
// cambiar esto por un endpoint. Hasta entonces, una dependencia menos.
const KEY = 'cvStudio.v1'

// El orden IMPORTA: es el que pinta las barras del pipeline y los chips de
// filtro, y el que hace que el tablero se lea como un recorrido y no como una
// lista de etiquetas sueltas.
//
// "descartada" y "rechazada" son cosas distintas y se quedan separadas:
// descartada es que no llegaste a mandarla (tú o la auditoría), rechazada es que
// te dijeron que no. Juntarlas taparía el dato que dice si el problema está en
// tu criterio al elegir ofertas o en lo que mandas.
//
// "contratado" en masculino a propósito: las demás concuerdan con "la oferta",
// esta habla de ti.
export const ESTADOS = {
  // Siete estados y siete lecturas distintas. Dos que se parezcan es un chip
  // que hay que leer para saber qué dice, y entonces el color no sirve de nada.
  guardada: { label: 'Guardada', bg: 'var(--s-hueco)', fg: 'var(--s-muted)' },
  preparada: { label: 'Preparada', bg: 'var(--s-atencion-f)', fg: 'var(--s-atencion)' },
  enviada: { label: 'Enviada', bg: 'var(--s-espera-f)', fg: 'var(--s-espera)' },
  entrevista: { label: 'Entrevista', bg: 'var(--s-ganada-f)', fg: 'var(--s-ganada)' },
  // El único relleno macizo de los siete: es el final bueno y se ve desde lejos.
  contratado: { label: 'Contratado', bg: 'var(--s-ganada)', fg: 'var(--s-sobre-acento)' },
  rechazada: { label: 'Rechazada', bg: 'var(--s-perdida-f)', fg: 'var(--s-perdida)' },
  // Gris más denso que "guardada": las dos son neutras y con el mismo tono no
  // se distinguían (en la paleta anterior tampoco, era #EFEADB contra #EDEDE8).
  descartada: { label: 'Descartada', bg: 'var(--s-border)', fg: 'var(--s-muted)' },
}

// El paso hacia delante, que es lo único que necesita el botón de avanzar.
// Desde "entrevista" ofrece "contratado": que te rechacen se marca con el
// desplegable, porque un botón que empuja hacia el mal final no lo quiere nadie.
// Los tres finales no tienen siguiente y por eso no salen aquí.
export const SIGUIENTE = {
  guardada: 'preparada',
  preparada: 'enviada',
  enviada: 'entrevista',
  entrevista: 'contratado',
}

// Generar el CV adelanta la candidatura, pero SOLO desde el principio. Sin esta
// guarda, reabrir una oferta ya enviada y regenerar el PDF la haría retroceder a
// "preparada" y te desaparecería del seguimiento — que es justo lo contrario de
// lo que se pide al automatismo.
export const conCV = (estado) => (estado === 'guardada' ? 'preparada' : estado)

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

export const hoy = () => new Date().toISOString().slice(0, 10)

// El parche aplicado a una oferta, sellando la fecha cuando el estado CAMBIA de
// verdad. Guardar la variante o la carta no es un hito, y volver a poner el mismo
// estado tampoco: si se sellara todo, "hace N días" mediría la última vez que
// tocaste la fila, no desde cuándo está esperando respuesta.
//
// Aparte de updateOferta para poder probarla sin React.
export function aplicarPatch(o, patch, dia = hoy()) {
  const cambia = patch.estado && patch.estado !== o.estado
  return {
    ...o,
    ...patch,
    ...(cambia ? { historia: [...(o.historia ?? []), { estado: patch.estado, dia }] } : {}),
  }
}

// Cuándo pasó por ese estado la última vez, o null si esa oferta es de antes de
// que se guardara la historia. null y no una fecha inventada: decir "hace 18
// días" sobre un dato que no existe es peor que no decir nada.
export const desdeCuando = (o, estado) =>
  [...(o.historia ?? [])].reverse().find((h) => h.estado === estado)?.dia ?? null

export function diasDesde(dia) {
  if (!dia) return null
  const d = new Date(`${dia}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((new Date(`${hoy()}T00:00:00`) - d) / 864e5))
}

// Las ofertas de antes de que existiera "preparada": si tienen CV, ya no son
// "guardada". Sin esto se quedan en un estado que no se corresponde con lo que
// llevan dentro, y los contadores del Resumen no cuadran con la tabla.
export const migrar = (ofertas) =>
  ofertas.map((o) => (o.estado === 'guardada' && o.cv ? { ...o, estado: 'preparada' } : o))

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return { ...s, ofertas: migrar(s.ofertas ?? []) }
    }
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
    // Y `parcial`, que solo devuelve el motor del 28-08-2026: sus ofertas
    // llevan `avisos` y `cumple`, y el Feed los lee sin comprobar. Una caché de
    // hoy con la forma vieja reventaba la pantalla en la primera fila.
    feed: state.feed?.fecha === hoy() && state.feed.preset && typeof state.feed.parcial === 'number'
      ? state.feed
      : null,
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
      // La historia empieza aquí: sin el primer sello, una oferta creada hoy y
      // enviada mañana no tendría con qué comparar.
      nueva.historia = [{ estado: nueva.estado, dia: hoy() }]
      setState((s) => ({ ...s, ofertas: [nueva, ...s.ofertas] }))
      return nueva
    },
    // Todos los cambios de estado pasan por aquí, así que el sello de la fecha va
    // aquí y no hay forma de saltárselo.
    updateOferta: (id, patch) =>
      setState((s) => ({ ...s, ofertas: s.ofertas.map((o) => (o.id === id ? aplicarPatch(o, patch) : o)) })),
    removeOferta: (id) => setState((s) => ({ ...s, ofertas: s.ofertas.filter((o) => o.id !== id) })),
    // Varias de golpe. Borrar 22 descartadas de una en una, confirmando cada una,
    // no lo hace nadie: se quedan ahí y el tablero deja de significar algo.
    removeOfertas: (ids) => {
      const fuera = new Set(ids)
      setState((s) => ({ ...s, ofertas: s.ofertas.filter((o) => !fuera.has(o.id)) }))
    },
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
  const de = (e) => ofertas.filter((o) => o.estado === e)
  const guardadas = de('guardada')
  const preparadas = de('preparada')
  const enviadas = de('enviada')
  const entrevistas = de('entrevista')

  return {
    guardadas,
    preparadas,
    enviadas,
    entrevistas,
    contratado: de('contratado'),
    rechazadas: de('rechazada'),
    descartadas: de('descartada'),

    // Lo que está en marcha de verdad: mandado y esperando, o ya hablando.
    vivas: [...enviadas, ...entrevistas],
    // Lo que te queda por hacer, que es "guardada" (nada aún) + "preparada"
    // (CV hecho, sin mandar).
    porRevisar: [...guardadas, ...preparadas],

    // "preparada" ES tener CV, así que estos grupos ya no deducen nada de los
    // campos: se leen del estado. Antes había que mirar `cv` porque las dos
    // cosas vivían en "guardada".
    sinAuditar: guardadas.filter((o) => !o.auditoria),
    soloAuditadas: guardadas.filter((o) => o.auditoria),
    listas: preparadas.filter((o) => o.url),
    // A un paso: encaje alto y todavía sin adaptar. Adaptar cuesta una llamada al
    // modelo, así que la lista corta de las que la merecen vale más que el total.
    prometedoras: guardadas.filter(
      (o) => (o.auditoria?.encaje?.imprescindibles ?? 0) >= 75
    ),

    // El seguimiento de verdad: las enviadas, la que lleva más tiempo callada
    // primero. Las de antes de que se guardara la historia no tienen días y se
    // van al final en vez de fingir un cero.
    sinRespuesta: [...enviadas].sort(
      (a, b) => (diasDesde(desdeCuando(b, 'enviada')) ?? -1) - (diasDesde(desdeCuando(a, 'enviada')) ?? -1)
    ),

    semilla: ofertas.filter(esSemilla),
  }
}
