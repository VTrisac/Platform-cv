import { memo } from 'react';
import { Terminal, Briefcase, GraduationCap } from 'lucide-react';

const Design2Dark = ({ data }) => {
  return (
    <div className="bg-[var(--bg)] min-h-screen py-10 px-4 font-mono text-[var(--text-muted)]">
      <div className="max-w-[900px] mx-auto">

        {/* Header estilo terminal */}
        <header className="mb-8 p-6 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-[var(--accent)]"></div>
            <div className="w-3 h-3 rounded-full bg-[var(--accent-2)]"></div>
            <div className="w-3 h-3 rounded-full bg-[var(--accent-3)]"></div>
            <span className="ml-4 text-xs text-[var(--text-muted)]">~/victor-trisac/cv</span>
          </div>

          <div className="flex items-center gap-6">
            <img
              src="/foto.jpg"
              alt={data.name}
              className="w-28 h-28 rounded-lg object-cover object-top border-2 border-[var(--accent)]"
            />
            <div>
              <p className="text-[var(--accent)] mb-1">$ whoami</p>
              <h1 className="text-2xl font-bold text-[var(--text)] mb-2">{data.name}</h1>
              <p className="text-[var(--accent-2)] text-sm mb-3">{data.title}</p>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="text-[var(--text-muted)]"><span className="text-[var(--accent)]">@</span> {data.contact.email}</span>
                <span className="text-[var(--text-muted)]"><span className="text-[var(--accent)]">#</span> {data.contact.phone}</span>
                <span className="text-[var(--text-muted)]"><span className="text-[var(--accent)]">→</span> {data.contact.location}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Perfil */}
        <section className="mb-8 p-4 bg-[var(--surface-alt)] rounded border-l-2 border-[var(--accent)]">
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            <span className="text-[var(--accent)]">// </span>{data.profile}
          </p>
        </section>

        <div className="grid grid-cols-3 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-6">
            <section className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <h2 className="text-[var(--accent)] text-xs mb-3 flex items-center gap-2">
                <Terminal size={14}/> stack.config
              </h2>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[var(--accent-2)] mb-1">backend:</p>
                  <p className="text-[var(--text-muted)] pl-2">{data.skills.backend.join(", ")}</p>
                </div>
                <div>
                  <p className="text-[var(--accent-2)] mb-1">frontend:</p>
                  <p className="text-[var(--text-muted)] pl-2">{data.skills.frontend.join(", ")}</p>
                </div>
                <div>
                  <p className="text-[var(--accent-2)] mb-1">devops:</p>
                  <p className="text-[var(--text-muted)] pl-2">{data.skills.ai_devops.join(", ")}</p>
                </div>
                <div>
                  <p className="text-[var(--accent-2)] mb-1">databases:</p>
                  <p className="text-[var(--text-muted)] pl-2">{data.skills.databases.join(", ")}</p>
                </div>
              </div>
            </section>

            <section className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <h2 className="text-[var(--accent)] text-xs mb-3 flex items-center gap-2">
                <GraduationCap size={14}/> education.log
              </h2>
              {data.education.map((edu, idx) => (
                <div key={idx} className="mb-3 text-xs">
                  <p className="text-[var(--text)]">{edu.degree}</p>
                  {edu.center && <p className="text-[var(--text-muted)]">{edu.center}</p>}
                  {edu.dates && <p className="text-[10px] text-[var(--accent)]">{edu.dates}</p>}
                  <p className="text-[var(--accent-2)]">{edu.note}</p>
                </div>
              ))}
            </section>
          </div>

          {/* Columna derecha - Experiencia */}
          <div className="col-span-2">
            <section className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <h2 className="text-[var(--accent)] text-xs mb-4 flex items-center gap-2">
                <Briefcase size={14}/> experience.json
              </h2>
              <div className="space-y-6">
                {data.experience.map((exp, idx) => (
                  <div key={idx} className="border-l border-[var(--border)] pl-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[var(--text)] font-bold">{exp.project}</h3>
                      <span className="text-[10px] text-[var(--accent)] bg-[color:var(--accent)]/10 px-2 py-1 rounded">{exp.role}</span>
                    </div>
                    {exp.dates && (
                      <p className="text-[10px] text-[var(--accent-2)] mb-2">// {exp.dates}</p>
                    )}
                    <ul className="space-y-1 mb-3">
                      {exp.achievements.map((ach, i) => (
                        <li key={i} className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                          <span className="text-[var(--accent)]">→</span> {ach}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1">
                      {exp.tech.map(t => (
                        <span key={t} className="text-[9px] bg-[var(--surface-alt)] text-[var(--accent-2)] px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
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

export default memo(Design2Dark);
