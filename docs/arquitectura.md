# CV Studio — cómo está hecho

Auditoría del **03-09-2026**, leyendo el código. El mapa visual está en
`arquitectura.excalidraw` (se abre en excalidraw.com y se edita).

El mapa del **flujo** vive dentro de la app, en la pestaña «Mapa»: sale de
`src/studio/flujo.js`, se edita con el ratón y se guarda en tu navegador. Este
documento y el `.excalidraw` dibujan capas y ficheros; aquel, el recorrido.

## Las cuatro capas

| Capa | Líneas | Qué es |
|---|---|---|
| **Navegador** `src/` | ~4.200 | React + Vite. |
| **Serverless** `api/` | ~1.800 | Seis funciones en Vercel, `maxDuration 300`. |
| **Extensión** `extension/` | ~890 | Chrome MV3: rellena formularios en tu sesión. |
| **Terminal** `scripts/` | ~1.580 | CLI y tests. `.vercelignore` los deja fuera del despliegue. |

## El arranque

`src/main.jsx` decide en una línea qué app se carga:

- **`?design=N` → `Print.jsx`**, un visor de 23 líneas que solo existe porque
  `scripts/pdf.py` navega a `/?design=5&lang=en` para imprimir los PDF.
- **sin parámetro → `Studio.jsx`**, la app.

Los `id` de diseño (`src/designs/index.js`) **no son correlativos** —5 ATS,
3 Tarjetas, 0 Minimalista— porque son los que ya entiende `pdf.py`. Renumerarlos
cambia en silencio qué PDF genera `npm run pdf`.

## El Studio

`Studio.jsx` es un router de nueve vistas con `useState`, sin librería. Reparte a
`Bento` (el tablero), `Feed`, `Criterios`, `Ofertas` (tracker), `Salarios`,
`Cola`, `Perfil`, `Mapa` y `Editor`.

Todo el estado vive en **`store.js` → `localStorage['cvStudio.v1']`**: ofertas,
feed cacheado por día, preset de criterios y perfil. Es la única fuente de
verdad del cliente, y el único fichero que hay que tocar para llevarlo a una BD.
(El mapa del flujo va aparte, en `cvStudio.mapa`: son ~100 KB de dibujo y
meterlos en el blob haría que marcar una oferta como enviada los reserializara.)

**`store.js` es también dueño del recorrido.** `SUCESOS` tiene las cuatro reglas
—`auditada`, `cv`, `aplicada`, `marcada`— y `suceso()` es el único camino para
cambiar de estado; `updateOferta()` ya no escribe `estado`. Antes esas reglas
vivían repartidas en cinco puntos de `Studio.jsx` y se contradijeron: regenerar
el CV de una oferta enviada la devolvía a «preparada».

`studio/api.js` es la frontera con el servidor: `apiPost()` centraliza el baile
del 401, traduce el 504 y guarda la contraseña. También vive ahí la File System
Access API (elegir carpeta de descargas) y el `postMessage` con la extensión.

**`lote.js:preparar()` es la ÚNICA implementación del flujo** auditar → adaptar →
carta. La usan la Cola (N ofertas, `A_LA_VEZ = 2`) y el Editor: entera, o un paso
suelto con `hasta` —"Adaptar" sin carta, "Generar carta" sin readaptar—. Estuvo
escrita dos veces y arreglar la reanudación costó hacerlo dos veces; no la
vuelvas a duplicar para pintar algo distinto: pásalo por `onFase`.

## El backend

`api/tailor.js` es el núcleo del modelo: `pedirJSON()` con sus dos vías,
`applyPatch()` y `findInventions()`. Lo importan `audit`, `cover` y `answers`,
que son los tres que hablan con un modelo.

Fuera de él, y a propósito:

- **`src/acceso.js`** — `gate()` (la contraseña) y `vias()` (qué proveedores hay).
- **`src/scrape.js`** — `fetchOffer()`, `strip()`, `jobPosting()`.

Están fuera para que `/api/feed` y `/api/pdf`, que no hablan con ningún modelo,
no carguen el SDK de OpenAI en cada invocación solo para pedir una contraseña o
bajarse una oferta.

`api/feed.js` es el motor de búsqueda: ocho tipos de fuente tras una tabla `ATS`
común de `{url, jobs}`. Pipeline: `board()` → `deduplicar()` →
`filtrarCabecera()` → `detalle()` (presupuesto de 180 s) → `filtrarTexto()`.

## Las reglas que no se rompen

Están medidas, y romperlas no falla a la vista:

- **`response_format: json_object`, nunca `json_schema` con NIM.** Su
  decodificación restringida deja de emitir a mitad del objeto y rellena con
  espacios hasta agotar `max_tokens`. Medido: 0 de 8 buenas contra 5 de 5.
- **El modelo devuelve un PARCHE, nunca el CV entero.** `applyPatch()` filtra
  tech y skills contra el maestro: es imposible que invente un empleo aunque el
  prompt falle. La garantía es código, no prompt.
- **`OTRO_MUNDO` y `VECINAS` son dos listas y no una.** Juntarlas metía AWS y
  PyTorch en el denominador de la nota: 113 de 182 ofertas técnicas se caían.
- **`Go` no vuelve a la lista**: casaba con el verbo inglés en 32 ofertas.
  `Golang` sí.
- **La extensión nunca pulsa «enviar»**, y `scripts/apply-test.js` lo verifica.
- **`recomendar()` y `pedirSalario()` se calculan en código.** Preguntárselo al
  modelo daba "descartar" con el 100% de los imprescindibles cumplidos.
- **La banda que publica la oferta MANDA sobre la que estima el modelo**
  (`rangoSalarial()` en `api/feed.js`), y una cifra suelta solo hace de techo si
  es ≥ el suelo de la banda. `salarioDe()` devuelve el máximo de cualquier cifra
  con € o «k» del texto —vale para el filtro del feed, no para decidir cuánto
  pides—: usarlo de tope a ciegas convertía una banda de 50-80k en «pide 53.000».

## Deudas conocidas

- `localStorage` = un navegador. Multi-dispositivo pide BD y autenticación de
  verdad (hoy es una contraseña compartida en una cabecera).
- La Cola vive en memoria: al recargar desaparece (las ofertas quedan guardadas).
- `Editor.jsx` sigue teniendo ~500 líneas. Los nueve callbacks ya son un solo
  objeto `acciones`, pero el paso 3 —edición y previsualización— da para su
  propio fichero.
- ~230 estilos inline `var(--s-*)` repartidos por nueve pantallas. `studio/ui.jsx`
  ya unifica `Card` y `campo`; el resto espera a saber qué pantallas sobreviven.
- El AI Gateway está configurado pero **Vercel no lo sirve sin una tarjeta
  registrada**: hoy todo va por NVIDIA NIM, que tarda 150-240 s.
