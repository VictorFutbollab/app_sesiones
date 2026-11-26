import type { Plan } from '../model/comun'
import type { Ejercicio, Sesion } from '../model/sesiones'

/** Límites del plan Gratis. Los mismos valores se comprueban en el servidor (migración 0003). */
export const LIMITES = {
  gratis: { propios: 10, sesiones: 5, asistenteMes: 3, biblioteca: 60 },
  pro: { propios: Infinity, sesiones: Infinity, asistenteMes: Infinity, biblioteca: Infinity },
} as const

export const PRECIOS = { mensual: 4.99, anual: 39.99 }

export type Bloqueo = { motivo: string } | null

const activos = <T extends { eliminadoEn: string | null }>(xs: T[]) => xs.filter((x) => !x.eliminadoEn)

export function puedeCrearEjercicio(plan: Plan, ejercicios: Ejercicio[], usuarioId: string): Bloqueo {
  const n = activos(ejercicios).filter((e) => e.origen === 'propio' && e.creadoPor === usuarioId).length
  return n >= LIMITES[plan].propios ? { motivo: `Con el plan Gratis puedes tener ${LIMITES.gratis.propios} ejercicios propios. Pásate a Pro para crear sin límite.` } : null
}

export function puedeGuardarSesion(plan: Plan, sesiones: Sesion[], usuarioId: string): Bloqueo {
  const n = activos(sesiones).filter((s) => s.creadoPor === usuarioId).length
  return n >= LIMITES[plan].sesiones ? { motivo: `Con el plan Gratis puedes guardar ${LIMITES.gratis.sesiones} sesiones. Borra alguna o pásate a Pro.` } : null
}

export function puedeUsarAsistente(plan: Plan, usosMes: number): Bloqueo {
  return usosMes >= LIMITES[plan].asistenteMes ? { motivo: `Has usado las ${LIMITES.gratis.asistenteMes} propuestas de este mes. Con Pro son ilimitadas.` } : null
}

/** En Gratis solo se ven los ejercicios básicos de la biblioteca (y siempre los propios). */
export const visibleEnPlan = (plan: Plan, e: Ejercicio) => plan === 'pro' || e.origen === 'propio' || e.basico

export const esPro = (plan: Plan, proHasta: string | null, hoyISO = new Date().toISOString()) =>
  plan === 'pro' && (proHasta == null || proHasta > hoyISO)
