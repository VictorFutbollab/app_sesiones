import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { dbDePrueba } from '../db/idb'
import { Repo } from '../db/repo'
import { Motor } from './motor'
import { ServidorLocal } from './servidor-local'
import { fusionar, type Operacion } from './fusion'
import type { Nota, Sesion } from '../../model/sesiones'

let n = 0
async function dispositivo(srv: ServidorLocal, usuario = 'u1', red = { ok: true, caerTrasN: Infinity }) {
  const d = await dbDePrueba(`dispositivo-${n++}`)
  const repo = new Repo(d, () => usuario)
  const motor = new Motor(d, srv.transporte(usuario, red))
  return { d, repo, motor, red }
}
const nota = (repo: Repo, texto: string): Nota => ({ ...repo.nuevaMeta(), sesionId: null, ejercicioId: null, texto, audioId: null, transcrita: false, fecha: '2026-11-26' })
const sesion = (repo: Repo, objetivo: string): Sesion => ({ ...repo.nuevaMeta(), equipoId: 'e1', fecha: '2026-11-27', hora: null, objetivo, bloques: [], estado: 'planificada', asistente: false })

describe('fusión por campo', () => {
  const op = (campos: Record<string, unknown>, ts: string, id = ts): Operacion => ({ id, tabla: 'notas', filaId: 'f', tipo: 'editar', campos, ts, usuario: 'u1', versionBase: 1 })
  it('suma cambios de campos distintos y resuelve el mismo campo por el más reciente', () => {
    const base = fusionar(null, { ...op({ texto: 'a', fecha: 'x' }, '2026-01-01T00:00:00Z'), tipo: 'crear' }, 1).fila!
    const a = fusionar(base, op({ texto: 'del móvil' }, '2026-01-01T10:00:00Z'), 2).fila!
    const b = fusionar(a, op({ fecha: 'y' }, '2026-01-01T09:00:00Z'), 3)
    expect(b.fila!.datos).toMatchObject({ texto: 'del móvil', fecha: 'y', version: 3 })
    const c = fusionar(b.fila, op({ texto: 'de la tableta (viejo)' }, '2026-01-01T09:30:00Z'), 4)
    expect(c.fila!.datos.texto).toBe('del móvil')
    expect(c.conflictos).toEqual([{ campo: 'texto', descartado: 'de la tableta (viejo)', vigente: 'del móvil' }])
  })
  it('no deja cambiar el autor ni la fecha de creación', () => {
    const base = fusionar(null, { ...op({ creadoPor: 'u1' }, '1'), tipo: 'crear' }, 1).fila!
    expect(fusionar(base, op({ creadoPor: 'pirata' }, '2'), 2).fila!.datos.creadoPor).toBe('u1')
  })
})

describe('sincronización', () => {
  it('lo creado sin señal se guarda y se sube después, sin duplicados', async () => {
    const srv = new ServidorLocal()
    const m = await dispositivo(srv)
    m.red.ok = false
    await m.repo.guardar('notas', nota(m.repo, 'Trabajar perfil orientado'))
    expect((await m.motor.sincronizar()).estado).toBe('sin_red')
    expect(await m.repo.pendientes()).toBe(1)
    m.red.ok = true
    const r = await m.motor.sincronizar()
    expect(r).toMatchObject({ estado: 'sincronizado', subidas: 1, pendientes: 0 })
    await m.motor.sincronizar()
    expect([...srv.filas.values()].filter((f) => f.tabla === 'notas')).toHaveLength(1)
  })

  it('si la señal cae a mitad de la subida, reenvía sin duplicar ni perder', async () => {
    const srv = new ServidorLocal()
    const m = await dispositivo(srv, 'u1', { ok: true, caerTrasN: 2 })
    for (let i = 0; i < 5; i++) await m.repo.guardar('notas', nota(m.repo, `nota ${i}`))
    expect((await m.motor.sincronizar()).estado).toBe('sin_red')
    expect(srv.opsAplicadas.size).toBe(2)
    m.red.caerTrasN = Infinity
    await m.motor.sincronizar()
    expect(srv.opsAplicadas.size).toBe(5)
    expect([...srv.filas.values()]).toHaveLength(5)
    expect(await m.repo.pendientes()).toBe(0)
  })

  it('dos dispositivos editan campos distintos sin conexión y se fusionan', async () => {
    const srv = new ServidorLocal()
    const movil = await dispositivo(srv)
    const tablet = await dispositivo(srv)
    const s = await movil.repo.guardar('sesiones', sesion(movil.repo, 'Conservar'))
    await movil.motor.sincronizar()
    await tablet.motor.sincronizar()
    movil.red.ok = false
    tablet.red.ok = false
    await movil.repo.guardar('sesiones', { ...(await movil.repo.leer('sesiones', s.id))!, objetivo: 'Conservar y progresar' })
    await tablet.repo.guardar('sesiones', { ...(await tablet.repo.leer('sesiones', s.id))!, fecha: '2026-11-28' })
    movil.red.ok = tablet.red.ok = true
    await movil.motor.sincronizar()
    await tablet.motor.sincronizar()
    await movil.motor.sincronizar()
    const a = await movil.repo.leer('sesiones', s.id)
    const b = await tablet.repo.leer('sesiones', s.id)
    expect(a).toMatchObject({ objetivo: 'Conservar y progresar', fecha: '2026-11-28' })
    expect(b).toMatchObject({ objetivo: 'Conservar y progresar', fecha: '2026-11-28' })
  })

  it('un cambio local pendiente no se pisa al bajar datos del servidor', async () => {
    const srv = new ServidorLocal()
    const movil = await dispositivo(srv)
    const tablet = await dispositivo(srv)
    const s = await movil.repo.guardar('sesiones', sesion(movil.repo, 'A'))
    await movil.motor.sincronizar()
    await tablet.motor.sincronizar()
    await tablet.repo.guardar('sesiones', { ...(await tablet.repo.leer('sesiones', s.id))!, fecha: '2026-12-01' })
    await tablet.motor.sincronizar()
    movil.red.ok = false
    await movil.repo.guardar('sesiones', { ...(await movil.repo.leer('sesiones', s.id))!, objetivo: 'B' })
    // Baja la fecha nueva mientras el objetivo sigue pendiente (simulamos solo bajada)
    movil.red.ok = true
    const r = await movil.motor.sincronizar()
    expect(r.estado).toBe('sincronizado')
    expect(await movil.repo.leer('sesiones', s.id)).toMatchObject({ objetivo: 'B', fecha: '2026-12-01' })
  })

  it('el servidor rechaza pasar el límite Gratis: sale de la cola, queda en el historial y se avisa', async () => {
    const srv = new ServidorLocal()
    const m = await dispositivo(srv)
    const ids: string[] = []
    for (let i = 0; i < 6; i++) ids.push((await m.repo.guardar('sesiones', sesion(m.repo, `S${i}`))).id)
    const r = await m.motor.sincronizar()
    expect(r.rechazos).toHaveLength(1)
    expect(r.pendientes).toBe(0)
    expect(await m.repo.leer('sesiones', ids[5])).toBeUndefined()
    expect((await m.repo.historial(ids[5]))[0].estado).toBe('rechazada')
  })

  it('otro usuario no puede cambiar una fila ajena', async () => {
    const srv = new ServidorLocal()
    const a = await dispositivo(srv, 'ana')
    const n1 = await a.repo.guardar('notas', nota(a.repo, 'privada'))
    await a.motor.sincronizar()
    const res = srv.aplicar({ id: 'x', tabla: 'notas', filaId: n1.id, tipo: 'editar', campos: { texto: 'hackeada' }, ts: '2099', usuario: 'eva', versionBase: 1 })
    expect(res.estado).toBe('rechazada')
    expect(srv.cambiosDesde(0, 'eva').filas).toHaveLength(0)
  })

  it('papelera: borrar, restaurar y purgar a los 30 días', async () => {
    const srv = new ServidorLocal()
    const m = await dispositivo(srv)
    const x = await m.repo.guardar('notas', nota(m.repo, 'temporal'))
    await m.repo.papelera('notas', x.id)
    expect(await m.repo.listar('notas')).toHaveLength(0)
    await m.repo.restaurar('notas', x.id)
    expect(await m.repo.listar('notas')).toHaveLength(1)
    await m.repo.papelera('notas', x.id)
    expect(await m.repo.limpiarPapelera(['notas'], Date.now() + 31 * 864e5)).toBe(1)
    await m.motor.sincronizar()
    expect([...srv.filas.values()][0].purgada).toBe(true)
    expect(await m.repo.leer('notas', x.id)).toBeUndefined()
  })
})
