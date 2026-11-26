import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuentes alojadas con la app: sin llamadas a Google (RGPD) y disponibles sin conexión.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import './ui/estilos.css'
import { App } from './app/App'

// Versión nueva publicada: el service worker nuevo toma el control y se recarga UNA vez
// (patrón heredado de FutbolLab Jugadores). Nunca en mitad de un entrenamiento.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let recargando = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || location.hash.startsWith('#campo')) return
    recargando = true
    location.reload()
  })
  const buscar = () => navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined)
  void buscar()
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void buscar())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
