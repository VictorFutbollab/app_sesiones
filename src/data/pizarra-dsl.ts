import type { Flecha, Pizarra, TipoCampo, TipoElemento, TipoFlecha } from '../model/sesiones'

/** Forma corta para escribir pizarras de ejemplo: [tipo, x, y, etiqueta?]. */
export type E = [TipoElemento, number, number, string?]
export type F = [TipoFlecha, number, number, number, number]
export interface FaseCorta {
  nombre: string
  /** Índice del elemento → nueva posición. */
  mover?: Record<number, [number, number]>
  flechas?: F[]
}

export function pizarra(campo: TipoCampo, ancho: number, largo: number, els: E[], fases: FaseCorta[]): Pizarra {
  const elementos = els.map(([tipo, x, y, etiqueta], i) => ({ id: `e${i}`, tipo, x, y, ...(etiqueta ? { etiqueta } : {}) }))
  let pos = Object.fromEntries(elementos.map((e) => [e.id, { x: e.x, y: e.y }]))
  return {
    campo, ancho, largo, elementos,
    fases: fases.map((f, i) => {
      pos = { ...pos }
      for (const [k, [x, y]] of Object.entries(f.mover ?? {})) pos[`e${k}`] = { x, y }
      const flechas: Flecha[] = (f.flechas ?? []).map(([tipo, x1, y1, x2, y2], j) => ({ id: `f${i}-${j}`, tipo, desde: { x: x1, y: y1 }, hasta: { x: x2, y: y2 } }))
      return { id: `fase${i}`, nombre: f.nombre, posiciones: pos, flechas }
    }),
  }
}
