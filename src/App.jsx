import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { FileDown, Globe } from 'lucide-react';
import { dataES, dataEN } from './data';
import { themes, DEFAULT_THEME_ID } from './theme';

const designLoaders = [
  () => import('./designs/Design1Minimal'),
  () => import('./designs/Design2Dark'),
  () => import('./designs/Design3Sidebar'),
  () => import('./designs/Design4Cards'),
  () => import('./designs/Design5Timeline'),
];

const designComponents = designLoaders.map((loader) => lazy(loader));

const designs = [
  { id: 1, name: 'Minimalista' },
  { id: 2, name: 'Oscuro Premium' },
  { id: 3, name: 'Sidebar Color' },
  { id: 4, name: 'Tarjetas' },
  { id: 5, name: 'Timeline' },
];

const App = () => {
  const [currentDesign, setCurrentDesign] = useState(3); // Tarjetas por defecto
  const [language, setLanguage] = useState('es');
  const [themeId, setThemeId] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID;
    return localStorage.getItem('cvTheme') || DEFAULT_THEME_ID;
  });
  useEffect(() => {
    const theme = themes.find((t) => t.id === themeId) || themes[0];
    const root = document.documentElement;
    Object.entries(theme.tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem('cvTheme', theme.id);
  }, [themeId]);

  const handlePrint = () => {
    // El nombre del PDF en "Guardar como PDF" sale del título del documento
    const prev = document.title;
    document.title = `CV_Victor_Trisac_${language.toUpperCase()}`;
    window.print();
    document.title = prev;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  const currentData = useMemo(() => (language === 'es' ? dataES : dataEN), [language]);
  const CurrentComponent = designComponents[currentDesign];

  return (
    <div className="relative theme-transition">
      {/* Barra de controles */}
      <div className="no-print fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[color:var(--surface)]/90 backdrop-blur-sm rounded-full shadow-lg px-2 py-2 flex items-center gap-2">
        {/* Selector de diseño */}
        <div className="flex gap-1">
          {designs.map((design, idx) => (
            <button
              key={design.id}
              onClick={() => setCurrentDesign(idx)}
              onMouseEnter={() => {
                const preload = designLoaders[idx];
                if (preload) preload();
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentDesign === idx
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-md'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-alt)]'
              }`}
            >
              {design.name}
            </button>
          ))}
        </div>

        {/* Separador */}
        <div className="w-px h-8 bg-[var(--border)]"></div>

        {/* Botón de idioma */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--surface-alt)] hover:bg-[var(--chip-bg)] transition-all text-[var(--text)]"
        >
          <Globe size={16} />
          <span className="font-bold">{language === 'es' ? 'ES' : 'EN'}</span>
        </button>

        {/* Separador */}
        <div className="w-px h-8 bg-[var(--border)]"></div>

        {/* Selector de tema */}
        <div className="flex items-center gap-2 pr-2">
          <span className="text-xs text-[var(--text-muted)]">Tema</span>
          <div className="flex gap-1">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setThemeId(theme.id)}
                title={theme.name}
                className="w-5 h-5 rounded-full border border-[var(--border)]"
                style={{
                  backgroundColor: theme.tokens['--accent'],
                  outline: themeId === theme.id ? `2px solid ${theme.tokens['--accent']}` : 'none',
                  outlineOffset: '2px'
                }}
                aria-label={`Tema ${theme.name}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Diseño actual */}
      <Suspense fallback={<div className="p-8 text-[var(--text-muted)]">Cargando diseño…</div>}>
        <CurrentComponent data={currentData} />
      </Suspense>

      {/* Botón flotante para PDF */}
      <button
        onClick={handlePrint}
        className="no-print fixed bottom-8 right-8 text-[var(--accent-contrast)] p-4 rounded-full shadow-lg flex items-center gap-2 transition-all transform z-50 group bg-[var(--accent)] hover:scale-105 active:scale-95"
        title="Generar PDF"
      >
        <FileDown size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold text-sm">
          PDF
        </span>
      </button>
    </div>
  );
};

export default App;
