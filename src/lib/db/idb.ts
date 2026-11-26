/**
 * Base de datos del dispositivo (IndexedDB). La app SIEMPRE lee y escribe aquí;
 * el motor de sincronización se encarga del servidor. Así el modo avión no es un caso aparte.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { TABLAS, type Tablas } from '../../model/sesiones'
import type { Operacion } from '../sync/fusion'

export interface OpEnCola extends Operacion {
  n?: number // orden de llegada (autoincremental)
}

export interface EntradaHistorial {
  id: string // id de la operación
  tabla: string
  filaId: string
  tipo: Operacion['tipo']
  campos: string[]
  usuario: string
  ts: string
  estado: 'pendiente' | 'sincronizada' | 'rechazada'
  conflictos?: { campo: string; descartado: unknown; vigente: unknown }[]
  motivo?: string
}

type Almacenes = { [K in keyof Tablas]: { key: string; value: Tablas[K]; indexes: { creadoPor: string } } }

interface Esquema extends DBSchema, Almacenes {
  ops: { key: number; value: OpEnCola; indexes: { filaId: string; id: string } }
  historial: { key: string; value: EntradaHistorial; indexes: { filaId: string } }
  audios: { key: string; value: { id: string; blob: Blob; tipo: string; subido: boolean } }
  meta: { key: string; value: unknown }
}

export type DB = IDBPDatabase<Esquema>
const NOMBRE = 'futbollab-sesiones'
let dbp: Promise<DB> | null = null

export function db(nombre = NOMBRE): Promise<DB> {
  if (nombre !== NOMBRE) return abrir(nombre)
  dbp ??= abrir(nombre)
  return dbp
}

function abrir(nombre: string) {
  return openDB<Esquema>(nombre, 1, {
    upgrade(d) {
      for (const t of TABLAS) {
        const s = d.createObjectStore(t, { keyPath: 'id' })
        s.createIndex('creadoPor', 'creadoPor')
      }
      const ops = d.createObjectStore('ops', { keyPath: 'n', autoIncrement: true })
      ops.createIndex('filaId', 'filaId')
      ops.createIndex('id', 'id', { unique: true })
      d.createObjectStore('historial', { keyPath: 'id' }).createIndex('filaId', 'filaId')
      d.createObjectStore('audios', { keyPath: 'id' })
      d.createObjectStore('meta')
    },
  })
}

/** Para las pruebas: base de datos con otro nombre (otro "dispositivo"). */
export const dbDePrueba = (nombre: string) => abrir(nombre)

/** Cerrar sesión: fuera todos los datos de este dispositivo. */
export async function borrarTodo(d: DB) {
  const nombres = [...TABLAS, 'ops', 'historial', 'audios', 'meta']
  const tx = d.transaction(nombres as never, 'readwrite')
  await Promise.all(nombres.map((s) => tx.objectStore(s as never).clear()))
  await tx.done
}
