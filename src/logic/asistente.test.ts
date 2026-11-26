import { describe, expect, it } from 'vitest'
import { proponer, repartir, validar, prefiltrar, type EntradaAsistente } from '../../supabase/functions/_shared/asistente'
import { EJERCICIOS_DEMO, idDemo } from '../data/ejercicios-demo'

const x: EntradaAsistente = { principio: 'Presión tras pérdida', jugadores: 14, minutos: 75, espacioMax: 40, edad: 11 }

describe('asistente de sesión', () => {
  it('reparte exactamente los minutos pedidos', () => {
    for (const m of [45, 60, 75, 90, 100]) expect(repartir(m).reduce((s, n) => s + n, 0)).toBe(m)
  })
  it('propone 4 bloques solo con ejercicios reales y compatibles', () => {
    const p = proponer(EJERCICIOS_DEMO, x)
    expect(p.bloques.map((b) => b.tipo)).toEqual(['activacion', 'principal1', 'principal2', 'calma'])
    const ids = new Set(EJERCICIOS_DEMO.map((e) => e.id))
    for (const b of p.bloques) {
      expect(ids.has(b.ejercicioId)).toBe(true)
      const e = EJERCICIOS_DEMO.find((z) => z.id === b.ejercicioId)!
      expect(x.jugadores).toBeGreaterThanOrEqual(e.jugadoresMin)
      expect(x.jugadores).toBeLessThanOrEqual(e.jugadoresMax)
    }
    expect(p.bloques.reduce((s, b) => s + b.minutos, 0)).toBe(75)
    expect(p.bloques.some((b) => EJERCICIOS_DEMO.find((e) => e.id === b.ejercicioId)!.principio === 'Presión tras pérdida')).toBe(true)
  })
  it('avisa en vez de inventar cuando no hay candidatos', () => {
    const p = proponer(EJERCICIOS_DEMO, { ...x, jugadores: 40 })
    expect(p.bloques.length).toBeLessThan(4)
    expect(p.avisos.length).toBeGreaterThan(0)
  })
  it('descarta ids inventados por la IA', () => {
    const c = prefiltrar(EJERCICIOS_DEMO, x)
    const bruta = { bloques: [
      { tipo: 'activacion', ejercicioId: idDemo('demo-rondo-4c1'), motivo: 'ok' },
      { tipo: 'principal1', ejercicioId: 'ejercicio-inventado', motivo: 'no existe' },
      { tipo: 'principal1', ejercicioId: idDemo('demo-rondo-5c2-transicion'), motivo: 'ok' },
      { tipo: 'principal2', ejercicioId: idDemo('demo-4c4-miniporterias'), motivo: 'ok' },
      { tipo: 'calma', ejercicioId: idDemo('demo-calma-precision'), motivo: 'ok' },
    ] }
    const v = validar(bruta, c, x)!
    expect(v.bloques.map((b) => b.ejercicioId)).not.toContain('ejercicio-inventado')
    expect(v.bloques).toHaveLength(4)
    expect(v.bloques.reduce((s, b) => s + b.minutos, 0)).toBe(75)
    expect(validar({ bloques: [{ tipo: 'activacion', ejercicioId: 'x' }] }, c, x)).toBeNull()
  })
})
