/**
 * Servidor simulado con las MISMAS reglas que Supabase (fusión, idempotencia, propiedad
 * y límites del plan). Lo usan las pruebas (dos dispositivos, cortes de red) y sirve
 * de referencia para la función SQL aplicar_operaciones.
 */
import { fusionar, type FilaServidor, type Operacion } from './fusion'
import { SinRed, type ResultadoOp, type Transporte } from './transporte'
import { LIMITES } from '../../logic/planes'
import type { Plan } from '../../model/comun'

export class ServidorLocal {
  filas = new Map<string, FilaServidor>()
  opsAplicadas = new Set<string>()
  marca = 0
  planes = new Map<string, Plan>()
  /** Miembros por equipo (usuario → equipos). Vacío = sin comprobación de equipo. */
  miembros = new Map<string, Set<string>>()

  private clave = (t: string, id: string) => `${t}/${id}`

  aplicar(op: Operacion): ResultadoOp {
    if (this.opsAplicadas.has(op.id)) return { opId: op.id, estado: 'duplicada' }
    const k = this.clave(op.tabla, op.filaId)
    const actual = this.filas.get(k) ?? null
    // Propiedad: solo el autor (o un miembro del equipo, en tablas de equipo) cambia una fila.
    const datos = actual?.datos ?? op.campos
    const equipoId = (datos.equipoId as string | undefined) ?? (op.tabla === 'equipos' ? op.filaId : undefined)
    const esAutor = !actual || actual.datos.creadoPor === op.usuario
    const esMiembro = equipoId != null && (this.miembros.get(op.usuario)?.has(equipoId) ?? false)
    if (!esAutor && !esMiembro) return { opId: op.id, estado: 'rechazada', motivo: 'No tienes permiso para cambiar esto.' }
    if (op.tabla === 'ejercicios' && !actual && op.campos.origen !== 'propio')
      return { opId: op.id, estado: 'rechazada', motivo: 'Solo FutbolLab publica ejercicios oficiales.' }
    // Límites del plan Gratis (los mismos triggers existen en Postgres).
    if (!actual && op.tipo === 'crear') {
      const plan = this.planes.get(op.usuario) ?? 'gratis'
      const contar = (t: string, f: (d: Record<string, unknown>) => boolean) =>
        [...this.filas.values()].filter((x) => x.tabla === t && !x.purgada && !x.datos.eliminadoEn && x.datos.creadoPor === op.usuario && f(x.datos)).length
      if (op.tabla === 'ejercicios' && contar('ejercicios', (d) => d.origen === 'propio') >= LIMITES[plan].propios)
        return { opId: op.id, estado: 'rechazada', motivo: 'Límite de ejercicios propios del plan Gratis.' }
      if (op.tabla === 'sesiones' && contar('sesiones', () => true) >= LIMITES[plan].sesiones)
        return { opId: op.id, estado: 'rechazada', motivo: 'Límite de sesiones guardadas del plan Gratis.' }
    }
    const r = fusionar(actual, op, this.marca + 1)
    if (r.fila && r.fila.marca === this.marca + 1) this.marca++
    if (r.fila) this.filas.set(k, r.fila)
    this.opsAplicadas.add(op.id)
    return { opId: op.id, estado: 'aplicada', conflictos: r.conflictos.length ? r.conflictos : undefined }
  }

  cambiosDesde(desde: number, usuario: string) {
    const visibles = [...this.filas.values()].filter((f) => {
      if (f.marca <= desde) return false
      const eq = f.datos.equipoId as string | undefined
      return f.purgada || f.datos.creadoPor === usuario || (eq != null && (this.miembros.get(usuario)?.has(eq) ?? false))
    })
    return { filas: visibles.map((f) => structuredClone(f)), marca: this.marca }
  }

  /** Un "dispositivo" conectado a este servidor; `red.ok = false` simula modo avión. */
  transporte(usuario: string, red = { ok: true, caerTrasN: Infinity }): Transporte {
    return {
      subir: async (ops) => {
        if (!red.ok) throw new SinRed()
        const out: ResultadoOp[] = []
        for (const op of ops) {
          if (red.caerTrasN <= 0) throw new SinRed('Se cortó la señal a mitad')
          red.caerTrasN--
          out.push(this.aplicar(structuredClone(op)))
        }
        return out
      },
      bajar: async (desde) => {
        if (!red.ok) throw new SinRed()
        return this.cambiosDesde(desde, usuario)
      },
    }
  }
}
