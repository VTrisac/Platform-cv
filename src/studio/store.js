import { useEffect, useState } from 'react'

// Estado de CV Studio en localStorage.
//
// ponytail: localStorage, no base de datos. Es un usuario, un navegador, y el
// dato cabe en unos pocos KB. Cuando quieras verlo desde el móvil hará falta
// una BD de verdad (Neon/Upstash en el marketplace de Vercel), y ahí sí toca
// cambiar esto por un endpoint. Hasta entonces, una dependencia menos.
const KEY = 'cvStudio.v1'

// El tema va en su propia clave y no dentro del blob de arriba: index.html
// tiene que leerlo con un script en línea ANTES de pintar, o el fondo claro
// asoma un frame. Ese script lee esta misma clave; si la cambias, cámbiala en
// los dos sitios.
//
// null = todavía no has elegido y manda el sistema (prefers-color-scheme).
const KEY_TEMA = 'cvStudio.tema'

export const leerTema = () => {
  try {
    return localStorage.getItem(KEY_TEMA)
  } catch {
    return null
  }
}

export const guardarTema = (tema) => {
  try {
    localStorage.setItem(KEY_TEMA, tema)
  } catch {
    // Modo privado: el tema dura lo que la pestaña. No rompe nada.
  }
}

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

// Los cuatro sucesos que mueven una candidatura, y las ÚNICAS reglas que deciden
// su estado. Antes esto vivía repartido en cinco sitios de Studio.jsx, y ya se
// contradijo una vez: regenerar el CV de una oferta enviada la devolvía a
// "preparada" y te desaparecía del seguimiento.
//
// Aparte de useStudio a propósito, para poder probarlas sin React.
export const SUCESOS = {
  // Nace descartada solo si la auditoría lo dice. El idioma no cuenta: entra
  // como valorable en normalizar() y no puede llegar hasta aquí.
  auditada: (o, a) => (a.recomendacion === 'descartar' ? 'descartada' : 'guardada'),
  // Tener CV adelanta, pero SOLO desde el principio: una enviada no retrocede.
  //
  // `descartada` también vuelve: adaptarle el CV es un acto deliberado —te has
  // saltado la recomendación a sabiendas, pulsando «Tengo encaje»— y dejarla
  // archivada te esconde la oferta que acabas de pagar, porque `descartada` está
  // fuera de VIVAS en el tracker. `rechazada` NO vuelve: esa no la decides tú, y
  // un CV nuevo no deshace un «no».
  cv: (o) => (['guardada', 'descartada'].includes(o.estado) ? 'preparada' : o.estado),
  // Pulsar "Aplicar" no es enviar —la extensión no toca ese botón—, pero es lo
  // que vas a hacer a continuación. El tablero lo corrige en un clic.
  aplicada: () => 'enviada',
  // Tú, a mano, desde el tablero o la tabla. Un estado que no existe se ignora
  // en vez de dejar la oferta en un limbo que ninguna pantalla sabe pintar.
  marcada: (o, estado) => (ESTADOS[estado] ? estado : o.estado),
}

// Los dos saltos que se dan a mano todo el rato: «ya la preparé» y «ya la mandé».
// Vive aquí y no en Ofertas.jsx porque ahora lo comparten la tabla y el feed.
export const RAPIDOS = ['preparada', 'enviada']

// El «14 jul» que se pinta en el tracker. Una sola línea, pero en dos sitios: si
// cada uno formatea a su manera, la tabla mezcla formatos según de dónde vino
// la oferta.
const fechaCorta = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

// Con qué se reconoce una oferta ya guardada cuando vuelve a salir en el feed.
//
// La URL de LinkedIn trae refId y position y cambia entre búsquedas, así que de
// ella se saca el id numérico —mismo criterio que claveDedup() en api/feed.js,
// que deduplica DENTRO de una respuesta; esto cruza el feed con lo guardado—.
// Y empresa|puesto SIGUE estando: es la única clave que tienen las pegadas a
// mano y las guardadas antes de esto.
//
// Por qué hacían falta las dos: auditar desde el feed guarda `puesto: a.rol`, el
// nombre que le pone el modelo, que no es el titular del anuncio. Cruzar solo
// por ahí no casaba nunca y toda oferta auditada volvía a salir al día siguiente
// como si fuera nueva.
export const clavesDe = ({ url, empresa, puesto }) => {
  const li = /\/jobs\/view\/(?:[^/?]*-)?(\d{6,})/.exec(url ?? '')
  return [
    li ? `li:${li[1]}` : url ? url.split('?')[0].toLowerCase() : null,
    empresa && puesto ? `${empresa}|${puesto}`.toLowerCase() : null,
  ].filter(Boolean)
}

// clave -> oferta guardada. Un Map y no un Set: la fila del feed necesita la
// oferta entera para pintar su estado y para saber a qué id mandar el cambio.
export const indexar = (ofertas) =>
  new Map(ofertas.flatMap((o) => clavesDe(o).map((k) => [k, o])))

// Una oferta que nace marcada desde el feed. SIN auditoría a propósito: no la
// has pagado, solo estás diciendo que esa ya la mandaste —o que ya le hiciste el
// CV— fuera de aquí. `j` es una fila del feed, con los nombres del feed.
export const desdeFeed = (j, estado) => ({
  empresa: j.company,
  puesto: j.title,
  url: j.url,
  estado,
  fecha: fechaCorta(),
})

// La forma de una oferta la decide el dominio, no la pantalla: esto era
// desdeAuditoria() dentro de Studio.jsx.
export const nuevaOferta = (a, lang, url = null) => ({
  empresa: a.empresa,
  puesto: a.rol,
  estado: SUCESOS.auditada(null, a),
  fecha: fechaCorta(),
  variante: null,
  auditoria: a,
  url, // el enlace para postular; null si pegaste el texto a mano
  lang,
})

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

// Por qué está fuera. NO es un campo nuevo: todo esto ya se guardaba con la
// oferta, solo faltaba leerlo. Si la auditoría recomendó descartar, fue ella;
// si no, fuiste tú desde el informe o desde la tabla. Y los números dicen con
// qué motivo, que es lo que quieres saber antes de fiarte del filtro.
//
// ponytail: derivado, no persistido. Un campo `motivo` sería un dato más que
// mantener sincronizado y una migración para las ofertas que ya tienes.
export function porQueDescartada(o) {
  if (o?.estado !== 'descartada') return null
  const a = o.auditoria
  if (a?.recomendacion !== 'descartar') return 'La descartaste tú'
  const { imprescindibles: imp, bloqueantes = [] } = a.encaje ?? {}
  if (bloqueantes.length >= 2) return `La auditoría: ${bloqueantes.length} bloqueantes — ${bloqueantes.join('; ')}`
  return `La auditoría: ${imp}% de los imprescindibles`
}

export function diasDesde(dia) {
  if (!dia) return null
  const d = new Date(`${dia}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((new Date(`${hoy()}T00:00:00`) - d) / 864e5))
}

// Lo que hay que arreglar de lo ya guardado, al cargar.
//
// Las doce filas de demo que sembraba load() se van solas: nunca las creaste tú,
// cuatro contaban como candidaturas enviadas en la portada, y mantenerlas costaba
// un botón en Ofertas y un aviso en el Resumen para deshacer algo que no hacía
// falta hacer.
//
// Y las ofertas de antes de que existiera "preparada": si tienen CV, ya no son
// "guardada", o los contadores no cuadran con la tabla.
export const migrar = (ofertas) =>
  ofertas
    .filter((o) => !String(o.id).startsWith('seed-'))
    .map((o) => (o.estado === 'guardada' && o.cv ? { ...o, estado: 'preparada' } : o))

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return { ...s, ofertas: migrar(s.ofertas ?? []) }
    }
  } catch {
    // JSON corrupto: se empieza de cero antes que dejar la app sin arrancar.
  }
  return { ofertas: [] }
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
    // Los datos de una oferta (auditoría, CV, carta, variante). NO lleva estado:
    // para eso está suceso(), y así no hay dos caminos que puedan discrepar.
    updateOferta: (id, patch) =>
      setState((s) => ({ ...s, ofertas: s.ofertas.map((o) => (o.id === id ? aplicarPatch(o, patch) : o)) })),
    // El ÚNICO camino para cambiar de estado: SUCESOS decide el destino y
    // aplicarPatch sella la fecha, así que no hay forma de saltarse ninguna de
    // las dos cosas. `dato` es lo que pida el suceso (la auditoría, o el estado
    // que has elegido a mano) y `patch` lo que se guarda en el mismo viaje.
    suceso: (id, tipo, dato, patch = {}) =>
      setState((s) => ({
        ...s,
        ofertas: s.ofertas.map((o) => (o.id === id
          ? aplicarPatch(o, { ...patch, estado: SUCESOS[tipo](o, dato) })
          : o)),
      })),
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

// Lo que necesita el tablero, contado sobre lo que YA está guardado.
//
// ponytail: no hay etapa derivada ni estado nuevo. `estado` sigue siendo tuyo y
// manda; esto solo reparte. Vive aquí y no en Bento para poder probarlo sin React.
export function agrupar(ofertas) {
  const de = (e) => ofertas.filter((o) => o.estado === e)
  const guardadas = de('guardada')
  const preparadas = de('preparada')
  const enviadas = de('enviada')
  const entrevistas = de('entrevista')
  const descartadas = de('descartada')
  const rechazadas = de('rechazada')

  return {
    guardadas,
    preparadas,
    enviadas,
    entrevistas,
    contratado: de('contratado'),
    rechazadas,
    descartadas,

    // Las dos "fuera" van juntas en la cuarta columna del tablero, pero NO se
    // funden: descartada es que no llegaste a mandarla, rechazada es que te
    // dijeron que no. Juntarlas taparía si el problema está en tu criterio al
    // elegir o en lo que mandas. Cada una conserva su chip y su recuento.
    archivadas: [...descartadas, ...rechazadas],

    // Lo que está en marcha de verdad: mandado y esperando, o ya hablando.
    vivas: [...enviadas, ...entrevistas],
    // Lo que te queda por hacer: "guardada" (nada aún) + "preparada" (CV hecho,
    // sin mandar).
    porRevisar: [...guardadas, ...preparadas],

    // La tira de arriba del tablero: lo que todavía no ha entrado en ninguna
    // columna. Sin ella las guardadas desaparecen de la portada.
    sinAuditar: guardadas.filter((o) => !o.auditoria),
    soloAuditadas: guardadas.filter((o) => o.auditoria),
    listas: preparadas.filter((o) => o.url),
    // A un paso: encaje alto y todavía sin adaptar. Adaptar cuesta una llamada al
    // modelo, así que la lista corta de las que la merecen vale más que el total.
    //
    // El criterio es CERO BLOQUEANTES: nada te falta del todo. Aquí había un
    // `>= 75` escrito a mano, el mismo umbral que recomendar() en el servidor —
    // dos sitios decidiendo lo mismo, y al subir uno a 80 el tablero seguía
    // ofreciendo lo que el informe ya no recomendaba—, y después un
    // `recomendacion === 'aplicar'` que dejaba fuera al 70 % limpio, que es una
    // candidata de verdad. Con `!== 'descartar'` sería peor: una `guardada` con
    // auditoría NUNCA la tiene —si la tuviera habría nacido `descartada`—, así
    // que la tira habría sido el mismo conjunto exacto que `soloAuditadas`, que
    // es el tile de al lado. Los bloqueantes son lo único que dice algo distinto,
    // y no repiten el umbral del 80: ese vive en recomendar() y en ningún sitio más.
    prometedoras: guardadas.filter((o) => o.auditoria && !o.auditoria.encaje?.bloqueantes?.length),

    // El seguimiento de verdad: las enviadas, la que lleva más tiempo callada
    // primero. Las de antes de que se guardara la historia no tienen días y se
    // van al final en vez de fingir un cero.
    sinRespuesta: [...enviadas].sort(
      (a, b) => (diasDesde(desdeCuando(b, 'enviada')) ?? -1) - (diasDesde(desdeCuando(a, 'enviada')) ?? -1)
    ),
  }
}

// --- el dinero ---------------------------------------------------------------
// Lo que se sugirió pedir en cada oferta auditada. El dato ya se guardaba dentro
// de la auditoría desde el 20-08; lo que no había era dónde verlo, y una cifra
// que no puedes volver a mirar es una cifra que no tienes.
//
// La fecha sale de historia[0].dia, que es ISO y ordena; `o.fecha` es el "14 jul"
// de pintar y ordenaría alfabéticamente.
export function salarios(ofertas) {
  const filas = ofertas
    .filter((o) => o.auditoria?.salario?.pedir != null)
    .map((o) => ({
      id: o.id,
      dia: o.historia?.[0]?.dia ?? null,
      empresa: o.empresa,
      puesto: o.puesto,
      estado: o.estado,
      encaje: o.auditoria.encaje?.imprescindibles ?? null,
      ...o.auditoria.salario,
    }))
    .sort((a, b) => String(b.dia ?? '').localeCompare(String(a.dia ?? '')))

  return { filas, mediana: mediana(filas.map((f) => f.pedir)) }
}

// La mediana y no la media: una sola oferta de 120.000 te desplaza la media y te
// hace creer que pides más de lo que pides.
export function mediana(ns) {
  const xs = ns.filter(Number.isFinite).sort((a, b) => a - b)
  if (!xs.length) return null
  const m = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[m] : Math.round((xs[m - 1] + xs[m]) / 2)
}
