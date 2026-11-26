import type { Repo } from '../../lib/db/repo'
import type { Ejercicio, Sesion, TipoBloque } from '../../model/sesiones'
import { puedeCrearEjercicio } from '../../logic/planes'
import { uuid } from '../../logic/id'
import { minutosEjercicio } from '../../logic/carga'
import type { Plan } from '../../model/comun'

/** Copia editable de un ejercicio (también de uno de la biblioteca): cuenta como propio. */
export async function duplicarComoPropio(repo: Repo, e: Ejercicio, plan: Plan, todos: Ejercicio[], usuarioId: string, autor: string, sufijo = '(copia)') {
  const b = puedeCrearEjercicio(plan, todos, usuarioId)
  if (b) throw new Error(b.motivo)
  // En Gratis la copia guarda solo la primera fase (la animación de ejercicios propios es Pro).
  const pizarra = plan === 'pro' ? e.pizarra : { ...e.pizarra, fases: e.pizarra.fases.slice(0, 1) }
  return repo.guardar('ejercicios', { ...e, ...repo.nuevaMeta(), titulo: `${e.titulo} ${sufijo}`, origen: 'propio', basico: false, autor, publico: false, carpetaIds: [], pizarra })
}

/** Bloque más adecuado para un tipo de tarea. */
export function bloqueSugerido(e: Ejercicio, s: Sesion): TipoBloque {
  if (e.tipo === 'activacion') return 'activacion'
  if (e.tipo === 'vuelta_calma') return 'calma'
  const p1 = s.bloques.filter((b) => b.tipo === 'principal1').length
  const p2 = s.bloques.filter((b) => b.tipo === 'principal2').length
  return p1 <= p2 ? 'principal1' : 'principal2'
}

export async function anadirASesion(repo: Repo, s: Sesion, e: Ejercicio, tipo: TipoBloque = bloqueSugerido(e, s)) {
  const orden = s.bloques.filter((b) => b.tipo === tipo).length
  await repo.guardar('sesiones', { ...s, bloques: [...s.bloques, { id: uuid(), tipo, orden, ejercicioId: e.id, minutos: minutosEjercicio(e) }] })
}
