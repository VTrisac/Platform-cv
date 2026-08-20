import { dataES } from './data.js'

// Lo que un formulario de candidatura pregunta y un CV no dice: visado, salario
// objetivo, preaviso. No va en data.js porque no es CV — es lo que rellenas a
// mano en cada portal y siempre respondes igual.
//
// Lo que YA está en el CV (teléfono, email, ubicación, LinkedIn, portfolio) se
// deriva de dataES.contact: si cambias el CV, cambia la candidatura. Duplicarlo
// aquí sería garantizar que un día divergen.
//
// ponytail: valores por defecto en código, no un asistente de primer arranque.
// Se editan una vez en la pantalla Perfil y viven en localStorage.

export const PERFIL = {
  // Partidos porque los formularios los piden por separado casi siempre.
  // A mano y no derivados de dataES.name: ahí van en mayúsculas porque es la
  // cabecera de un CV, y "VÍCTOR TRISAC" en un formulario queda a grito.
  nombre: 'Víctor',
  apellidos: 'Trisac',
  email: dataES.contact.email,
  telefono: dataES.contact.phone,
  ubicacion: dataES.contact.location,
  // Aparte de la ciudad: los portales tienen un desplegable de países y en
  // inglés. "Barcelona, España" ahí no casa con nada y te deja el campo vacío.
  pais: 'Spain',
  linkedin: `https://${dataES.contact.linkedin}`,
  github: '',
  web: `https://${dataES.contact.portfolio}`,

  // Autorización de trabajo. Son dos preguntas distintas y los portales hacen
  // las dos: "¿puedes trabajar aquí?" y "¿necesitas que te patrocinemos?".
  autorizado: true,
  necesitaVisado: false,

  salarioObjetivo: '',
  preaviso: '15 días',
  disponibilidad: 'Inmediata',
  aniosExperiencia: '6',
  fuente: 'LinkedIn',

  // Los formularios de EE. UU. (Greenhouse, Lever) preguntan raza, género,
  // veteranía y discapacidad por ley. Declinar es una respuesta válida y es la
  // que se manda salvo que la cambies.
  eeo: 'decline',
}

// El perfil efectivo: los valores por defecto con encima lo que hayas editado.
export const conPerfil = (guardado) => ({ ...PERFIL, ...(guardado ?? {}) })

// El campo de pretensiones del formulario. Lo que hayas puesto tú en Perfil manda;
// si está vacío, la cifra que calculó la auditoría PARA ESA OFERTA — que es lo
// suyo: no se pide lo mismo en una startup que en una farmacéutica.
export const conSalario = (perfil, salario) =>
  perfil.salarioObjetivo || !salario?.pedir
    ? perfil
    : { ...perfil, salarioObjetivo: `${salario.pedir.toLocaleString('es-ES')} € brutos/año` }
