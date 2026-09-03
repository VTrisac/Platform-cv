import React from 'react'
import ReactDOM from 'react-dom/client'
import Print from './Print.jsx'
import Studio from './Studio.jsx'
import './index.css'

// CV Studio es la app. ?design=N carga el visor de impresión, que es lo que
// scripts/pdf.py navega para generar los PDF headless: sin él se rompen
// `npm run pdf` y la auditoría ATS que los lee.
const Root = new URLSearchParams(window.location.search).has('design') ? Print : Studio

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
