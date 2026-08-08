import { memo } from 'react';

// Diseño para SUBIR a un ATS, no para enseñar a un humano. Feo a propósito.
// Cada decisión de aquí corrige un fallo medido con pdfminer sobre los PDFs
// anteriores (ver scripts/ats.js --selftest y el informe de `npm run ats`):
//
//   1. UNA columna. Los otros 5 diseños usan grid-cols-2/3 y el extractor
//      entrelaza las columnas: el puesto "Senior AI Engineer" acababa dentro
//      del bloque de tecnologías. Aquí el orden de lectura es el visual.
//   2. Sin `tracking-*`. `uppercase tracking-widest` en las fechas las
//      extraía como "F E B .   2 0 2 6" y el ATS no podía calcular tu
//      antigüedad. Es el fallo que más caro sale: sin fechas no hay timeline.
//   3. Arial/Helvetica explícita. La fuente por defecto en macOS (.SFNS) se
//      incrusta como Type 3 con encoding Custom, que los parsers viejos
//      (PDFBox) leen mal o no leen.
//   4. Listas unidas con ", " en un solo nodo de texto. Los chips sueltos
//      salían pegados: "MariaDBMongoDB", "DjangoNode.js".
//
// ponytail: sin foto, sin iconos, sin color. No es descuido: son elementos
// que no aportan texto extraíble y sí ruido al parser.
const Design6ATS = ({ data }) => {
  const L = data.labels;
  const es = L.education === 'Educación';
  const t = {
    summary: es ? 'Perfil Profesional' : 'Professional Summary',
    tech: es ? 'Tecnologías' : 'Technologies',
  };
  const contact = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.linkedin,
    data.contact.portfolio,
  ].filter(Boolean).join(' | ');

  // Encabezado de sección: los ATS segmentan por estos títulos, así que van
  // en su propia línea y con los nombres estándar que data.labels ya define.
  const H = ({ children }) => (
    <h2 className="text-[13px] font-bold mt-[14px] mb-[5px] pb-[2px] border-b border-black uppercase">
      {children}
    </h2>
  );

  return (
    <div
      className="bg-white min-h-screen py-12 px-4 text-black print-a4"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="max-w-[800px] mx-auto leading-[1.35]">
        <h1 className="text-[22px] font-bold">{data.name}</h1>
        <p className="text-[12px] font-bold">{data.title}</p>
        <p className="text-[10.5px] mt-[3px]">{contact}</p>

        <H>{t.summary}</H>
        <p className="text-[10.5px]">{data.profile}</p>

        <H>{L.experience}</H>
        {data.experience.map((exp, i) => (
          <div key={i} className="mb-[9px] print-avoid-break">
            {/* Puesto y empresa en líneas separadas: es el orden que espera
                un parser (job title, luego employer y fechas). */}
            <p className="text-[11px] font-bold">{exp.role}</p>
            <p className="text-[10.5px]">{exp.project} | {exp.dates}</p>
            <p className="text-[10.5px]">{exp.description}</p>
            <ul className="list-disc pl-[16px] text-[10.5px]">
              {exp.achievements.map((a, j) => <li key={j}>{a}</li>)}
            </ul>
            <p className="text-[10.5px]">{t.tech}: {exp.tech.join(', ')}</p>
          </div>
        ))}

        <H>{L.technologies}</H>
        {[
          [L.backend, data.skills.backend],
          [L.frontend, data.skills.frontend],
          [L.aiDevops, data.skills.ai_devops],
          [L.databases, data.skills.databases],
        ].map(([label, items]) => (
          <p key={label} className="text-[10.5px]">
            <span className="font-bold">{label}:</span> {items.join(', ')}
          </p>
        ))}

        <H>{L.education}</H>
        {data.education.map((edu, i) => (
          <div key={i} className="mb-[5px] print-avoid-break">
            <p className="text-[11px] font-bold">{edu.degree}</p>
            <p className="text-[10.5px]">{edu.center} | {edu.dates}</p>
            {(edu.note || edu.details) && (
              <p className="text-[10.5px]">{[edu.note, edu.details].filter(Boolean).join('. ')}</p>
            )}
          </div>
        ))}

        <H>{L.certifications}</H>
        {data.certifications.map((c, i) => (
          <p key={i} className="text-[10.5px]">{c.name} — {c.issuer}, {c.date}</p>
        ))}

        <H>{L.languages}</H>
        <p className="text-[10.5px]">{data.languages.join(', ')}</p>
      </div>
    </div>
  );
};

export default memo(Design6ATS);
