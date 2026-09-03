import { Suspense } from 'react'
import { dataES, dataEN } from './data'
import { components, porId } from './designs'

// Visor de impresión. Lo único que lo usa es `scripts/pdf.py`, que levanta vite,
// navega a /?design=5&lang=en y llama a page.pdf() de Playwright.
//
// Sustituye a App.jsx, que era la app anterior entera —selector de temas, panel
// de adaptación y seis diseños— sostenida solo por esta línea de pdf.py. Aquí no
// hay botón de imprimir a propósito: quien imprime es Chromium, sin tocar nada.
const params = new URLSearchParams(window.location.search)

const Print = () => {
  // Un id que no sea 5, 0 o 3 cae al ATS, que es el que de verdad se envía.
  const Design = components[Math.max(0, porId(params.get('design')))]
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Cargando…</p>}>
      <Design data={params.get('lang') === 'en' ? dataEN : dataES} />
    </Suspense>
  )
}

export default Print
