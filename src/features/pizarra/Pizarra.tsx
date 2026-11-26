import { useEffect, useId, useRef, useState } from 'react'
import type { Pizarra as TPizarra, Punto } from '../../model/sesiones'
import { DibujoPizarra } from './dibujo'
import { Icono } from '../../ui/Icono'

const TRANSICION = 1100
const PAUSA = 1000
const suave = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function interpolar(a: Record<string, Punto>, b: Record<string, Punto>, t: number) {
  const out: Record<string, Punto> = {}
  for (const k of Object.keys(b)) {
    const pa = a[k] ?? b[k], pb = b[k]
    out[k] = { x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t }
  }
  return out
}

/**
 * Pizarra animada paso a paso: muestra cada fase con sus flechas y anima el movimiento
 * hacia la siguiente. Con "reducir movimiento", salta de fase sin animar.
 */
export function Pizarra({ p, titulo, auto = false, controles = true, mini = false, animar }: { p: TPizarra; titulo?: string; auto?: boolean; controles?: boolean; mini?: boolean; animar?: boolean }) {
  const id = useId().replace(/:/g, '')
  const [fase, setFase] = useState(0)
  const [t, setT] = useState(0) // progreso hacia la fase siguiente
  const [reproduciendo, setReproduciendo] = useState(auto)
  const raf = useRef(0)
  const n = p.fases.length
  const activo = (animar ?? reproduciendo) && n > 1

  useEffect(() => {
    if (!activo) return
    if (reducido()) {
      const iv = setInterval(() => setFase((f) => (f + 1) % n), PAUSA + TRANSICION)
      return () => clearInterval(iv)
    }
    let inicio = performance.now()
    let f = fase
    const paso = (ahora: number) => {
      const dt = ahora - inicio
      if (dt < PAUSA) setT(0)
      else if (dt < PAUSA + TRANSICION) setT(suave((dt - PAUSA) / TRANSICION))
      else {
        f = (f + 1) % n
        setFase(f)
        setT(0)
        inicio = ahora
      }
      raf.current = requestAnimationFrame(paso)
    }
    raf.current = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf.current)
  }, [activo, n])

  useEffect(() => {
    if (animar === false) {
      setFase(0)
      setT(0)
    }
  }, [animar])

  const actual = p.fases[Math.min(fase, n - 1)]
  const siguiente = p.fases[(fase + 1) % n]
  const posiciones = !actual ? Object.fromEntries(p.elementos.map((e) => [e.id, { x: e.x, y: e.y }])) : t > 0 && siguiente ? interpolar(actual.posiciones, siguiente.posiciones, t) : actual.posiciones
  const flechas = actual?.flechas ?? []

  return (
    <div>
      <DibujoPizarra p={p} posiciones={posiciones} flechas={flechas} opacidadFlechas={1 - t} id={id} titulo={titulo ? `Pizarra: ${titulo}${actual ? `, fase ${fase + 1} de ${n}: ${actual.nombre}` : ''}` : undefined} svgProps={mini ? { style: { borderRadius: 0 } } : undefined} />
      {controles && n > 0 ? (
        <div className="pizarra-mando">
          {n > 1 ? (
            <button className="btn" onClick={() => setReproduciendo((r) => !r)} aria-label={reproduciendo ? 'Pausar animación' : 'Reproducir animación'}>
              <Icono n={reproduciendo ? 'pausa' : 'play'} t={18} /> {reproduciendo ? 'Pausa' : 'Animar'}
            </button>
          ) : null}
          <div className="puntos-fase" role="group" aria-label="Fases">
            {p.fases.map((f, i) => (
              <button key={f.id} aria-current={i === fase} onClick={() => { setReproduciendo(false); setFase(i); setT(0) }} aria-label={`Fase ${i + 1}: ${f.nombre}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <span className="fase" aria-live="polite">{actual?.nombre}</span>
        </div>
      ) : null}
    </div>
  )
}
