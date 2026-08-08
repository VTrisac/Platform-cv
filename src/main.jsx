import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Studio from './Studio.jsx'
import './index.css'

// CV Studio es la app. El visor antiguo sigue vivo bajo ?design=N porque
// scripts/pdf.py navega a /?design=5&lang=en para generar los PDFs headless:
// sustituirlo sin más rompería la generación de PDFs y la auditoría ATS.
const Root = new URLSearchParams(window.location.search).has('design') ? App : Studio

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
