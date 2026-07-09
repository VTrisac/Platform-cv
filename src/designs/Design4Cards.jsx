import { memo } from 'react';
import { Mail, Phone, MapPin, Terminal, Briefcase, GraduationCap, Globe, CheckCircle, Award } from 'lucide-react';

const Design4Cards = ({ data }) => {
  return (
    <div className="bg-gradient-to-br from-[var(--bg)] to-[var(--surface-alt)] min-h-screen py-10 px-4 font-sans print-container print-a4">
      <div className="max-w-[1000px] mx-auto">

        {/* Header Card */}
        <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-6">
            <div
              className="w-28 h-28 rounded-2xl shadow-md"
              style={{
                backgroundImage: 'url(/foto.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center 15%'
              }}
              role="img"
              aria-label={data.name}
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[var(--text)] mb-1">{data.name}</h1>
              <p className="text-[var(--accent)] font-medium mb-3">{data.title}</p>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1 bg-[var(--chip-bg)] px-3 py-1 rounded-full">
                  <Mail size={14}/> {data.contact.email}
                </span>
                <span className="flex items-center gap-1 bg-[var(--chip-bg)] px-3 py-1 rounded-full">
                  <Phone size={14}/> {data.contact.phone}
                </span>
                <span className="flex items-center gap-1 bg-[var(--chip-bg)] px-3 py-1 rounded-full">
                  <MapPin size={14}/> {data.contact.location}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-6 text-[var(--text-muted)] leading-relaxed border-t border-[var(--border)] pt-6">{data.profile}</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Skills Card */}
          <div className="space-y-6">
            <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-6">
              <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                <Terminal size={16} className="text-[var(--accent)]"/> {data.labels.technologies}
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[var(--accent)] font-medium mb-2">Backend</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.backend.map(s => (
                      <span key={s} className="text-xs bg-[var(--chip-bg)] text-[var(--chip-text)] px-2 py-1 rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--accent-2)] font-medium mb-2">Frontend</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.frontend.map(s => (
                      <span key={s} className="text-xs bg-[var(--surface-alt)] text-[var(--accent-2)] px-2 py-1 rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--accent-3)] font-medium mb-2">AI & DevOps</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.ai_devops.map(s => (
                      <span key={s} className="text-xs bg-[var(--surface-alt)] text-[var(--accent-3)] px-2 py-1 rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-medium mb-2">{data.labels.databases}</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills.databases.map(s => (
                      <span key={s} className="text-xs bg-[var(--surface-alt)] text-[var(--text)] px-2 py-1 rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Education Card */}
            <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-6">
              <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                <GraduationCap size={16} className="text-[var(--accent)]"/> {data.labels.education}
              </h2>
              <div className="space-y-4">
                {data.education.map((edu, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-[var(--surface-alt)] to-[var(--chip-bg)] p-4 rounded-xl">
                    <p className="font-bold text-[var(--text)] text-sm">{edu.degree}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{edu.center}</p>
                    {edu.dates && <p className="text-[10px] uppercase tracking-widest text-[var(--accent-2)] mt-1">{edu.dates}</p>}
                    <p className="text-xs text-[var(--accent)] font-medium mt-1">{edu.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages Card */}
            <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-6">
              <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                <Globe size={16} className="text-[var(--accent)]"/> {data.labels.languages}
              </h2>
              <div className="space-y-2">
                {data.languages.map((lang, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[var(--surface-alt)] px-3 py-2 rounded-lg">
                    <span className="text-sm text-[var(--text)]">{lang.split(' (')[0]}</span>
                    <span className="text-xs text-[var(--accent)] font-medium">{lang.split(' (')[1]?.replace(')', '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications Card */}
            {data.certifications?.length > 0 && (
              <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-6 print-avoid-break">
                <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
                  <Award size={16} className="text-[var(--accent)]"/> {data.labels.certifications}
                </h2>
                <div className="space-y-2">
                  {data.certifications.map((cert, idx) => (
                    <div key={idx} className="bg-[var(--surface-alt)] px-3 py-2 rounded-lg">
                      <p className="text-xs font-medium text-[var(--text)]">{cert.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{cert.issuer} · {cert.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Experience Cards */}
          <div className="col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2 mb-2">
              <Briefcase size={16} className="text-[var(--accent)]"/> {data.labels.experience}
            </h2>
            {data.experience.map((exp, idx) => (
              <div key={idx} className="bg-[var(--surface)] rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow print-avoid-break">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-[var(--text)] text-lg">{exp.project}</h3>
                    {exp.dates && (
                      <p className="text-[10px] uppercase tracking-widest text-[var(--accent-2)] mb-1">{exp.dates}</p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] italic">{exp.description}</p>
                  </div>
                  <span className="text-xs font-bold text-[var(--accent-contrast)] bg-[var(--accent)] px-4 py-2 rounded-full text-center inline-flex items-center justify-center max-w-[180px]">
                    {exp.role}
                  </span>
                </div>
                <ul className="space-y-2 mb-4">
                  {exp.achievements.map((ach, i) => (
                    <li key={i} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                      <CheckCircle size={14} className="text-[var(--accent-3)] mt-0.5 flex-shrink-0"/> {ach}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1 pt-3 border-t border-[var(--border)]">
                  {exp.tech.map(t => (
                    <span key={t} className="text-[10px] bg-[var(--surface-alt)] text-[var(--text-muted)] px-2 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default memo(Design4Cards);
