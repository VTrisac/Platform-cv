// Con extensión: así node puede importar este fichero tal cual y probar partir()
// sin un paso de compilación. Vite resuelve las dos formas igual.
import { apiPost, auditar } from './api.js'

// Varias ofertas de un tirón (el motor; la pantalla es Cola.jsx). La secuencia por oferta es exactamente la de
// Editor.prepararTodo() —auditar, y si hay encaje adaptar y escribir la carta—,
// sacada aquí para poder correrla sobre N a la vez.
//
// ponytail: SIN endpoint nuevo. Cada oferta ya son tres peticiones HTTP
// independientes desde el navegador; un /api/batch solo serviría para acumular
// las tres en el mismo techo de 300 s de una función.

// Dos a la vez, no cuatro. Cada llamada tarda 35-50 s contra el mismo modelo de
// NVIDIA NIM y cuatro en paralelo es pedir un 429; con dos, cuatro ofertas salen
// en ~4 minutos en vez de ~8.
// ponytail: si algún día sobra cuota, se sube el número y ya. No hace falta cola
// de prioridades ni reintentos: un fallo se enseña en su fila y lo relanzas tú.
const A_LA_VEZ = 2

export const esUrl = (s) => /^https?:\/\//i.test(String(s).trim())

// Parte lo pegado en ofertas sueltas. Dos formas, las dos inequívocas:
//   - TODAS las líneas con contenido son enlaces -> una oferta por línea.
//   - Hay una línea que es solo "---" -> se parte por ahí.
// Cualquier otra cosa es UNA oferta, aunque tenga líneas en blanco dentro.
//
// ponytail: nada de adivinar por líneas en blanco. Se probó y es justo lo que
// rompe el caso de todos los días — el texto de una oferta pegada trae párrafos
// separados, y cada párrafo se convertía en "otra oferta".
export function partir(texto) {
  const lineas = String(texto ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lineas.length) return []
  if (lineas.every(esUrl)) return [...new Set(lineas)]
  if (lineas.some((l) => /^-{3,}$/.test(l))) {
    return String(texto).split(/^\s*-{3,}\s*$/m).map((b) => b.trim()).filter(Boolean)
  }
  return [String(texto).trim()]
}

// Las fases, en orden. 'listo' no está: es el final, no un paso.
export const FASES = [
  ['auditar', 'Auditando'],
  ['adaptar', 'Adaptando CV'],
  ['carta', 'Escribiendo carta'],
]

// `onFase(fase, resultado)` se llama con la fase que EMPIEZA y el resultado de la
// que acaba de terminar. Así quien escucha puede guardar cada trozo en cuanto
// existe: si cierras la pestaña a mitad, lo que ya se pagó no se pierde.
// `previo` es lo que esa oferta ya tiene pagado de un intento anterior: se
// reanuda por donde se quedó en vez de volver a gastar las tres llamadas. Antes
// una fila que fallaba en la carta repetía auditoría y adaptación enteras.
// `hasta` corta la secuencia antes de la carta. Existe para que el editor pueda
// ejecutar UN paso suelto —"Adaptar" sin carta, "Generar carta" sin readaptar—
// sin volver a escribir aquí las llamadas: tenerlas dos veces es lo que hizo que
// arreglar la reanudación costara hacerlo dos veces.
// `signal` corta la secuencia a media: el editor la pasa para que puedas parar
// una auditoría de 240 s en vez de esperarla. Opcional — sin ella, todo se
// comporta igual que antes, que es lo que necesita enLote().
export async function preparar(entrada, lang, onFase, previo = {}, hasta = 'carta', signal) {
  let { a, cv } = previo

  if (!a) {
    onFase('auditar')
    a = await auditar(entrada, lang, signal)
    // Si la auditoría dice que la descartes, se para ahí: gastar la adaptación y
    // la carta en una oferta que no vale la pena es justo lo que este orden evita.
    // 'parado' y no 'listo' a propósito: 'listo' pinta los tres pasos como hechos,
    // y en una descartada el CV no se ha adaptado ni la carta se ha escrito.
    onFase(a.recomendacion === 'descartar' ? 'parado' : 'adaptar', { a })
    // El freno vive AQUÍ y solo aquí, dentro de la rama que acaba de auditar: la
    // cadena automática —la Cola y «Preparar todo»— no gasta 40 s de modelo en
    // una oferta mala. Cuando la auditoría viene DADA, quien llama ya ha
    // decidido: el botón que trae hasta aquí dice «Tengo encaje». Suelto fuera
    // del if, ese botón no hacía absolutamente nada —ni CV, ni error, ni
    // spinner— y la auditoría dejaba de ser un consejo para ser una puerta.
    if (a.recomendacion === 'descartar') return
  } else {
    // El `{ a }` NO se reenvía al reanudar: es lo que crea la oferta en el
    // tracker, y volver a mandarlo la duplicaría.
    onFase(cv ? 'carta' : 'adaptar')
  }

  if (!cv) {
    // El texto que ya scrapeó la auditoría, no la URL: ni se baja dos veces ni se
    // arriesga a que el portal devuelva otra cosa entre una llamada y la otra.
    // Los requisitos ya auditados viajan con el texto: sin ellos el adaptador
    // vuelve a deducir de cero qué cubre el CV y contradice al informe que
    // acabas de leer. Es el dato que ya está pagado en `a`.
    const j = await apiPost('/api/tailor', { text: a.texto, lang, requisitos: a.requisitos }, signal)
    cv = j.data
    // `meta` y `cartaInv` solo los mira el editor —son los avisos de invención—;
    // la Cola los ignora. Viajan aquí para que esta siga siendo la ÚNICA
    // implementación del flujo: si el editor tuviera la suya para poder
    // enseñarlos, volveríamos a tener dos que mantener en paralelo.
    onFase(hasta === 'adaptar' ? 'listo' : 'carta', { cv, meta: j })
  }
  // La carta es otra llamada al modelo y no toda oferta la merece: quien solo
  // quería el CV se baja aquí.
  if (hasta === 'adaptar') return

  const c = await apiPost('/api/cover', { text: a.texto, lang, requisitos: a.requisitos }, signal)
  onFase('listo', { carta: c.carta, cartaInv: c.inventions ?? [] })
}

// Un pool de tamaño fijo tirando del mismo índice. ponytail: son ocho líneas y
// no hace falta nada más — ni p-limit ni un semáforo.
// `tarea` es un parámetro para poder probar el pool sin salir a la red.
export async function enLote(entradas, lang, onFase, aLaVez = A_LA_VEZ, tarea = preparar) {
  let siguiente = 0
  const trabajador = async () => {
    for (let i = siguiente++; i < entradas.length; i = siguiente++) {
      try {
        await tarea(entradas[i], lang, (fase, extra) => onFase(i, fase, extra))
      } catch (e) {
        // Una oferta que falla no tumba el lote: se marca su fila y siguen las demás.
        onFase(i, 'error', { error: e.message })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(aLaVez, entradas.length) }, trabajador))
}
