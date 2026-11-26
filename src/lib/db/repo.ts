/**
 * Repositorio: única puerta de escritura. Cada cambio se guarda en la fila Y en la cola
 * de operaciones dentro de la MISMA transacción: si el móvil se apaga, no se pierde nada.
 */
import type { Tabla, Tablas } from '../../model/sesiones'
import type { Meta } from '../../model/comun'
import { ahora, uuid } from '../../logic/id'
import type { TipoOp } from '../sync/fusion'
import { avisar } from '../eventos'
import type { DB } from './idb'

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const PAPELERA_DIAS = 30

export class Repo {
  private d: DB
  private usuario: () => string
  constructor(d: DB, usuario: () => string) {
    this.d = d
    this.usuario = usuario
  }

  async listar<T extends Tabla>(t: T, conEliminados = false): Promise<Tablas[T][]> {
    const xs = (await this.d.getAll(t)) as Tablas[T][]
    return conEliminados ? xs : xs.filter((x) => !(x as Meta).eliminadoEn)
  }

  async leer<T extends Tabla>(t: T, id: string): Promise<Tablas[T] | undefined> {
    return (await this.d.get(t, id)) as Tablas[T] | undefined
  }

  /** Crea o actualiza. Solo envía al servidor los campos que han cambiado. */
  async guardar<T extends Tabla>(t: T, obj: Tablas[T], tipoForzado?: TipoOp): Promise<Tablas[T]> {
    const tx = this.d.transaction([t, 'ops', 'historial'], 'readwrite')
    const store = tx.objectStore(t)
    const previo = (await store.get(obj.id)) as Tablas[T] | undefined
    const ts = ahora()
    const nuevo = { ...obj, actualizadoEn: ts } as Tablas[T]
    let campos: Record<string, unknown>
    let tipo: TipoOp
    if (!previo) {
      tipo = 'crear'
      campos = { ...(nuevo as object) }
      delete campos.version
    } else {
      tipo = tipoForzado ?? 'editar'
      campos = {}
      for (const [k, v] of Object.entries(nuevo as object)) {
        if (k === 'version' || k === 'actualizadoEn') continue
        if (!igual((previo as unknown as Record<string, unknown>)[k], v)) campos[k] = v
      }
      if (Object.keys(campos).length === 0) {
        await tx.done
        return previo
      }
      campos.actualizadoEn = ts
    }
    await store.put(nuevo as never)
    const op = { id: uuid(), tabla: t, filaId: obj.id, tipo, campos, ts, usuario: this.usuario(), versionBase: (previo as Meta | undefined)?.version ?? 0 }
    await tx.objectStore('ops').add(op)
    await tx.objectStore('historial').put({ id: op.id, tabla: t, filaId: obj.id, tipo, campos: Object.keys(campos), usuario: op.usuario, ts, estado: 'pendiente' })
    await tx.done
    avisar([t])
    return nuevo
  }

  /** Base común de cualquier fila nueva. */
  nuevaMeta(): Meta {
    const ts = ahora()
    return { id: uuid(), creadoEn: ts, actualizadoEn: ts, creadoPor: this.usuario(), version: 0, archivado: false, eliminadoEn: null }
  }

  async papelera<T extends Tabla>(t: T, id: string) {
    const x = await this.leer(t, id)
    if (x) await this.guardar(t, { ...x, eliminadoEn: ahora() }, 'borrar')
  }

  async restaurar<T extends Tabla>(t: T, id: string) {
    const x = await this.leer(t, id)
    if (x) await this.guardar(t, { ...x, eliminadoEn: null }, 'restaurar')
  }

  async archivar<T extends Tabla>(t: T, id: string, valor = true) {
    const x = await this.leer(t, id)
    if (x) await this.guardar(t, { ...x, archivado: valor })
  }

  /** Copia con id nuevo (acción común "duplicar"). */
  async duplicar<T extends Tabla>(t: T, id: string, cambios: Partial<Tablas[T]> = {}): Promise<Tablas[T] | undefined> {
    const x = await this.leer(t, id)
    if (!x) return
    const meta = this.nuevaMeta()
    return this.guardar(t, { ...x, ...meta, ...cambios } as Tablas[T])
  }

  /** Borrado definitivo (desde la papelera o pasados 30 días). */
  async purgar(t: Tabla, id: string) {
    const tx = this.d.transaction([t, 'ops'], 'readwrite')
    await tx.objectStore(t).delete(id)
    await tx.objectStore('ops').add({ id: uuid(), tabla: t, filaId: id, tipo: 'purgar', campos: {}, ts: ahora(), usuario: this.usuario(), versionBase: 0 })
    await tx.done
    avisar([t])
  }

  /** Vacía de la papelera lo que lleva más de 30 días. */
  async limpiarPapelera(tablas: Tabla[], hoy = Date.now()) {
    let n = 0
    for (const t of tablas) {
      for (const x of await this.listar(t, true)) {
        const e = (x as Meta).eliminadoEn
        if (e && hoy - Date.parse(e) > PAPELERA_DIAS * 864e5) {
          await this.purgar(t, x.id)
          n++
        }
      }
    }
    return n
  }

  async historial(filaId: string) {
    return (await this.d.getAllFromIndex('historial', 'filaId', filaId)).sort((a, b) => b.ts.localeCompare(a.ts))
  }

  async pendientes() {
    return this.d.count('ops')
  }

  async meta<T>(k: string): Promise<T | undefined> {
    return (await this.d.get('meta', k)) as T | undefined
  }
  async setMeta(k: string, v: unknown) {
    await this.d.put('meta', v, k)
  }

  // Audios de notas de voz (se guardan en el dispositivo; en Pro se suben a Storage).
  async guardarAudio(blob: Blob) {
    const id = uuid()
    await this.d.put('audios', { id, blob, tipo: blob.type, subido: false })
    return id
  }
  async audio(id: string) {
    return (await this.d.get('audios', id))?.blob
  }
}
