// La tabla que traduce la ETIQUETA de un campo de formulario a un dato tuyo.
//
// Lógica pura, sin DOM y sin `import`: así la carga el content script como un
// <script> más y a la vez la puede probar node (scripts/apply-test.js la evalúa
// con new Function). Sin paso de compilación.
//
// ponytail: una tabla genérica por etiqueta, NO un mapa por ATS. Greenhouse,
// Lever, Ashby y Workable son formularios normales con <label>; cuatro mapas
// serían cuatro cosas que se rompen solas cuando uno cambia el DOM. Si un
// portal falla de verdad, se le añade su excepción aquí y punto.

// "First Name *" -> "first name" | "¿Estás autorizado?" -> "estas autorizado"
function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // fuera tildes
    .toLowerCase()
    .replace(/[*✱†]|\(required\)|\(optional\)|\(obligatorio\)/g, '')
    .replace(/[¿?¡!:.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Se recorre EN ORDEN y gana la primera que case. El orden ES la lógica:
// los rechazos van arriba para que "Current company" no acabe en tu nombre, y
// "email address" tiene que decidirse antes que "address".
var CAMPOS = [
  // --- lo que NUNCA se rellena solo -----------------------------------------
  // Datos de OTROS o de un puesto anterior: si los rellenamos, mentimos.
  [/\bcompany\b|\bemployer\b|empresa actual|current (company|employer|title|role)/, null],
  [/referred by|referral|referencia|recommend|reference (number|code)/, null],
  [/emergency|emergencia/, null],
  // Consentimientos: la política de privacidad, los términos y el "acepto que
  // guardéis mis datos". Eso lo marcas tú o no lo marca nadie.
  [/privacy policy|politica de privacidad|i (agree|consent|acknowledge)|acknowledge that|terms and conditions|acepto (los|la|el)|consentimiento/, null],
  // El prefijo internacional es un desplegable aparte del teléfono.
  [/phone code|country code|prefijo/, null],

  // --- identidad -------------------------------------------------------------
  // "Full name" y el "Name" pelado de Ashby/Lever: un solo campo para todo.
  [/^(full |legal |your )?names?$|nombre completo|nombre y apellidos/, 'nombreCompleto'],
  [/first ?name|given name|forename|^nombre/, 'nombre'],
  [/last ?name|surname|family ?name|apellid/, 'apellidos'],
  [/e-?mail|correo/, 'email'],
  [/phone|telefono|movil|mobile|whatsapp/, 'telefono'],

  // --- enlaces ---------------------------------------------------------------
  [/linked ?in/, 'linkedin'],
  [/git ?hub/, 'github'],
  [/twitter|^x url|stack ?overflow|dribbble|behance/, null], // no los tienes
  [/website|portfolio|personal (site|page|website)|pagina web|blog/, 'web'],

  // --- autorización de trabajo ------------------------------------------------
  // ARRIBA DEL TODO y antes que la ubicación, que si no se la come: Greenhouse
  // pregunta "authorized to work in the COUNTRY for which you are applying" y
  // la regla de país respondía "Barcelona, España" a una pregunta de sí/no.
  // Y el visado antes que la autorización, porque "require sponsorship TO WORK"
  // lleva dentro "to work" y acabaríamos respondiendo justo lo contrario.
  [/sponsor|visa|work permit|permiso de trabajo|tarjeta de residencia/, 'necesitaVisado'],
  [/legally (authoriz|authoris|eligible|entitled)|authoriz\w* to work|eligible to work|right to work|autorizado para trabajar|puedes trabajar/, 'autorizado'],

  // --- dónde estás -----------------------------------------------------------
  // El país va aparte: en un desplegable de países, "Barcelona, España" no casa
  // con nada y te deja el campo vacío.
  [/^country$|^pais$|country of residence|pais de residencia/, 'pais'],
  [/city|ciudad|town|location|ubicacion|address|direccion|based|residenc/, 'ubicacion'],

  // --- condiciones -----------------------------------------------------------
  [/salary|compensation|salari|remuneraci|expectativ|desired pay|pretensiones/, 'salarioObjetivo'],
  [/notice period|preaviso/, 'preaviso'],
  [/when can you (start|join)|availab|disponib|start date|incorporaci|earliest/, 'disponibilidad'],
  // Anclado a propósito: solo los años TOTALES. "Years of experience with
  // Kubernetes" tiene que caerse de la tabla y acabar en /api/answers, que sí
  // ha leído el CV. Contestar 6 a eso desde aquí sería inventar.
  [/^(how many )?years? of (professional |total |work )?experience( do you have)?$|^anos de experiencia$/, 'aniosExperiencia'],

  // --- texto largo y ficheros -------------------------------------------------
  [/cover[ _-]?letter|carta de presentacion|motivation|why (do you want|are you interested|this|us)|por que (te|quieres|nos)/, 'carta'],
  [/resume|curriculum|curriculo|^cv$|\bcv\b|hoja de vida/, 'cv'],

  [/how did you hear|how you heard|where did you (hear|find)|source|como nos has conocido|como nos conociste/, 'fuente'],
  // "Verify New Password" de Workday ya casa por "password"; lo que no casaba son
  // las que no llevan la palabra. Las dos casillas reciben la MISMA contraseña, y
  // por eso tiene que ser la misma en toda la pestaña (la genera sw.js, no esto).
  [/password|contrasena|passphrase|re-?type|repetir|repite/, 'password'],

  // Preguntas obligatorias por ley en EE. UU. Declinar es respuesta válida.
  [/gender|genero|\brace\b|ethnic|etnia|hispanic|latino|veteran|disability|discapacidad|pronoun/, 'eeo'],
]

// null = campo conocido que NO se toca. undefined = no sabemos qué es, y eso es
// lo que acaba en /api/answers. La diferencia importa: confundirlas mandaría
// "Current company" al modelo para que se inventara una.
function campoPara(etiqueta) {
  const t = normalizar(etiqueta)
  if (!t) return undefined
  for (const [re, clave] of CAMPOS) if (re.test(t)) return clave
  return undefined
}

// Sí/no en el idioma y las palabras del propio desplegable. Se le pasa el texto
// de cada opción y devuelve la que toca.
function opcionPara(valor, opciones) {
  const quiere = valor === true ? /^(yes|si|sí|y)\b|^true$/i
    : valor === false ? /^(no|n)\b|^false$/i
    : valor === 'decline' ? /decline|prefer not|prefiero no|(wish|want) to answer|no deseo|not specified/i
    : new RegExp(String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const norm = opciones.map(normalizar)
  const i = norm.findIndex((o) => quiere.test(o))
  if (i >= 0) return opciones[i]
  // Y al revés: el desplegable de sedes de Lever ofrece "Barcelona" y nosotros
  // traemos "Barcelona, España". La opción contenida en el valor también vale.
  if (typeof valor !== 'string') return null
  const v = normalizar(valor)
  const j = norm.findIndex((o) => o.length > 2 && v.includes(o))
  return j >= 0 ? opciones[j] : null
}

// El valor para una clave. Devuelve booleano en las de sí/no —quien rellena
// decide si eso es un radio, un select o un texto— y undefined si no hay dato,
// que es distinto de la cadena vacía: sin dato no se toca el campo.
function valorPara(clave, ctx) {
  const { perfil = {}, carta = null, password = null } = ctx ?? {}
  switch (clave) {
    case 'nombreCompleto': return `${perfil.nombre} ${perfil.apellidos}`.trim()
    case 'autorizado': return perfil.autorizado
    case 'necesitaVisado': return perfil.necesitaVisado
    case 'carta': return carta ?? undefined
    case 'password': return password ?? undefined
    case 'cv': return undefined // lo adjunta rellenar.js, no es texto
    default: return perfil[clave] || undefined
  }
}

// --- los botones ---------------------------------------------------------------
// Tres categorías, y las reglas de CUÁNDO se pulsa cada una viven en rellenar.js:
//
//   'enviar'    NUNCA se pulsa. Se comprueba la primera y gana sobre las demás,
//               así que un "Continue and submit" cuenta como enviar.
//   'abrir'     abre el formulario (Greenhouse esconde el suyo detrás de "Apply
//               for this job"; en LinkedIn el Easy Apply es un modal que no
//               existe hasta pulsarlo). Solo se pulsa ANTES de escribir nada: si
//               fuese el envío de un formulario vacío, no hay nada que enviar.
//   'siguiente' pasa de paso en un alta o en un formulario largo. Solo se pulsa
//               con el paso ya relleno y CERO campos obligatorios pendientes.
//   'alta'      crea la cuenta. Vale en los DOS momentos: abre el formulario de
//               registro si no hay ninguno, y lo envía cuando ya está relleno.
//               Es su propia categoría porque crear una cuenta no es mandar una
//               candidatura: sin poder pulsarlo, el alta se quedaba a medias en
//               Workday y había que terminarla a mano.
//
// ponytail: dos listas de texto, no detección de formularios. El texto del botón
// es lo único que significa lo mismo en Greenhouse, Workday y LinkedIn.
var ENVIAR = [
  /\bsubmit\b/, /send (application|my application)/, /^send$/,
  /^enviar/, /enviar (candidatura|solicitud|aplicacion)/,
  /^finish$/, /finalizar/, /^postular$/,
]

var ABRIR = [
  /^(easy )?apply( now| here)?$/, /apply (for|to) this (job|role|position)/,
  /^i'?m interested$/, /^solicitar/, /^inscribirse/, /^apuntarme/,
]

var ALTA = [
  /create (an )?account/, /^crear (una )?cuenta/, /^sign ?up$/, /^registrarse$/,
  /^register$/, /^create$/,
]

var SIGUIENTE = [
  /^next\b/, /continue to next/, /^continue$/, /save and continue/, /^save & continue$/,
  /^siguiente$/, /^continuar$/, /guardar y continuar/,
  /^review$/, /review your application/, /^revisar/,
]

function botonPara(texto) {
  const t = normalizar(texto)
  if (!t || t.length > 40) return null
  // El orden importa: enviar se comprueba primero y no hay forma de que un botón
  // de envío acabe clasificado como otra cosa.
  if (ENVIAR.some((re) => re.test(t))) return 'enviar'
  if (ALTA.some((re) => re.test(t))) return 'alta'
  if (ABRIR.some((re) => re.test(t))) return 'abrir'
  if (SIGUIENTE.some((re) => re.test(t))) return 'siguiente'
  return null
}

// --- ¿está este portal cubierto? -----------------------------------------------
// El content script solo se inyecta en los dominios del manifest. Si aplicas en
// la web de empleo propia de una empresa, "Aplicar" abría la pestaña y no pasaba
// NADA: sin panel, sin error, sin saber por qué. Esto lo detecta antes de abrirla.
//
// `matches` son los patrones del propio manifest, no una copia: duplicar la lista
// sería garantizar que un día divergen.
function portalCubierto(url, matches) {
  let host
  try { host = new URL(url).hostname } catch { return false }
  return (matches || []).some((m) => {
    const dominio = String(m).replace(/^(\*|https?):\/\//, '').replace(/\/.*$/, '')
    // "*.greenhouse.io" cubre greenhouse.io y cualquier subdominio suyo. Un
    // comodín en medio ("cv-victor-trisac-*.vercel.app") no es un portal: se
    // compara exacto y no casa, que es lo que queremos.
    return dominio.startsWith('*.')
      ? host === dominio.slice(2) || host.endsWith(dominio.slice(1))
      : host === dominio
  })
}
