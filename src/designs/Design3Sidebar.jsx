import { memo } from 'react';
import { Mail, Phone, MapPin, Globe, Briefcase, GraduationCap, CheckCircle } from 'lucide-react';

const Design3Sidebar = ({ data }) => {
  return (
    <div className="bg-[var(--bg)] min-h-screen py-10 px-4 font-sans">
      <div className="max-w-[950px] mx-auto bg-[var(--surface)] shadow-xl rounded-xl overflow-hidden flex">

        {/* Sidebar */}
        <aside className="w-80 bg-gradient-to-b from-[var(--accent)] to-[var(--accent-2)] text-[color:var(--accent-contrast)] p-8 flex-shrink-0">
          <div className="text-center mb-8">
            <img
              src="/foto.jpg"
              alt={data.name}
              className="w-32 h-32 rounded-full object-cover object-top mx-auto border-4 border-[var(--accent-contrast)]/30 mb-4"
            />
            <h1 className="text-xl font-bold mb-1">{data.name}</h1>
            <p className="text-[color:var(--accent-contrast)]/80 text-xs uppercase tracking-wider">{data.title}</p>
          </div>

          {/* Contacto */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-[color:var(--accent-contrast)]/80 mb-3 border-b border-[color:var(--accent-contrast)]/30 pb-1">Contacto</h2>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Mail size={14} className="text-[color:var(--accent-contrast)]/70"/> {data.contact.email}</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-[color:var(--accent-contrast)]/70"/> {data.contact.phone}</p>
              <p className="flex items-center gap-2"><MapPin size={14} className="text-[color:var(--accent-contrast)]/70"/> {data.contact.location}</p>
              <p className="flex items-center gap-2"><Globe size={14} className="text-[color:var(--accent-contrast)]/70"/> {data.contact.portfolio}</p>
            </div>
          </section>

          {/* Skills */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-[color:var(--accent-contrast)]/80 mb-3 border-b border-[color:var(--accent-contrast)]/30 pb-1">Tecnologías</h2>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[color:var(--accent-contrast)]/70 mb-1">Backend</p>
                <div className="flex flex-wrap gap-1">
                  {data.skills.backend.map(s => (
                    <span key={s} className="bg-[color:var(--accent-contrast)]/10 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[color:var(--accent-contrast)]/70 mb-1">Frontend</p>
                <div className="flex flex-wrap gap-1">
                  {data.skills.frontend.map(s => (
                    <span key={s} className="bg-[color:var(--accent-contrast)]/10 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[color:var(--accent-contrast)]/70 mb-1">AI & DevOps</p>
                <div className="flex flex-wrap gap-1">
                  {data.skills.ai_devops.map(s => (
                    <span key={s} className="bg-[color:var(--accent-contrast)]/10 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Idiomas */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-[color:var(--accent-contrast)]/80 mb-3 border-b border-[color:var(--accent-contrast)]/30 pb-1">Idiomas</h2>
            <div className="space-y-2 text-sm">
              {data.languages.map((lang, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{lang.split(' (')[0]}</span>
                  <span className="text-[color:var(--accent-contrast)]/70 text-xs">{lang.split(' (')[1]?.replace(')', '')}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 p-8">
          {/* Perfil */}
          <section className="mb-8 pb-6 border-b border-[var(--border)]">
            <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">Perfil Profesional</h2>
            <p className="text-[var(--text-muted)] leading-relaxed text-sm">{data.profile}</p>
          </section>

          {/* Experiencia */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-4 flex items-center gap-2">
              <Briefcase size={14}/> Experiencia Profesional
            </h2>
            <div className="space-y-6">
              {data.experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-[var(--text)]">{exp.project}</h3>
                    <span className="text-xs text-[var(--accent)] bg-[var(--chip-bg)] px-2 py-1 rounded-full">{exp.role}</span>
                  </div>
                  {exp.dates && (
                    <p className="text-[10px] uppercase tracking-widest text-[var(--accent-2)] mb-2">{exp.dates}</p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mb-2 italic">{exp.description}</p>
                  <ul className="space-y-1 mb-2">
                    {exp.achievements.map((ach, i) => (
                      <li key={i} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                        <CheckCircle size={12} className="text-[var(--accent-2)] mt-1 flex-shrink-0"/> {ach}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1">
                    {exp.tech.map(t => (
                      <span key={t} className="text-[9px] bg-[var(--surface-alt)] text-[var(--text-muted)] px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Educación */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-4 flex items-center gap-2">
              <GraduationCap size={14}/> Educación
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {data.education.map((edu, idx) => (
                <div key={idx} className="bg-[var(--surface-alt)] p-4 rounded-lg">
                  <p className="font-bold text-[var(--text)] text-sm">{edu.degree}</p>
                  <p className="text-xs text-[var(--text-muted)]">{edu.center}</p>
                  {edu.dates && <p className="text-[10px] uppercase tracking-widest text-[var(--accent-2)] mt-1">{edu.dates}</p>}
                  <p className="text-xs text-[var(--accent)] mt-1">{edu.note}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

      </div>
    </div>
  );
};

export default memo(Design3Sidebar);
