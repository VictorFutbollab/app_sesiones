import type { Bloque, Ejercicio } from '../model/sesiones'

/** Minutos totales de la sesión. */
export const duracionTotal = (bloques: Bloque[]) => bloques.reduce((s, b) => s + b.minutos, 0)

/**
 * Carga estimada (método sRPE de Foster): minutos × esfuerzo esperado.
 * Esfuerzo esperado = intensidad del ejercicio (1–5) × 2 → escala RPE 1–10.
 * Resultado en unidades arbitrarias (UA). Es una ESTIMACIÓN previa; la real sale del RPE del cierre.
 */
export function cargaEstimada(bloques: Bloque[], ejercicios: Map<string, Ejercicio>) {
  return Math.round(bloques.reduce((s, b) => s + b.minutos * (ejercicios.get(b.ejercicioId)?.intensidad ?? 3) * 2, 0))
}

/** Carga real tras el cierre: duración × RPE del grupo. */
export const cargaReal = (minutos: number, rpe: number) => Math.round(minutos * rpe)

/** Etiqueta orientativa para un entrenamiento de base. */
export function nivelCarga(ua: number): 'baja' | 'media' | 'alta' {
  if (ua < 350) return 'baja'
  if (ua < 550) return 'media'
  return 'alta'
}

/** Minutos que ocupa un ejercicio según sus series, duración y descansos. */
export const minutosEjercicio = (e: Pick<Ejercicio, 'series' | 'duracion' | 'descanso'>) =>
  Math.round(e.series * e.duracion + ((e.series - 1) * e.descanso) / 60)
