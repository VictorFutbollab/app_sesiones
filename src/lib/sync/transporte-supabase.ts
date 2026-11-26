import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tabla } from '../../model/sesiones'
import type { FilaServidor } from './fusion'
import type { ResultadoOp, Transporte } from './transporte'

/**
 * Margen de solape al bajar: una transacción que tomó una marca menor puede confirmar
 * después de otra con marca mayor. Volver a pedir las últimas N marcas lo cubre; reescribir
 * una fila igual en el dispositivo no tiene efecto.
 */
const SOLAPE = 200

export function transporteSupabase(sb: SupabaseClient): Transporte {
  return {
    async subir(ops) {
      const { data, error } = await sb.rpc('aplicar_operaciones', { ops })
      if (error) throw error
      return data as ResultadoOp[]
    },
    async bajar(desde) {
      const { data, error } = await sb.rpc('cambios_desde', { desde: Math.max(0, desde - SOLAPE) })
      if (error) throw error
      const filas = ((data ?? []) as { tabla: Tabla; id: string; datos: Record<string, unknown>; version: number; marca: number; purgada: boolean }[]).map(
        (r): FilaServidor => ({ tabla: r.tabla, id: r.id, datos: r.datos, version: r.version, camposTs: {}, marca: Number(r.marca), purgada: r.purgada }),
      )
      return { filas, marca: filas.reduce((m, f) => Math.max(m, f.marca), desde) }
    },
  }
}
