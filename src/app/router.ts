import { useEffect, useState } from 'react'

/** Enrutado por hash (heredado de Jugadores): funciona sin servidor, en PWA y sin conexión. */
export type Ruta =
  | { n: 'inicio' }
  | { n: 'biblioteca'; vista?: string }
  | { n: 'ejercicio'; id: string }
  | { n: 'ejercicio-editar'; id: string } // id "nuevo" para crear
  | { n: 'sesiones' }
  | { n: 'sesion'; id: string } // id "nueva" para crear
  | { n: 'campo'; id: string }
  | { n: 'perfil'; seccion?: string }
  | { n: 'planes' }
  | { n: 'papelera' }

export function parse(h: string): Ruta {
  const [a, b] = h.replace(/^#\/?/, '').split('--')
  switch (a) {
    case 'biblioteca': return { n: 'biblioteca', vista: b }
    case 'ejercicio': return b ? { n: 'ejercicio', id: b } : { n: 'biblioteca' }
    case 'editar-ejercicio': return { n: 'ejercicio-editar', id: b || 'nuevo' }
    case 'sesiones': return { n: 'sesiones' }
    case 'sesion': return { n: 'sesion', id: b || 'nueva' }
    case 'campo': return b ? { n: 'campo', id: b } : { n: 'sesiones' }
    case 'perfil': return { n: 'perfil', seccion: b }
    case 'planes': return { n: 'planes' }
    case 'papelera': return { n: 'papelera' }
    default: return { n: 'inicio' }
  }
}

export function href(r: Ruta): string {
  switch (r.n) {
    case 'biblioteca': return `#biblioteca${r.vista ? `--${r.vista}` : ''}`
    case 'ejercicio': return `#ejercicio--${r.id}`
    case 'ejercicio-editar': return `#editar-ejercicio--${r.id}`
    case 'sesion': return `#sesion--${r.id}`
    case 'campo': return `#campo--${r.id}`
    case 'perfil': return `#perfil${r.seccion ? `--${r.seccion}` : ''}`
    default: return `#${r.n}`
  }
}

export const ir = (r: Ruta, reemplazar = false) => (reemplazar ? location.replace(href(r)) : (location.hash = href(r)))
export const volver = (r: Ruta = { n: 'inicio' }) => (history.length > 1 ? history.back() : ir(r, true))

export function useRuta() {
  const [r, setR] = useState(() => parse(location.hash))
  useEffect(() => {
    const f = () => {
      setR(parse(location.hash))
      window.scrollTo(0, 0)
    }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return r
}
