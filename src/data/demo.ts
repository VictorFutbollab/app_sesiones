/**
 * Equipo de EJEMPLO para probar la app sin teclear nada. Nombres ficticios, sin
 * apellidos ni fechas de nacimiento. Se marca como demostración en toda la app.
 */
import type { Equipo, Jugador, Posicion } from '../model/comun'
import type { Asistencia, Cierre, Sesion } from '../model/sesiones'
import type { Repo } from '../lib/db/repo'
import { hoy, sumarDias, uuid } from '../logic/id'
import { EJERCICIOS_DEMO, idDemo } from './ejercicios-demo'
import { proponer } from '../../supabase/functions/_shared/asistente'

const NOMBRES = ['Álex', 'Bruno', 'Carla', 'Dani', 'Eric', 'Fran', 'Gael', 'Hugo', 'Iker', 'Jon', 'Leo', 'Mario', 'Nico', 'Óscar', 'Pau', 'Rubén']
const POS: Posicion[] = ['POR', 'DEF', 'DEF', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'POR', 'DEF', 'MED', 'DEL', 'MED']

export async function crearEquipoEjemplo(repo: Repo): Promise<Equipo> {
  const equipo = await repo.guardar('equipos', { ...repo.nuevaMeta(), nombre: 'Alevín A (ejemplo)', escudo: null, categoria: 'alevin', modalidad: 'F7', dias: [2, 4], hora: '18:00', demo: true })
  const jugadores: Jugador[] = []
  for (let i = 0; i < NOMBRES.length; i++)
    jugadores.push(await repo.guardar('jugadores', { ...repo.nuevaMeta(), equipoId: equipo.id, nombre: NOMBRES[i], dorsal: i + 1, posicion: POS[i], estado: i === 7 ? 'no_disponible' : 'disponible' }))
  // Una sesión hecha la semana pasada (con asistencia y cierre) y otra para mañana.
  const p = proponer(EJERCICIOS_DEMO, { principio: 'Conservación del balón', jugadores: 14, minutos: 75, espacioMax: 40, edad: 10 })
  const hecha: Sesion = await repo.guardar('sesiones', {
    ...repo.nuevaMeta(), equipoId: equipo.id, fecha: sumarDias(hoy(), -5), hora: '18:00', objetivo: 'Conservar el balón con apoyos', estado: 'hecha', asistente: true,
    bloques: p.bloques.map((b, i) => ({ id: uuid(), tipo: b.tipo, orden: i, ejercicioId: b.ejercicioId, minutos: b.minutos })),
  })
  for (const j of jugadores) {
    const a: Asistencia = { ...repo.nuevaMeta(), sesionId: hecha.id, jugadorId: j.id, estado: j.dorsal === 8 ? 'no_disponible' : j.dorsal === 12 ? 'justificado' : 'presente' }
    await repo.guardar('asistencias', a)
  }
  const c: Cierre = { ...repo.nuevaMeta(), sesionId: hecha.id, objetivoCumplido: 'en_parte', rpe: 6, nota: 'Buena actitud. Costó abrir el campo en la posesión.' }
  await repo.guardar('cierres', c)
  await repo.guardar('sesiones', {
    ...repo.nuevaMeta(), equipoId: equipo.id, fecha: sumarDias(hoy(), 1), hora: '18:00', objetivo: 'Presión tras pérdida', estado: 'planificada', asistente: false,
    bloques: [
      { id: uuid(), tipo: 'activacion', orden: 0, ejercicioId: idDemo('demo-conduccion-cuadrado'), minutos: 12 },
      { id: uuid(), tipo: 'principal1', orden: 0, ejercicioId: idDemo('demo-rondo-5c2-transicion'), minutos: 22 },
      { id: uuid(), tipo: 'principal2', orden: 0, ejercicioId: idDemo('demo-4c4-miniporterias'), minutos: 24 },
      { id: uuid(), tipo: 'calma', orden: 0, ejercicioId: idDemo('demo-calma-precision'), minutos: 8 },
    ],
  })
  return equipo
}
