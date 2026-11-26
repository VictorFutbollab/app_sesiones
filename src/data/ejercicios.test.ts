import { describe, expect, it } from 'vitest'
import { EJERCICIOS_DEMO } from './ejercicios-demo'

describe('catálogo de demostración', () => {
  it('cada ejercicio tiene ficha completa, ids únicos y pizarra coherente', () => {
    expect(new Set(EJERCICIOS_DEMO.map((e) => e.id)).size).toBe(EJERCICIOS_DEMO.length)
    for (const e of EJERCICIOS_DEMO) {
      expect(e.origen).toBe('demo')
      for (const k of ['titulo', 'objetivo', 'organizacion', 'desarrollo'] as const) expect(e[k].length, `${e.id}.${k}`).toBeGreaterThan(10)
      expect(e.reglas.length + e.consignas.length + e.errores.length + e.material.length).toBeGreaterThan(3)
      expect(e.jugadoresMin).toBeLessThanOrEqual(e.jugadoresMax)
      expect(e.pizarra.fases.length).toBeGreaterThan(0)
      const ids = new Set(e.pizarra.elementos.map((x) => x.id))
      for (const f of e.pizarra.fases) {
        expect(Object.keys(f.posiciones).every((k) => ids.has(k))).toBe(true)
        for (const p of Object.values(f.posiciones)) {
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThanOrEqual(e.pizarra.ancho)
          expect(p.y).toBeLessThanOrEqual(e.pizarra.largo)
        }
      }
    }
  })
})
