/**
 * Fusión de operaciones: el MISMO algoritmo corre en el servidor (aplicar_operaciones,
 * migración 0002) y en el servidor simulado de pruebas y demostración.
 *
 * - Cada cambio es una operación con id único → reenviarla no duplica nada (idempotencia).
 * - Conflictos por CAMPO: si dos dispositivos cambian campos distintos, se suman los dos
 *   cambios. Si cambian el mismo campo, gana el cambio más reciente (marca de tiempo del
 *   dispositivo) y el otro queda registrado como conflicto en el historial.
 * - Borrar = poner eliminadoEn (papelera 30 días). Purgar = borrado definitivo.
 */
import type { Tabla } from '../../model/sesiones'

export type TipoOp = 'crear' | 'editar' | 'borrar' | 'restaurar' | 'purgar'

export interface Operacion {
  id: string
  tabla: Tabla
  filaId: string
  tipo: TipoOp
  campos: Record<string, unknown>
  /** Momento del cambio en el dispositivo (ISO). */
  ts: string
  usuario: string
  /** Versión de la fila que tenía el dispositivo al cambiarla. */
  versionBase: number
}

export interface FilaServidor {
  tabla: Tabla
  id: string
  datos: Record<string, unknown>
  version: number
  /** Marca de tiempo del último cambio aplicado a cada campo. */
  camposTs: Record<string, string>
  /** Contador del servidor: el dispositivo pide "lo cambiado desde la marca N". */
  marca: number
  /** true si se purgó: el dispositivo debe borrarla. */
  purgada?: boolean
}

export interface ResultadoFusion {
  fila: FilaServidor | null
  aplicados: string[]
  conflictos: { campo: string; descartado: unknown; vigente: unknown }[]
}

/** Campos que no cambian nunca tras crear la fila. */
const INMUTABLES = new Set(['id', 'creadoPor', 'creadoEn'])
/** Campos que gestiona el servidor. */
const DEL_SERVIDOR = new Set(['version'])

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function fusionar(fila: FilaServidor | null, op: Operacion, marca: number): ResultadoFusion {
  if (op.tipo === 'purgar') {
    if (!fila) return { fila: null, aplicados: [], conflictos: [] }
    return { fila: { ...fila, purgada: true, marca, datos: { id: fila.id } }, aplicados: ['*'], conflictos: [] }
  }
  if (!fila || fila.purgada) {
    if (fila?.purgada) return { fila, aplicados: [], conflictos: [] } // purgada: no resucita
    const datos: Record<string, unknown> = { ...op.campos, id: op.filaId, version: 1 }
    const camposTs = Object.fromEntries(Object.keys(op.campos).filter((k) => !DEL_SERVIDOR.has(k)).map((k) => [k, op.ts]))
    return { fila: { tabla: op.tabla, id: op.filaId, datos, version: 1, camposTs, marca }, aplicados: Object.keys(camposTs), conflictos: [] }
  }
  const datos = { ...fila.datos }
  const camposTs = { ...fila.camposTs }
  const aplicados: string[] = []
  const conflictos: ResultadoFusion['conflictos'] = []
  for (const [k, v] of Object.entries(op.campos)) {
    if (INMUTABLES.has(k) || DEL_SERVIDOR.has(k)) continue
    const previo = camposTs[k]
    if (previo && op.ts < previo) {
      if (!igual(datos[k], v)) conflictos.push({ campo: k, descartado: v, vigente: datos[k] })
      continue
    }
    if (igual(datos[k], v)) {
      camposTs[k] = op.ts
      continue
    }
    datos[k] = v
    camposTs[k] = op.ts
    aplicados.push(k)
  }
  if (aplicados.length === 0) return { fila: { ...fila, camposTs }, aplicados, conflictos }
  const version = fila.version + 1
  datos.version = version
  return { fila: { ...fila, datos, camposTs, version, marca }, aplicados, conflictos }
}

/** Vista local: fila del servidor + cambios pendientes del dispositivo encima (sin perderlos). */
export function rebasar(datosServidor: Record<string, unknown>, pendientes: Operacion[]): Record<string, unknown> | null {
  let d: Record<string, unknown> | null = { ...datosServidor }
  for (const op of pendientes) {
    if (op.tipo === 'purgar') d = null
    else d = { ...(d ?? {}), ...op.campos, id: op.filaId, version: d?.version ?? 0 }
  }
  return d
}
