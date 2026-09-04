// El flujo de CV Studio, de la oferta al formulario, como datos.
//
// SIN UN SOLO IMPORT, a propósito: este fichero lo lee Mapa.jsx, que es el que
// vive en el chunk perezoso con el paquete de Excalidraw. Si aquí se importara
// algo de '@excalidraw/excalidraw', los 2,6 MB caerían en el bundle principal y
// los pagaría todo el que abre la app.
//
// Se escribe el ESQUELETO (cajas con id, texto y color), no elementos de
// Excalidraw: convertToExcalidrawElements() rellena los treinta campos que lleva
// cada elemento de verdad. La geometría de las flechas se calcula abajo a partir
// de las cajas, así que mover una caja es cambiar dos números y ya.
//
// ponytail: la rejilla es a mano. Un motor de layout (dagre, elk) para un
// diagrama que se dibuja una vez y luego editas con el ratón es peso muerto.

// Rejilla: cinco columnas de 240 cada 300 px.
const C = (i) => 80 + i * 300

// Paleta de Excalidraw, la de su propia barra de colores: así lo que dibujes tú
// encima con el ratón sale igual que lo que hay puesto.
const ESTILOS = {
  normal: { strokeColor: '#1e1e1e', backgroundColor: 'transparent' },
  // Lo que garantiza algo: verde, y es lo único verde.
  garantia: { strokeColor: '#2f9e44', backgroundColor: '#b2f2bb' },
  // Donde se decide.
  decision: { strokeColor: '#1971c2', backgroundColor: '#a5d8ff' },
  // Las cajas que llevan un hallazgo de la auditoría colgando.
  deuda: { strokeColor: '#f08c00', backgroundColor: '#ffec99' },
  // Lo que nunca se pulsa.
  nunca: { strokeColor: '#e03131', backgroundColor: '#ffc9c9' },
}

// Las bandas del fondo. Van primero para que queden DETRÁS de las cajas: en
// Excalidraw el orden del array es el orden de pintado.
const BANDAS = [
  { id: 'b-nav', x: 40, y: 90, w: 1500, h: 620, titulo: 'NAVEGADOR  ·  src/  ·  React + Vite, sin router' },
  { id: 'b-api', x: 40, y: 750, w: 1500, h: 400, titulo: 'VERCEL  ·  api/  ·  6 funciones serverless, maxDuration 300 s' },
  { id: 'b-mod', x: 40, y: 1190, w: 1500, h: 230, titulo: 'EL MODELO  ·  dos vías y un presupuesto de tiempo' },
  { id: 'b-ext', x: 40, y: 1460, w: 1500, h: 250, titulo: 'LA EXTENSIÓN  ·  Chrome MV3, en tu sesión' },
  { id: 'b-out', x: 1580, y: 90, w: 280, h: 1620, titulo: 'FUERA' },
]

// Las cajas. `n` es el número del hallazgo que le cuelga (ver LEYENDA).
const NODOS = [
  // --- navegador ------------------------------------------------------------
  // El Feed va pegado al Editor porque su flecha va ahí: con NuevaOferta en medio
  // la línea le atravesaba la caja entera.
  { id: 'nueva', x: C(0), y: 170, w: 240, h: 90, texto: 'NuevaOferta.jsx\nURL o texto pegado' },
  { id: 'feed', x: C(1), y: 170, w: 240, h: 90, texto: 'Feed.jsx\ncaché del día' },
  { id: 'editor', x: C(2), y: 170, w: 240, h: 90, texto: 'Editor.jsx\nun paso o los tres' },
  { id: 'partir', x: C(1), y: 310, w: 240, h: 90, tipo: 'diamond', texto: 'partir()\n¿1 oferta o N?', color: 'decision' },
  { id: 'lote', x: C(3), y: 310, w: 240, h: 90, texto: 'enLote()\npool de 2' },
  { id: 'preparar', x: C(1), y: 440, w: 420, h: 100, texto: 'preparar()  ·  lote.js\nLA ÚNICA SECUENCIA\nauditar → adaptar → carta', color: 'garantia' },
  { id: 'cola', x: C(3), y: 440, w: 240, h: 90, texto: 'Cola.jsx\n① vive en memoria', color: 'deuda' },
  { id: 'store', x: C(0), y: 440, w: 240, h: 200, texto: 'store.js\nSUCESOS + suceso()\nla ÚNICA regla de estado\n\nlocalStorage cvStudio.v1\n= la frontera de la BD', color: 'garantia' },
  { id: 'descartar', x: 480, y: 580, w: 280, h: 110, tipo: 'diamond', texto: '¿descartar?\nse para aquí y ahorra\ndos llamadas', color: 'decision' },
  { id: 'apijs', x: C(3), y: 570, w: 240, h: 120, texto: 'studio/api.js\nconClave()\napiPost · pdfBlob' },

  // --- serverless -----------------------------------------------------------
  { id: 'gate', x: C(0), y: 820, w: 240, h: 90, texto: 'gate()  src/acceso.js\ncontraseña + ¿hay vía?' },
  { id: 'audit', x: C(1), y: 820, w: 240, h: 90, texto: '/api/audit\nencaje · bloqueantes\npedirSalario()' },
  { id: 'tailor', x: C(2), y: 820, w: 240, h: 90, texto: '/api/tailor\ndevuelve un PARCHE' },
  { id: 'cover', x: C(3), y: 820, w: 240, h: 90, texto: '/api/cover\nvalida() la forma' },
  { id: 'answers', x: C(4), y: 820, w: 240, h: 90, texto: '/api/answers\nlo que pregunta el portal' },
  { id: 'feedapi', x: C(0), y: 960, w: 240, h: 100, texto: '/api/feed\nboard → detalle (180 s)' },
  { id: 'pdfapi', x: C(1), y: 960, w: 240, h: 100, texto: '/api/pdf\nimprime el HTML que le mandas' },
  { id: 'apply', x: C(2), y: 960, w: 540, h: 100, texto: 'applyPatch() + findInventions()\nfiltran tech y skills contra el CV maestro\nLA GARANTÍA ANTI-INVENCIÓN: es código, no prompt', color: 'garantia' },

  // --- el modelo ------------------------------------------------------------
  { id: 'presu', x: C(0), y: 1255, w: 240, h: 110, texto: '③ hasta = ahora + 300 s\nlo fija cada handler,\nantes del scrape', color: 'deuda' },
  { id: 'pedirjson', x: C(1), y: 1255, w: 540, h: 110, texto: 'pedirJSON()  ·  api/tailor.js\nel ÚNICO sitio que habla con un LLM\nreintenta en la misma vía solo si el fallo fue instantáneo', color: 'garantia' },
  { id: 'gw', x: C(3), y: 1255, w: 240, h: 110, texto: 'vía 1 · AI Gateway\n② 403 sin tarjeta', color: 'deuda' },
  { id: 'nim', x: C(4), y: 1255, w: 240, h: 110, texto: 'vía 2 · NVIDIA NIM\n150-240 s' },

  // --- la extensión ---------------------------------------------------------
  { id: 'descargar', x: C(0), y: 1525, w: 240, h: 110, texto: 'descargarPdf()\nFile System Access\n(handle en IndexedDB)' },
  { id: 'paquete', x: C(1), y: 1525, w: 240, h: 110, texto: 'aplicar(paquete)\npostMessage → bridge.js' },
  { id: 'sw', x: C(2), y: 1525, w: 240, h: 110, texto: 'sw.js\nabre la pestaña de la oferta' },
  { id: 'rellenar', x: C(3), y: 1525, w: 240, h: 110, texto: 'campos.js + rellenar.js\nesperarQuietud()' },
  { id: 'enviar', x: C(4), y: 1525, w: 240, h: 110, texto: '«Enviar»\nNUNCA se pulsa\n(lo verifica apply-test.js)', color: 'nunca' },

  // --- fuera ----------------------------------------------------------------
  { id: 'fuentes', x: 1600, y: 820, w: 240, h: 120, texto: '9 fuentes\ngreenhouse · lever\nashby · workable · workday\nlinkedin · amazon · remoteok' },
  { id: 'chromium', x: 1600, y: 980, w: 240, h: 80, texto: 'Chromium\n@sparticuz' },
  { id: 'portal', x: 1600, y: 1525, w: 240, h: 110, texto: 'portal de empleo\ntu sesión, tu pestaña' },
]

// [de, a, etiqueta]. La etiqueta es opcional y solo va donde dice algo que la
// flecha sola no dice.
const ENLACES = [
  ['feed', 'editor', 'Auditar'],
  ['nueva', 'partir'],
  ['partir', 'preparar', '1'],
  ['partir', 'lote', 'N'],
  ['lote', 'preparar'],
  ['lote', 'cola', 'pinta'],
  ['preparar', 'store', 'onFase → suceso()'],
  ['preparar', 'descartar'],
  ['descartar', 'store', 'sí'],
  ['preparar', 'apijs'],
  ['editor', 'preparar', 'entero, o un paso suelto (hasta)'],
  ['apijs', 'audit'],
  ['apijs', 'tailor'],
  ['apijs', 'cover'],
  ['apijs', 'pdfapi'],
  ['store', 'feedapi'],
  ['gate', 'audit'],
  ['feedapi', 'fuentes', 'busca'],
  ['pdfapi', 'chromium'],
  ['tailor', 'apply'],
  ['audit', 'pedirjson'],
  ['tailor', 'pedirjson'],
  ['cover', 'pedirjson'],
  ['answers', 'pedirjson'],
  ['presu', 'pedirjson'],
  ['pedirjson', 'gw', '1º'],
  ['gw', 'nim', 'si falla'],
  ['pdfapi', 'descargar', 'el PDF'],
  ['descargar', 'paquete'],
  ['paquete', 'sw'],
  ['sw', 'rellenar'],
  ['rellenar', 'answers', 'pregunta'],
  ['rellenar', 'portal'],
  ['rellenar', 'enviar', 'jamás'],
]

const LEYENDA = `LO QUE QUEDA POR ARREGLAR  ·  04-09-2026

①  La Cola vive en useState de Studio.jsx: recargar a mitad de un lote pierde el progreso en pantalla
     (lo ya pagado al modelo está a salvo en el store, y el encabezado lo dice).
②  El 403 del gateway se reintenta y nunca va a funcionar: pedirJSON solo corta el reintento si el fallo
     tardó más de 10 s, y el «requires a valid credit card» llega en 1 s. Ojo: el 401 de NIM SÍ es espurio
     y hay que seguir reintentándolo.
③  El presupuesto de tiempo se fija a mano en cada handler. Correcto —tiene que arrancar antes del
     scrape— pero es la línea que se olvida en el quinto endpoint.

ARREGLADO EN ESTA TANDA:  el estado se escribía desde seis sitios y ahora solo desde SUCESOS ·  el baile
del 401 estaba dos veces y ahora vive en conClave() ·  el editor repetía las llamadas de preparar() y ahora
le pasa \`hasta\` ·  la semilla de demo y su maquinaria de limpieza, fuera ·  @types/react sin un solo .ts, fuera.`

// --- de la tabla a Excalidraw ------------------------------------------------

const centro = (n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 })

// Por qué lado sale y por cuál entra: el eje en el que las cajas están más
// separadas. Sin esto las flechas salen del centro y cruzan la caja entera.
function extremos(a, b) {
  const ca = centro(a)
  const cb = centro(b)
  const dx = cb.x - ca.x
  const dy = cb.y - ca.y
  if (Math.abs(dy) >= Math.abs(dx)) {
    const baja = dy > 0
    return [{ x: ca.x, y: baja ? a.y + a.h : a.y }, { x: cb.x, y: baja ? b.y : b.y + b.h }]
  }
  const derecha = dx > 0
  return [{ x: derecha ? a.x + a.w : a.x, y: ca.y }, { x: derecha ? b.x : b.x + b.w, y: cb.y }]
}

// fontFamily 2 = la "Normal" de Excalidraw. La de a mano (5) obliga a bajarse
// la fuente de esm.sh; esta se pinta con la del sistema y el diagrama se lee
// igual sin red.
const LETRA = { fontSize: 16, fontFamily: 2 }

export function esqueleto() {
  const porId = Object.fromEntries(NODOS.map((n) => [n.id, n]))

  return [
    // Fondo: primero, para que quede debajo de todo.
    ...BANDAS.map((b) => ({
      type: 'rectangle', id: b.id, x: b.x, y: b.y, width: b.w, height: b.h,
      strokeColor: '#adb5bd', backgroundColor: 'transparent', strokeStyle: 'dashed', roughness: 0,
    })),
    ...BANDAS.map((b) => ({
      type: 'text', id: `t-${b.id}`, x: b.x + 20, y: b.y + 14, text: b.titulo,
      fontSize: 16, fontFamily: 2, strokeColor: '#868e96',
    })),

    { type: 'text', id: 't-1', x: 40, y: 20, text: 'CV Studio — el flujo, de la oferta al formulario', fontSize: 28, fontFamily: 2 },
    { type: 'text', id: 't-2', x: 40, y: 58, text: 'auditado el 04-09-2026 leyendo el código · verde = lo que garantiza algo · ámbar = un hallazgo, numerado abajo', fontSize: 14, fontFamily: 2, strokeColor: '#868e96' },

    ...NODOS.map((n) => ({
      type: n.tipo ?? 'rectangle', id: n.id, x: n.x, y: n.y, width: n.w, height: n.h,
      ...ESTILOS[n.color ?? 'normal'],
      fillStyle: 'solid', roughness: 1, roundness: null,
      label: { text: n.texto, ...LETRA },
    })),

    ...ENLACES.map(([de, a, etiqueta], i) => {
      const [p0, p1] = extremos(porId[de], porId[a])
      const w = p1.x - p0.x
      const h = p1.y - p0.y
      return {
        // El índice va en el id: dos flechas entre las mismas dos cajas son
        // legítimas y con el id sacado solo del par se pisaban, que es lo que
        // Excalidraw canta como «Duplicate id».
        type: 'arrow', id: `f${i}-${de}-${a}`, x: p0.x, y: p0.y, width: w, height: h,
        // Los puntos van explícitos además del start/end: así la flecha está
        // bien puesta aunque el enganche decida otra cosa. El start/end es lo
        // que hace que te siga cuando arrastras la caja.
        points: [[0, 0], [w, h]],
        start: { id: de }, end: { id: a },
        strokeColor: '#5c5c5c', roughness: 0,
        ...(etiqueta ? { label: { text: etiqueta, fontSize: 14, fontFamily: 2, strokeColor: '#5c5c5c' } } : {}),
      }
    }),

    { type: 'rectangle', id: 'b-ley', x: 40, y: 1760, width: 1820, height: 300, strokeColor: '#adb5bd', backgroundColor: 'transparent', strokeStyle: 'dashed', roughness: 0 },
    { type: 'text', id: 't-ley', x: 70, y: 1790, text: LEYENDA, fontSize: 15, fontFamily: 2 },
  ]
}
