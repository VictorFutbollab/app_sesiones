import { describe, expect, it } from 'vitest'
import { filtrar, FILTROS_VACIOS, normalizar, contarFiltros } from './filtros'
import { cargaEstimada, duracionTotal, minutosEjercicio } from './carga'
import { puedeCrearEjercicio, puedeGuardarSesion, puedeUsarAsistente, visibleEnPlan } from './planes'
import { EJERCICIOS_DEMO, idDemo } from '../data/ejercicios-demo'
import type { Ejercicio, Sesion } from '../model/sesiones'

describe('biblioteca', () => {
  it('busca sin tildes y en minúsculas', () => {
    expect(normalizar('Transición Defensa-Ataque')).toBe('transicion defensa-ataque')
    expect(filtrar(EJERCICIOS_DEMO, { ...FILTROS_VACIOS, texto: 'presion perdida' }).length).toBeGreaterThan(0)
  })
  it('combina filtros: 14 jugadores, 11 años, juego reducido', () => {
    const r = filtrar(EJERCICIOS_DEMO, { ...FILTROS_VACIOS, jugadores: 14, edad: 11, tipos: ['juego_reducido'] })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((e) => e.tipo === 'juego_reducido' && e.jugadoresMin <= 14 && e.jugadoresMax >= 14)).toBe(true)
    expect(contarFiltros({ ...FILTROS_VACIOS, jugadores: 14, edad: 11, tipos: ['juego_reducido'] })).toBe(3)
  })
  it('no muestra lo que está en la papelera', () => {
    const borrado = { ...EJERCICIOS_DEMO[0], eliminadoEn: '2026-11-01' }
    expect(filtrar([borrado], FILTROS_VACIOS)).toHaveLength(0)
  })
})

describe('duración y carga', () => {
  it('suma minutos y estima la carga como minutos × intensidad × 2', () => {
    const ej = new Map(EJERCICIOS_DEMO.map((e) => [e.id, e]))
    const bloques = [{ id: 'b', tipo: 'principal1' as const, orden: 0, ejercicioId: idDemo('demo-4c4-miniporterias'), minutos: 20 }]
    expect(duracionTotal(bloques)).toBe(20)
    expect(cargaEstimada(bloques, ej)).toBe(20 * 5 * 2)
    expect(minutosEjercicio({ series: 4, duracion: 4, descanso: 90 })).toBe(21)
  })
})

describe('plan Gratis', () => {
  const propio = (i: number) => ({ ...EJERCICIOS_DEMO[0], id: `p${i}`, origen: 'propio', creadoPor: 'u' }) as Ejercicio
  it('limita ejercicios propios, sesiones y asistente', () => {
    expect(puedeCrearEjercicio('gratis', Array.from({ length: 9 }, (_, i) => propio(i)), 'u')).toBeNull()
    expect(puedeCrearEjercicio('gratis', Array.from({ length: 10 }, (_, i) => propio(i)), 'u')).not.toBeNull()
    expect(puedeCrearEjercicio('pro', Array.from({ length: 50 }, (_, i) => propio(i)), 'u')).toBeNull()
    const s = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, creadoPor: 'u', eliminadoEn: null }) as Sesion)
    expect(puedeGuardarSesion('gratis', s, 'u')).not.toBeNull()
    expect(puedeUsarAsistente('gratis', 2)).toBeNull()
    expect(puedeUsarAsistente('gratis', 3)).not.toBeNull()
    expect(visibleEnPlan('gratis', { ...EJERCICIOS_DEMO[0], basico: false })).toBe(false)
  })
})
