import type { FilaServidor, Operacion } from './fusion'

export type EstadoOp = 'aplicada' | 'duplicada' | 'rechazada'

export interface ResultadoOp {
  opId: string
  estado: EstadoOp
  motivo?: string
  conflictos?: { campo: string; descartado: unknown; vigente: unknown }[]
}

/** Lo que el motor de sincronización necesita de un servidor (Supabase o simulado). */
export interface Transporte {
  subir(ops: Operacion[]): Promise<ResultadoOp[]>
  bajar(desde: number): Promise<{ filas: FilaServidor[]; marca: number }>
}

/** Error de red: el motor para y reintenta más tarde sin perder nada. */
export class SinRed extends Error {
  constructor(m = 'Sin conexión') {
    super(m)
    this.name = 'SinRed'
  }
}

export function esErrorDeRed(e: unknown, enLinea = typeof navigator === 'undefined' || navigator.onLine !== false): boolean {
  if (!enLinea) return true
  if (e instanceof SinRed) return true
  const err = e as { name?: string; message?: string; status?: number } | null
  const m = `${err?.name ?? ''} ${err?.message ?? String(e)}`
  return /Failed to fetch|NetworkError|Network request failed|Load failed|fetch failed|ERR_INTERNET|ERR_NETWORK|AuthRetryableFetchError|timed? ?out/i.test(m) || err?.status === 0
}
