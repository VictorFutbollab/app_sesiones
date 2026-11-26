import type { Bloque, TipoBloque } from '../model/sesiones'

export const ORDEN_BLOQUES: TipoBloque[] = ['activacion', 'principal1', 'principal2', 'calma']

/** Reordena: quita el bloque y lo inserta en (tipo, índice), renumerando los órdenes. */
export function mover(bloques: Bloque[], id: string, tipo: TipoBloque, indice: number): Bloque[] {
  const b = bloques.find((x) => x.id === id)
  if (!b) return bloques
  const resto = bloques.filter((x) => x.id !== id)
  const destino = resto.filter((x) => x.tipo === tipo).sort((a, z) => a.orden - z.orden)
  destino.splice(Math.max(0, Math.min(indice, destino.length)), 0, { ...b, tipo })
  const otros = resto.filter((x) => x.tipo !== tipo)
  return [...otros, ...destino.map((x, i) => ({ ...x, orden: i }))]
}

/** Bloques en el orden en que se entrenan. */
export const enOrden = (bloques: Bloque[]) => [...bloques].sort((a, b) => ORDEN_BLOQUES.indexOf(a.tipo) - ORDEN_BLOQUES.indexOf(b.tipo) || a.orden - b.orden)
