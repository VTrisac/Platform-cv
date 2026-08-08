import { useEffect, useState } from 'react'

// Estado de CV Studio en localStorage.
//
// ponytail: localStorage, no base de datos. Es un usuario, un navegador, y el
// dato cabe en unos pocos KB. Cuando quieras verlo desde el móvil hará falta
// una BD de verdad (Neon/Upstash en el marketplace de Vercel), y ahí sí toca
// cambiar esto por un endpoint. Hasta entonces, una dependencia menos.
const KEY = 'cvStudio.v1'

export const ESTADOS = {
  guardada: { label: 'Guardada', bg: '#EFEADB', fg: '#6C6F5C' },
  enviada: { label: 'Enviada', bg: '#E7E9F0', fg: '#3B4A6B' },
  entrevista: { label: 'Entrevista', bg: '#E3EBDC', fg: '#48603F' },
  rechazada: { label: 'Rechazada', bg: '#F3E4E1', fg: '#8A4A3C' },
  descartada: { label: 'Descartada', bg: '#EDEDE8', fg: '#8A8C7E' },
}

// Semilla: tus ofertas reales de ofertas/, que son las del diseño. La carpeta
// no viaja al despliegue (.vercelignore), así que se copian aquí.
const SEED = [
  { empresa: 'Factorial', puesto: 'Staff AI Engineer', estado: 'enviada', variante: 'Factorial · EN', fecha: '14 jul' },
  { empresa: 'Landbot', puesto: 'AI Engineer (Agentic)', estado: 'enviada', variante: 'Landbot · EN', fecha: '15 jul' },
  { empresa: 'Schneider Electric', puesto: 'AI/ML Engineer', estado: 'guardada', variante: null, fecha: '16 jul' },
  { empresa: 'ERNI', puesto: 'Senior Fullstack AI/LLM', estado: 'enviada', variante: 'ERNI · ES', fecha: '15 jul' },
  { empresa: 'EcoVadis', puesto: 'Senior AI/ML Engineer', estado: 'rechazada', variante: 'EcoVadis · EN', fecha: '14 jul' },
  { empresa: 'LHH · Brezo Arnedo', puesto: 'AI Engineer', estado: 'entrevista', variante: 'LHH · ES', fecha: '21 jul' },
  { empresa: 'THEKER', puesto: 'Backend / IA', estado: 'guardada', variante: null, fecha: '22 jul' },
  { empresa: 'haddock', puesto: 'AI Engineer', estado: 'enviada', variante: 'haddock · EN', fecha: '23 jul' },
  { empresa: 'Preply', puesto: 'Senior Fullstack', estado: 'rechazada', variante: 'Preply · EN', fecha: '14 jul' },
  { empresa: 'Derby Hotels', puesto: 'IA Developer', estado: 'descartada', variante: null, fecha: '14 jul' },
  { empresa: 'Clarivate', puesto: 'Software Engineer', estado: 'descartada', variante: null, fecha: '15 jul' },
  { empresa: 'TheFork', puesto: 'Backend Engineer', estado: 'guardada', variante: null, fecha: '15 jul' },
]

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // JSON corrupto: mejor volver a la semilla que dejar la app en blanco.
  }
  return { ofertas: SEED.map((o, i) => ({ id: `seed-${i}`, ...o })) }
}

// Hook único; toda la app comparte el mismo objeto y se persiste en cada cambio.
export function useStudio() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Cuota llena o modo privado: se pierde al recargar, no rompe la sesión.
    }
  }, [state])

  return {
    ofertas: state.ofertas,
    addOferta: (o) =>
      setState((s) => ({ ...s, ofertas: [{ id: crypto.randomUUID(), estado: 'guardada', ...o }, ...s.ofertas] })),
    updateOferta: (id, patch) =>
      setState((s) => ({ ...s, ofertas: s.ofertas.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    removeOferta: (id) => setState((s) => ({ ...s, ofertas: s.ofertas.filter((o) => o.id !== id) })),
    reset: () => setState(load()),
  }
}

export const contar = (ofertas) =>
  Object.keys(ESTADOS).reduce((acc, k) => ({ ...acc, [k]: ofertas.filter((o) => o.estado === k).length }), {})
