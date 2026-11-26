/**
 * Motor de sincronización.
 *  1. Sube la cola en orden y por lotes. Si se corta la red, para y conserva el resto.
 *     Reenviar es seguro: el servidor ignora operaciones ya aplicadas (por su id).
 *  2. Baja solo lo cambiado desde la última marca. Si una fila tiene cambios locales
 *     aún sin subir, se ponen encima de la versión del servidor (nunca se pierden).
 *  3. Un rechazo del servidor (permisos, límites) saca la operación de la cola, deja
 *     constancia en el historial y se avisa: nunca se reintenta para siempre.
 */
import type { Tabla } from '../../model/sesiones'
import { rebasar, type Operacion } from './fusion'
import { esErrorDeRed, type Transporte } from './transporte'
import type { DB, OpEnCola } from '../db/idb'
import { avisar } from '../eventos'

export interface EstadoSync {
  estado: 'sincronizado' | 'pendiente' | 'sin_red' | 'error'
  pendientes: number
  subidas: number
  bajadas: number
  rechazos: { tabla: string; filaId: string; motivo: string }[]
  conflictos: number
  ultima: string | null
}

const LOTE = 100

export class Motor {
  private enCurso: Promise<EstadoSync> | null = null
  private d: DB
  private t: Transporte
  constructor(d: DB, t: Transporte) {
    this.d = d
    this.t = t
  }

  sincronizar(): Promise<EstadoSync> {
    this.enCurso ??= this.ciclo().finally(() => (this.enCurso = null))
    return this.enCurso
  }

  private async ciclo(): Promise<EstadoSync> {
    const r: EstadoSync = { estado: 'sincronizado', pendientes: 0, subidas: 0, bajadas: 0, rechazos: [], conflictos: 0, ultima: null }
    const tocadas = new Set<string>()
    try {
      // 1. Subir
      for (;;) {
        const lote = (await this.d.getAll('ops', undefined, LOTE)) as OpEnCola[]
        if (lote.length === 0) break
        const resultados = await this.t.subir(lote.map(({ n: _n, ...op }) => op as Operacion))
        const tx = this.d.transaction(['ops', 'historial', ...new Set(lote.map((o) => o.tabla))] as ('ops' | 'historial' | Tabla)[], 'readwrite')
        for (const res of resultados) {
          const op = lote.find((o) => o.id === res.opId)!
          await tx.objectStore('ops').delete(op.n!)
          const h = await tx.objectStore('historial').get(op.id)
          if (res.estado === 'rechazada') {
            r.rechazos.push({ tabla: op.tabla, filaId: op.filaId, motivo: res.motivo ?? 'Rechazado por el servidor' })
            // Una creación rechazada no existe en el servidor: fuera también del dispositivo.
            if (op.tipo === 'crear') await tx.objectStore(op.tabla as 'notas').delete(op.filaId)
            tocadas.add(op.tabla)
          } else r.subidas++
          if (res.conflictos?.length) r.conflictos += res.conflictos.length
          if (h) await tx.objectStore('historial').put({ ...h, estado: res.estado === 'rechazada' ? 'rechazada' : 'sincronizada', motivo: res.motivo, conflictos: res.conflictos })
        }
        await tx.done
        if (resultados.length < lote.length) break
      }
      // 2. Bajar
      const desde = ((await this.d.get('meta', 'marca')) as number | undefined) ?? 0
      const { filas, marca } = await this.t.bajar(desde)
      if (filas.length) {
        const tablas = [...new Set(filas.map((f) => f.tabla))] as Tabla[]
        const tx = this.d.transaction([...tablas, 'ops'] as ('ops' | Tabla)[], 'readwrite')
        for (const f of filas) {
          const store = tx.objectStore(f.tabla as 'notas')
          const pendientes = (await tx.objectStore('ops').index('filaId').getAll(f.id)) as OpEnCola[]
          if (f.purgada) {
            await store.delete(f.id)
          } else {
            const vista = pendientes.length ? rebasar(f.datos, pendientes) : f.datos
            if (vista) await store.put({ ...vista, version: f.version } as never)
            else await store.delete(f.id)
          }
          r.bajadas++
          tocadas.add(f.tabla)
        }
        await tx.done
      }
      await this.d.put('meta', marca, 'marca')
      r.ultima = new Date().toISOString()
      await this.d.put('meta', r.ultima, 'ultimaSync')
    } catch (e) {
      r.estado = esErrorDeRed(e) ? 'sin_red' : 'error'
      if (r.estado === 'error') console.error('Sincronización', e)
    }
    r.pendientes = await this.d.count('ops')
    if (r.estado === 'sincronizado' && r.pendientes > 0) r.estado = 'pendiente'
    if (tocadas.size) avisar([...tocadas])
    return r
  }
}
