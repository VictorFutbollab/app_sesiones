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

/* ═══ Patrones de FutbolLab Jugadores: cabecera, botón redondo, sección, dato y menú ═══ */

/** Cabecera de pantalla: botón redondo de volver, título grande con subtítulo y acciones redondas. */
export function Cabecera({ titulo, sub, atras, children }: { titulo: ReactNode; sub?: ReactNode; atras?: () => void; children?: ReactNode }) {
  return (
    <header className="cabecera">
      {atras ? <button type="button" className="redondo" onClick={atras} aria-label="Volver"><Icono n="atras" /></button> : null}
      <div className="cabecera-txt">
        <h1>{titulo}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      {children ? <div className="cabecera-acciones">{children}</div> : null}
    </header>
  )
}

type PropsRedondo = { icono: string; etiqueta: string; onClick?: () => void; href?: string; activo?: boolean; primario?: boolean; texto?: boolean; nueva?: boolean; disabled?: boolean }
/** Botón redondo blanco (o verde si es la acción principal). Con `texto`, la etiqueta va debajo. */
export function Redondo({ icono, etiqueta, onClick, href, activo, primario, texto, nueva, disabled }: PropsRedondo) {
  const cls = `redondo${primario ? ' primario' : ''}${activo ? ' activo' : ''}`
  const cuerpo = <Icono n={icono} relleno={icono === 'estrella' && activo} />
  const boton = href
    ? <a className={cls} href={href} aria-label={etiqueta} title={etiqueta} {...(nueva ? { target: '_blank', rel: 'noopener' } : {})}>{cuerpo}</a>
    : <button type="button" className={cls} onClick={onClick} aria-label={etiqueta} title={etiqueta} aria-pressed={activo === undefined ? undefined : activo} disabled={disabled}>{cuerpo}</button>
  if (!texto) return boton
  return <div className="redondo-con-texto">{boton}<span aria-hidden>{etiqueta}</span></div>
}

/** Bloque blanco con título dentro (las "secciones" de Jugadores). */
export function Seccion({ titulo, extra, children, className = '', id }: { titulo?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`caja ${className}`} id={id}>
      {titulo || extra ? <header className="caja-cab">{titulo ? <h2>{titulo}</h2> : <span />}{extra}</header> : null}
      {children}
    </section>
  )
}

/** Ficha gris con etiqueta pequeña arriba y el número grande (bento de Jugadores). */
export function Dato({ etiqueta, valor, extra }: { etiqueta: string; valor: ReactNode; extra?: ReactNode }) {
  return (
    <div className="dato-t">
      <span className="dato-et">{etiqueta}</span>
      <span className="dato-val num">{valor}</span>
      {extra ? <span className="dato-extra">{extra}</span> : null}
    </div>
  )
}

export type AccionMenu = { icono: string; texto: string; hacer?: () => void; href?: string; peligro?: boolean; nueva?: boolean; oculta?: boolean }
/** Lista de acciones secundarias en una hoja ("Más"), para no llenar la pantalla de botones. */
export function MenuAcciones({ titulo = 'Más opciones', abierta, cerrar, acciones }: { titulo?: string; abierta: boolean; cerrar: () => void; acciones: AccionMenu[] }) {
  return (
    <Hoja titulo={titulo} abierta={abierta} cerrar={cerrar}>
      <div className="lista-menu">
        {acciones.filter((a) => !a.oculta).map((a) => a.href ? (
          <a key={a.texto} className={a.peligro ? 'peligro' : ''} href={a.href} onClick={cerrar} {...(a.nueva ? { target: '_blank', rel: 'noopener' } : {})}><Icono n={a.icono} /> {a.texto}</a>
        ) : (
          <button key={a.texto} type="button" className={a.peligro ? 'peligro' : ''} onClick={() => { cerrar(); a.hacer?.() }}><Icono n={a.icono} /> {a.texto}</button>
        ))}
      </div>
    </Hoja>
  )
}

/** Fila de lista dentro de una sección: icono o marca a la izquierda, texto y algo a la derecha. */
export function FilaLista({ izq, titulo, sub, der, href, onClick }: { izq?: ReactNode; titulo: ReactNode; sub?: ReactNode; der?: ReactNode; href?: string; onClick?: () => void }) {
  const cuerpo = <>{izq ? <span className="fl-izq">{izq}</span> : null}<span className="fl-txt"><strong>{titulo}</strong>{sub ? <span className="sec">{sub}</span> : null}</span>{der ? <span className="fl-der">{der}</span> : null}</>
  if (href) return <a className="fila-lista" href={href}>{cuerpo}</a>
  if (onClick) return <button type="button" className="fila-lista" onClick={onClick}>{cuerpo}</button>
  return <div className="fila-lista">{cuerpo}</div>
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

export function Segmentado<T extends string>({ opciones, valor, cambiar, etiqueta, lleno }: { opciones: [T, string][]; valor: T; cambiar: (v: T) => void; etiqueta: string; lleno?: boolean }) {
  return (
    <div className={`segmentado${lleno ? ' lleno' : ''}`} role="group" aria-label={etiqueta}>
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
