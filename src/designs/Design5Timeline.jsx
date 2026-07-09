import { memo } from 'react';
import { Mail, Phone, MapPin, Globe, GraduationCap, CheckCircle } from 'lucide-react';

const Design5Timeline = ({ data }) => {
  return (
    <div className="bg-[var(--bg)] min-h-screen font-sans">
      {/* Header compacto */}
      <header className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[color:var(--accent-contrast)] py-8 px-4">
        <div className="max-w-[900px] mx-auto flex items-center gap-6">
          <img
            src="/foto.jpg"
            alt={data.name}
            className="w-24 h-24 rounded-full object-cover object-top border-4 border-[var(--accent-contrast)]/30"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">{data.name}</h1>
            <p className="text-[color:var(--accent-contrast)]/80 text-sm mb-3">{data.title}</p>
            <div className="flex flex-wrap gap-4 text-xs text-[color:var(--accent-contrast)]/80">
              <span className="flex items-center gap-1"><Mail size={12}/> {data.contact.email}</span>
              <span className="flex items-center gap-1"><Phone size={12}/> {data.contact.phone}</span>
              <span className="flex items-center gap-1"><MapPin size={12}/> {data.contact.location}</span>
              <span className="flex items-center gap-1"><Globe size={12}/> {data.contact.portfolio}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[900px] mx-auto py-10 px-4">
        {/* Perfil */}
        <section className="mb-10 text-center max-w-2xl mx-auto">
          <p className="text-[var(--text-muted)] leading-relaxed">{data.profile}</p>
        </section>

        <div className="grid grid-cols-3 gap-10">
          {/* Timeline de experiencia */}
          <div className="col-span-2">
            <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-6 font-bold">Trayectoria Profesional</h2>

            <div className="relative">
              {/* Línea vertical */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--accent)] to-[var(--accent-2)]"></div>

              <div className="space-y-8">
                {data.experience.map((exp, idx) => (
                  <div key={idx} className="relative pl-12">
                    {/* Nodo */}
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-[var(--accent-contrast)] text-xs font-bold shadow-lg">
                      {idx + 1}
                    </div>

                    <div className="bg-[var(--surface-alt)] rounded-xl p-5 hover:bg-[var(--chip-bg)] transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-[var(--text)] text-lg">{exp.project}</h3>
                        <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--chip-bg)] px-2 py-1 rounded-full uppercase">
                          {exp.role}
                        </span>
                      </div>
                      {exp.dates && (
                        <p className="text-[10px] uppercase tracking-widest text-[var(--accent-2)] mb-2 font-bold">{exp.dates}</p>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mb-3 italic">{exp.description}</p>
                      <ul className="space-y-1.5 mb-3">
                        {exp.achievements.map((ach, i) => (
                          <li key={i} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                            <CheckCircle size={14} className="text-[var(--accent-3)] mt-0.5 flex-shrink-0"/> {ach}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-1">
                        {exp.tech.map(t => (
                          <span key={t} className="text-[9px] bg-[var(--surface)] text-[var(--text-muted)] px-2 py-0.5 rounded border border-[var(--border)]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar derecho */}
          <div className="space-y-8">
            {/* Skills */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-4 font-bold">Stack Técnico</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">Backend</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.backend.map(s => (
                      <span key={s} className="text-xs bg-[var(--chip-bg)] text-[var(--chip-text)] px-2 py-1 rounded">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">Frontend</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.frontend.map(s => (
                      <span key={s} className="text-xs bg-[var(--surface-alt)] text-[var(--accent-2)] px-2 py-1 rounded">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">AI & DevOps</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.ai_devops.map(s => (
                      <span key={s} className="text-xs bg-[var(--surface-alt)] text-[var(--accent-3)] px-2 py-1 rounded">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">Bases de Datos</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.databases.map(s => (
                      <span key={s} className="text-xs bg-[var(--surface-alt)] text-[var(--text)] px-2 py-1 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Educación */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-4 font-bold flex items-center gap-2">
                <GraduationCap size={14}/> Formación
              </h2>
              <div className="space-y-3">
                {data.education.map((edu, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-[var(--surface-alt)] to-[var(--chip-bg)] p-4 rounded-xl border-l-4 border-[var(--accent)]">
                    <p className="font-bold text-[var(--text)] text-sm">{edu.degree}</p>
                    <p className="text-xs text-[var(--text-muted)]">{edu.center}</p>
                    {edu.dates && <p className="text-[10px] uppercase tracking-widest text-[var(--accent-2)] mt-1 font-bold">{edu.dates}</p>}
                    <p className="text-xs text-[var(--accent)] font-medium mt-1">{edu.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Idiomas */}
            <section>
              <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-4 font-bold">Idiomas</h2>
              <div className="space-y-2">
                {data.languages.map((lang, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text)]">{lang.split(' (')[0]}</span>
                    <span className="text-xs text-[var(--accent)] font-medium">{lang.split(' (')[1]?.replace(')', '')}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Design5Timeline);
