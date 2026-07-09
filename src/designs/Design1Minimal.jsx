import { memo } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const Design1Minimal = ({ data }) => {
  return (
    <div className="bg-[var(--bg)] min-h-screen py-16 px-4 font-sans text-[var(--text)]">
      <div className="max-w-[800px] mx-auto">

        {/* Header minimalista */}
        <header className="mb-12 pb-8 border-b border-[var(--border)]">
          <div className="flex items-center gap-8">
            <img
              src="/foto.jpg"
              alt={data.name}
              className="w-24 h-24 rounded-full object-cover object-top grayscale border border-[var(--border)]"
            />
            <div>
              <h1 className="text-3xl font-light text-[var(--text)] mb-1">{data.name}</h1>
              <p className="text-sm text-[var(--text-muted)] uppercase tracking-widest mb-4">{data.title}</p>
              <div className="flex gap-6 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><Mail size={12}/> {data.contact.email}</span>
                <span className="flex items-center gap-1"><Phone size={12}/> {data.contact.phone}</span>
                <span className="flex items-center gap-1"><MapPin size={12}/> {data.contact.location}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Perfil */}
        <section className="mb-10">
          <p className="text-[var(--text-muted)] leading-relaxed text-sm max-w-2xl">{data.profile}</p>
        </section>

        {/* Experiencia */}
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-6">Experiencia</h2>
          <div className="space-y-8">
            {data.experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-medium text-[var(--text)]">{exp.project}</h3>
                  <span className="text-xs text-[var(--text-muted)]">{exp.role}</span>
                </div>
                {exp.dates && (
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">{exp.dates}</p>
                )}
                <ul className="space-y-1 mb-3">
                  {exp.achievements.map((ach, i) => (
                    <li key={i} className="text-sm text-[var(--text-muted)] pl-4 relative before:content-['–'] before:absolute before:left-0 before:text-[var(--text-muted)]">
                      {ach}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {exp.tech.map(t => (
                    <span key={t} className="text-[10px] text-[var(--text-muted)]">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills y Educación en dos columnas */}
        <div className="grid grid-cols-2 gap-12">
          <section>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-4">Tecnologías</h2>
            <div className="space-y-3 text-sm text-[var(--text-muted)]">
              <p><span className="text-[var(--text-muted)] text-xs">Backend:</span> {data.skills.backend.join(", ")}</p>
              <p><span className="text-[var(--text-muted)] text-xs">Frontend:</span> {data.skills.frontend.join(", ")}</p>
              <p><span className="text-[var(--text-muted)] text-xs">AI/DevOps:</span> {data.skills.ai_devops.join(", ")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] mb-4">Educación</h2>
            {data.education.map((edu, idx) => (
              <div key={idx} className="mb-3">
                <p className="text-sm text-[var(--text)]">{edu.degree}</p>
                {edu.center && <p className="text-xs text-[var(--text-muted)]">{edu.center}</p>}
                {edu.dates && <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{edu.dates}</p>}
                <p className="text-xs text-[var(--text-muted)]">{edu.note}</p>
              </div>
            ))}
          </section>
        </div>

      </div>
    </div>
  );
};

export default memo(Design1Minimal);
