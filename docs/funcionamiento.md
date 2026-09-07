# CV Studio — cómo funciona

El recorrido de una oferta, de principio a fin, y qué hace cada pieza cuando le
toca. Escrito el **06-09-2026** y revisado el **07-09-2026**, leyendo el código.

Su hermano [`arquitectura.md`](arquitectura.md) cuenta **cómo está hecho** —capas,
ficheros y las reglas que no se rompen—. Esto cuenta **cómo se usa**.

---

## 1. Qué es

Cuatro cosas en una sola app:

- un **buscador** que consulta 23 fuentes de empleo y las ordena por lo tuyo;
- un **auditor** que compara una oferta con tu CV requisito a requisito antes de
  gastar nada en ella;
- un **adaptador** que reescribe el CV para esa oferta sin poder inventar nada;
- un **tracker** que sabe dónde está cada candidatura y cuánto pediste en ella.

Todo corre en tu navegador contra seis funciones serverless en Vercel. No hay
base de datos: el estado vive en `localStorage['cvStudio.v1']` y lo administra
`src/studio/store.js`, que es el único fichero que lo toca. La puerta es una
contraseña compartida que viaja en la cabecera `x-tailor-key` (`gate()` en
`src/acceso.js`); en local es opcional, desplegado se exige siempre.

## 2. El recorrido de una oferta

```
     Feed  ──┐
             ├─→  auditar  ─→  ¿encajas?  ─→  adaptar CV  ─→  carta  ─→  PDF  ─→  Aplicar
Nueva oferta ┘      (modelo)      (tú)         (modelo)      (modelo)  (Chromium)  (extensión)
                       │             │
                       └─ descartar ─┘
```

**El orden es el producto.** Cada paso a la derecha cuesta una llamada al modelo
de 40 a 240 segundos, así que se ordenan de barato a caro y **decides tú en el
medio**. Adaptar primero —como estaba al principio— gastaba una adaptación en
ofertas que no valían la pena y enterraba los gaps *después* de haber decidido.

Lo que cuesta modelo: **auditar**, **adaptar**, **la carta** y **las respuestas
del formulario**. Lo que no: buscar en el feed, generar el PDF y todo lo que se
ve en pantalla.

La secuencia entera está escrita **una sola vez**, en `preparar()`
(`src/studio/lote.js:57`). La usan el Editor para una oferta y la Cola para N,
y se puede parar a media (`hasta`) o reanudar por donde se quedó (`previo`), así
que lo que ya se pagó al modelo no se vuelve a pagar. No la dupliques: estuvo
escrita dos veces y arreglar la reanudación costó hacerlo dos veces.

### Paso a paso

1. **Entra la oferta.** Del Feed (con la URL puesta) o del modal «Nueva oferta»,
   donde pegas una URL, el texto, o varias de golpe: un enlace por línea, o
   bloques separados por una línea con `---` (`partir()` en `lote.js`). Con más
   de una se lanza la Cola.
2. **Se scrapea** si es URL (`fetchOffer()` en `src/scrape.js`): se prueba el
   `<script type="application/ld+json">` de schema.org —que publican Ashby,
   Greenhouse, Indeed e InfoJobs— y si no, se limpia el HTML a pelo. LinkedIn
   tiene su propio camino por el endpoint de invitado.
3. **Se audita** (`/api/audit`). Devuelve los requisitos con su encaje, su
   evidencia y la **cita literal de la oferta** que los exige, el % de
   imprescindibles, los bloqueantes, un veredicto, una recomendación y cuánto
   pedir. El texto scrapeado vuelve dentro de la respuesta para que el paso
   siguiente no lo baje otra vez.
4. **Decides tú.** «Tengo encaje — adaptar CV» o «Descartar oferta». Si la
   recomendación es `descartar`, la oferta nace descartada y `preparar()` se
   para ahí sin gastar la adaptación.
5. **Se adapta** (`/api/tailor`) y, si la quieres, **se escribe la carta**
   (`/api/cover`). A los dos les viaja la auditoría, no solo el texto: ver §6.
6. **El PDF** (`/api/pdf`): se manda el HTML del CV que estás viendo a un
   Chromium headless que lo imprime limpio.
7. **Aplicar**: se arma un paquete (PDF en base64, perfil, carta, texto de la
   oferta) y se le pasa a la extensión de Chrome, que abre la oferta y rellena el
   formulario en tu sesión. **Nunca pulsa enviar.**

La oferta se va guardando **en cuanto cada trozo existe** —la auditoría al
llegar, luego el CV, luego la carta—, no al final: si cierras la pestaña a mitad,
lo pagado no se pierde.

### Los siete estados

`guardada → preparada → enviada → entrevista → contratado`, más `rechazada` y
`descartada` fuera del camino. Las dos últimas no se funden a propósito:
*descartada* es que no llegaste a mandarla, *rechazada* es que te dijeron que no,
y juntarlas taparía si el problema está en tu criterio al elegir o en lo que
mandas.

Quien decide el estado es `SUCESOS` en `store.js`, con cuatro reglas y un único
camino (`suceso()`): auditada, cv, aplicada y marcada a mano. Cada cambio real
sella la fecha en `historia`, que es de donde salen los «hace N días» del
tablero.

## 3. Las pantallas

| Pantalla | Qué decides ahí |
|---|---|
| **Resumen** (`Bento`) | Dónde está cada candidatura: cuatro columnas con las tarjetas dentro y el estado cambiable en la propia tarjeta. Arriba, lo que aún no ha entrado en ninguna: sin auditar, solo auditadas, las que merecen la pena (las que la auditoría recomienda aplicar) y las listas para aplicar. |
| **Feed** | Las ofertas que hay ahora en tus fuentes, ordenadas. Cada una con su nota, su stack y sus avisos. Se recalcula como mucho una vez al día. |
| **Criterios** | Qué buscar y dónde. Ver §4. |
| **Ofertas** | El tracker: buscador, filtros por estado, salto rápido de estado y borrado múltiple. Las descartadas y rechazadas salen de la tabla y viven tras el chip «Archivadas». |
| **Salarios** | Lo que se te dijo que pidieras en cada oferta, con su banda, su suelo y la mediana de todas. El dato existía desde el 20-08 pero no había dónde volver a mirarlo. |
| **Variantes** (`Editor`) | El flujo en tres pasos —auditar, ver encaje, adaptar— más la vista previa del CV, el selector de diseño, la carta, el PDF y el botón «Aplicar». |
| **Perfil** | Lo que un formulario pregunta y un CV no dice: visado, salario objetivo, preaviso. Y el estado de la extensión. |
| **Cola** | Aparece solo mientras hay un lote en marcha. Una fila por oferta con su fase y un botón «Reintentar» que repite **solo lo que le faltó**. |

## 4. La búsqueda (`api/feed.js`)

23 fuentes tras una única tabla `ATS` de `{url, jobs}`: LinkedIn (endpoint
público de invitado), Greenhouse, Lever, Ashby, Workable, Workday, Amazon y
RemoteOK. LinkedIn no es una empresa sino una búsqueda, y usa el mismo campo
`token` con la forma `palabras clave|ubicación`.

El pipeline, de barato a caro:

```
board()  →  deduplicar()  →  filtrarCabecera()  →  detalle()  →  filtrarTexto()
                             ubicación/ventana    presupuesto   avisa y ordena
                             /palabra vetada        180 s
```

**La regla que define el producto: solo tres cosas descartan** —ubicación,
ventana temporal y palabras vetadas en el título—, porque son inequívocas y las
escribes tú. Todo lo demás **anota un aviso y ordena**. Antes cada criterio
borraba ofertas por su cuenta y todos juntos eran un AND: medido el 28-08-2026
sobre 534 ofertas reales, «remoto» tiraba 388, «sin salario» 392, exigir
Python+JavaScript dejaba 6, y el combo de todos los días dejaba **26 de 534**.
Un feed vacío no es un filtro fino, es un filtro roto.

**La nota (0-10)** mide qué proporción del stack que pide la oferta cubres, con
dos listas que no se juntan jamás:

- `OTRO_MUNDO` (Rails, .NET, Angular…) — **otro oficio**: cuenta en el
  denominador y baja la nota.
- `VECINAS` (AWS, PyTorch, Airflow…) — **tu oficio con una herramienta que no has
  tocado**: no resta, sale en `falta` para que la veas.

Juntarlas metía AWS y PyTorch en el denominador y tiraba 113 de 182 ofertas
técnicas reales. `Go` no vuelve a la lista: dos letras con match
case-insensitive casaban con el verbo inglés en 32 ofertas. `Golang` sí.

El orden final: primero lo que cumple más criterios tuyos, a igualdad la nota, y
a igualdad de nota la que cubre más tecnologías.

### Criterios

- **Descartan de verdad:** ubicación (una regex), ventana (24 h / semana / sin
  límite) y palabras vetadas en el título.
- **Avisan y ordenan:** modalidad, lenguajes (uno por uno, no todo-o-nada),
  salario mínimo, «priorizar las que publican salario» e IA sí/no.
- **Las fuentes:** las búsquedas de LinkedIn (puesto + ubicación) y los tableros
  de empresa (nombre, ATS y token), con botones para añadir las de fábrica que te
  falten o volver exactamente a la lista de fábrica.

Tu preset vive en localStorage y viaja a `/api/feed` en cada búsqueda; mientras
esté sin tocar manda el servidor. Cambiar un criterio invalida el feed cacheado,
para que no parezca que el panel no hace nada.

## 5. La auditoría (`api/audit.js`)

Un recruiter técnico severo compara la oferta con el CV entero —incluidos
estudios, idiomas y certificaciones, que no se pueden reescribir pero sí
evaluar— y devuelve de 4 a 14 requisitos, cada uno con tipo
(imprescindible/valorable), encaje (sí/parcial/no) y **evidencia citando la
empresa o la tecnología concreta** del CV.

Lo que **no** se le pregunta al modelo, porque se contradice:

- **`puntuar()`** — el % de imprescindibles y los bloqueantes. Los valorables van
  aparte y nunca se promedian: cumplir extras no compensa fallar un bloqueante.
- **`recomendar()`** — aplicar / con reservas / descartar. Preguntado, devolvía
  «descartar» con el 100 % de los imprescindibles cumplidos. **«Aplicar» pide
  ≥80 % de imprescindibles y cero bloqueantes**: es el «8/10» a partir del cual
  merece la pena gastar una adaptación. Un bloqueante baja a «con reservas»; dos,
  o menos del 50 %, descartan. Ese umbral vive **solo aquí**: el tablero no lo
  recalcula, lee la recomendación ya guardada con la oferta.
- **`pedirSalario()`** — la banda que **publica la oferta manda** sobre la que
  estima el modelo; el punto dentro de la banda sale de tu encaje (100 % → 0,85
  de la banda; por debajo del 60 % → 0,3), y siempre con un suelo por debajo:
  pedir sin saber tu mínimo es la mitad de la información, y es la mitad que se
  usa cuando llaman a negociar. Devuelve `null` cuando no hay nada honesto que
  decir.
- **`limpiarVeredicto()`** — si el veredicto degenera en un bucle de tokens (muy
  pocas palabras distintas para lo largo que es), se sustituye por el resumen
  calculado a partir de los números.

**Cada requisito lleva la frase de la oferta que lo exige**, y esa cita se
**comprueba contra el texto** en `normalizar()`: si no aparece —aplanando
espacios y mayúsculas— se queda vacía y no se pinta. Una cita inventada sería
peor que ninguna, porque la lees como si fuera prueba. Misma disciplina que
`applyPatch` con las tecnologías: la garantía es código, no prompt. Se comparan
solo letras y números, porque la oferta trae viñetas y negritas, pero **la
secuencia de palabras tiene que ser idéntica**: una paráfrasis que quita una
palabra se cae, y eso es la mayoría. Medido sobre Chery: 12 de 12 citas
verificadas, cero falsas.

**El idioma nunca frena una oferta.** `normalizar()` degrada todo requisito de
inglés a «valorable», pase lo que pase: sigue viéndose en la lista de valorables
—saber que lo piden es útil— pero no entra en el % de imprescindibles, no puede
ser bloqueante y no puede provocar un «descartar». Se hace ahí porque es el
embudo por el que pasan **todos** los requisitos antes de puntuar, recomendar y
calcular el salario. `normalizar()` es además quien garantiza los enums ahora
que el esquema no lo hace: ante la duda, «parcial» e «imprescindible».

## 6. La adaptación (`api/tailor.js`)

**El modelo no devuelve el CV: devuelve un parche.** Solo puede tocar `title`,
`profile`, las descripciones, los logros (máximo 3 por puesto, reordenados) y el
orden de las tecnologías. Empresas, fechas, puestos, estudios, certificaciones y
contacto ni se le mandan para reescribir ni se aceptan de vuelta.

`applyPatch()` es la red, y es **código, no prompt**:

- lo que falte en el parche se queda como está en el CV maestro (`src/data.js`);
- `tech` y `skills` se filtran contra los del maestro, así que **solo puede
  reordenar**: una tecnología que no tienes se cae y se anota en `dropped`;
- comparar ignora el matiz entre paréntesis («Python (Expert)» ≡ «Python») pero
  devuelve siempre el string que escribiste tú.

**La adaptación no vuelve a decidir qué encaja: se lo dice la auditoría.** A
`/api/tailor` —y a `/api/cover`— viaja `requisitos`, y `brief()` (en `tailor.js`,
una sola implementación para los dos) lo convierte en tres listas dentro del
prompt: lo **cubierto** que hay que hacer visible, lo **parcial** que se describe
con su alcance real sin subir años ni nivel, y lo **no cubierto** que va a `gaps`
y no se menciona. Sin esto los dos recibían el texto crudo y deducían de cero lo
que el auditor ya había clasificado: dos modelos resolviendo lo mismo por
separado, y sus `gaps` contradiciendo al informe que acabas de leer en pantalla.
No es una llamada más — el dato ya estaba pagado.

Medido el 07-09-2026 sobre la oferta de Chery, la misma llamada con y sin: **con
el brief salen 4 gaps, exactamente los cuatro requisitos que la auditoría marcó
«no», y cero invenciones**; sin él salían 6 gaps inventados de cero y una
invención real —declaraba «ELT» como gap y acto seguido lo escribía en el CV—.
Además sacaba el inglés como gap, que `normalizar()` mantiene fuera de las
decisiones a propósito: el adaptador a ciegas lo reintroducía por detrás.

Para el texto libre, que no se puede validar contra una lista, está
`findInventions()`: si el modelo declara algo como *gap* y acto seguido lo
escribe, se está contradiciendo, y eso es exactamente una invención. Se avisa en
el editor. `scripts/tailor-test.js` lo verifica con un parche malicioso.

## 7. Carta, respuestas y PDF

- **`/api/cover`** — la carta, aparte de la adaptación porque no toda oferta la
  merece y ya son ~35 s. La única red posible aquí es `findInventions()`.
- **`/api/answers`** — las preguntas del formulario que la tabla de la extensión
  no sabe responder («¿cuántos años con Kubernetes?»). Lo llama el **service
  worker de la extensión**, no la web: un content script corre bajo la CSP del
  portal y esa petición se la comería. Aquí la red anti-invención importa más que
  en ningún sitio: declarar tres años de algo que no has tocado te cuesta la
  entrevista.
- **`/api/pdf`** — Chromium headless imprime el HTML del CV que estás viendo.
  En el servidor y no con `window.print()` porque el navegador estampa cabecera y
  pie (fecha, URL) y no hay CSS que los quite; y nada de rasterizar el DOM a
  imagen, porque el diseño ATS necesita **texto extraíble**. En Vercel usa el
  binario de `@sparticuz/chromium`; en local, tu Chrome.

Hay tres diseños (`src/designs/`): **ATS** —el único que se sube a un portal—,
**Minimalista** y **Tarjetas**. Sus `id` no son correlativos y no se renumeran:
son los que entiende `scripts/pdf.py`.

El PDF cae en la carpeta que elijas una vez con la File System Access API
(guardada en IndexedDB) o, si el navegador no la soporta, en Descargas.

## 8. Aplicar: la extensión (`extension/`)

Una web **no puede** tocar el formulario de otro dominio: lo prohíbe el
navegador. Por eso hay una extensión de Chrome MV3 que corre en tu sesión.

El camino: la app hace `postMessage` → `bridge.js` (content script en el propio
origen de CV Studio, que además deja `data-cv-studio="1"` en el `<html>` para que
la app sepa si está instalada) → el service worker guarda el paquete por pestaña,
abre la oferta → `campos.js` + `rellenar.js` rellenan.

`campos.js` es **una tabla genérica por etiqueta**, no un mapa por ATS:
Greenhouse, Lever, Ashby y Workable son formularios normales con `<label>`, y
cuatro mapas serían cuatro cosas que se rompen solas. Escribe llamando al setter
nativo del prototipo y disparando los eventos a mano, porque React se pierde un
`el.value = x`.

**Las tres reglas de los botones, sin excepciones:**

- un botón de **enviar** no se pulsa jamás;
- uno de **abrir** solo antes de haber escrito nada;
- uno de **siguiente** solo con el paso relleno y cero campos obligatorios
  pendientes. Si queda uno en naranja, se para y te espera.

`scripts/apply-test.js` verifica la tabla con etiquetas reales copiadas de los
formularios, y `scripts/portal-test.js` ejecuta la extensión entera contra
Greenhouse y Lever de verdad.

## 9. Las dos vías al modelo (`src/acceso.js`)

1. **AI Gateway de Vercel** primero: habla el protocolo de OpenAI (mismo SDK,
   otra `baseURL`), enruta al proveedor más rápido y cae solo al siguiente modelo
   si el suyo falla. Techo de 90 s.
2. **NVIDIA NIM** detrás, sin techo.

Basta con que haya **una**. Hoy va todo por NIM, que tarda 150-240 s: el gateway
está configurado pero Vercel no lo sirve sin una tarjeta registrada.

En vez de un timeout fijo hay un **presupuesto de tiempo**: el handler fija el
final antes del scrape y cada intento recibe lo que queda menos 15 s de reserva.
Con el timeout de 130 s que había antes, toda llamada fallaba y el reintento la
repetía contra el mismo servicio saturado: 260 s de espera para leer «el modelo
no ha respondido a tiempo». El reintento solo se queda en la misma vía si el
fallo fue **instantáneo** (401/429/503 espurios) o **de contenido**; un timeout
cambia de vía.

Nunca `response_format: json_schema` con NIM: su decodificación restringida deja
de emitir a mitad del objeto y rellena con espacios hasta agotar `max_tokens`.
Medido: 0 de 8 buenas contra 5 de 5 con `json_object`.

## 10. La terminal (`scripts/`)

`.vercelignore` los deja fuera del despliegue: son tuyos, no del servidor.

| Comando | Qué hace |
|---|---|
| `npm run feed` | El feed en tabla markdown. `--desde 24h`, `--check` (valida los tokens de las empresas), `--selftest`. |
| `npm run oferta -- <URL>` | Baja el texto de una oferta que esconde el contenido tras JS o antibot. |
| `npm run pdf` | Genera los PDF del repo desde `dist/`. Los diseños se eligen por su `id`. |
| `npm run ats` | Audita un PDF como lo haría un ATS: extrae el texto con pdfminer y comprueba que lo que dice `data.js` sobrevive. No inventa una «puntuación ATS»: eso no existe. |
| `npm run portal-test` | La extensión entera contra formularios reales. Necesita navegador y red, por eso está fuera de `npm test`. |
| `npm run set-password` | Genera el hash `salt:derivado` de scrypt para `TAILOR_PASSWORD_HASH`. |
| `npm test` | Los cinco selftests: parche, ATS, feed, contraseña y autorrelleno. |

## 11. Lo que no hace

- **Un navegador, un usuario.** `localStorage` no viaja: verlo desde el móvil
  pide base de datos y autenticación de verdad, no una contraseña compartida.
- **La Cola vive en memoria**: al recargar desaparece la pantalla, aunque las
  ofertas ya estén guardadas en el tracker.
- **La extensión no envía.** Deja el formulario listo; confirmar es tuyo.
- **El feed no cruza fuentes**: la misma oferta en LinkedIn y en el tablero de la
  empresa tiene URLs distintas y sale dos veces. Es raro y no vale la pena.
