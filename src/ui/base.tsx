import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icono } from './Icono'

export function Hoja({ titulo, abierta, cerrar, children, pie }: { titulo: ReactNode; abierta: boolean; cerrar: () => void; children: ReactNode; pie?: ReactNode }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierta) return
    const previo = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-cerrar])')?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
      previo?.focus?.()
    }
  }, [abierta, cerrar])
  if (!abierta) return null
  return (
    <div className="velo" onPointerDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="asa" />
        <header>
          <h2 id={id}>{titulo}</h2>
          <button className="btn-icono" data-cerrar onClick={cerrar} aria-label="Cerrar">
            <Icono n="cerrar" />
          </button>
        </header>
        {children}
        {pie ? <div style={{ position: 'sticky', bottom: -18, background: 'var(--surface)', paddingTop: 12, paddingBottom: 6, marginTop: 12 }}>{pie}</div> : null}
      </div>
    </div>
  )
}

export function Vacio({ icono = 'info', children }: { icono?: string; children: ReactNode }) {
  return (
    <div className="vacio">
      <Icono n={icono} t={40} />
      {children}
    </div>
  )
}

export function Paso({ valor, cambiar, min = 0, max = 999, paso = 1, sufijo = '', etiqueta }: { valor: number; cambiar: (n: number) => void; min?: number; max?: number; paso?: number; sufijo?: string; etiqueta: string }) {
  return (
    <div className="paso" role="group" aria-label={etiqueta}>
      <button type="button" onClick={() => cambiar(Math.max(min, valor - paso))} aria-label={`Menos ${etiqueta}`}>−</button>
      <output aria-live="polite">{valor}{sufijo}</output>
      <button type="button" onClick={() => cambiar(Math.min(max, valor + paso))} aria-label={`Más ${etiqueta}`}>+</button>
    </div>
  )
}

export function Intensidad({ v }: { v: number }) {
  return (
    <span className={`intensidad${v >= 4 ? ' alta' : ''}`} role="img" aria-label={`Intensidad ${v} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= v ? 'on' : ''} />)}
    </span>
  )
}

export function Segmentado<T extends string>({ opciones, valor, cambiar, etiqueta }: { opciones: [T, string][]; valor: T; cambiar: (v: T) => void; etiqueta: string }) {
  return (
    <div className="segmentado" role="group" aria-label={etiqueta}>
      {opciones.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={v === valor} onClick={() => cambiar(v)}>{t}</button>
      ))}
    </div>
  )
}

export function EtiquetaOrigen({ origen }: { origen: 'oficial' | 'demo' | 'propio' }) {
  if (origen === 'demo') return <span className="etiqueta demo" title="Ejercicio de ejemplo del prototipo, no revisado por el comité técnico">Demostración</span>
  if (origen === 'propio') return <span className="etiqueta propio">Propio</span>
  return <span className="etiqueta">FutbolLab</span>
}

export const fechaLarga = (f: string) => {
  const [y, m, d] = f.split('-').map(Number)
  const t = new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}
export const fechaCorta = (f: string) => {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
export const diaSemana = (f: string) => {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
}
