/**
 * Lógica del asistente "proponme una sesión", SIN dependencias: la usan la app
 * (sin conexión o en modo demostración) y la Edge Function (con Claude).
 *
 * Regla de oro: el asistente solo elige ejercicios que EXISTEN en la biblioteca
 * del usuario. Nunca inventa tareas; si no hay candidatos para un bloque, lo dice.
 */

export interface EjercicioCandidato {
  id: string
  titulo: string
  tipo: string
  faseJuego: string
  principio: string
  tecnica: string[]
  jugadoresMin: number
  jugadoresMax: number
  espacio: { ancho: number; largo: number }
  edadMin: number
  edadMax: number
  intensidad: number
  duracion: number
  series: number
}

/** Los 4 datos que pide el asistente (la edad sale del equipo). */
export interface EntradaAsistente {
  principio: string // objetivo táctico de la sesión (de PRINCIPIOS)
  jugadores: number
  minutos: number
  espacioMax: number // lado largo disponible, m
  edad: number
}

export interface BloquePropuesto {
  tipo: 'activacion' | 'principal1' | 'principal2' | 'calma'
  ejercicioId: string
  minutos: number
  motivo: string
}

export interface Propuesta {
  bloques: BloquePropuesto[]
  avisos: string[]
}

export const PLAN_BLOQUES = [
  { tipo: 'activacion', reparto: 0.2, tipos: ['activacion', 'rondo', 'circuito_tecnico'], int: [1, 3] },
  { tipo: 'principal1', reparto: 0.35, tipos: ['rondo', 'posesion', 'oleadas', 'finalizacion', 'circuito_tecnico', 'juego_reducido'], int: [3, 5] },
  { tipo: 'principal2', reparto: 0.3, tipos: ['juego_reducido', 'partido_condicionado', 'posesion', 'oleadas'], int: [3, 5] },
  { tipo: 'calma', reparto: 0.15, tipos: ['vuelta_calma', 'circuito_tecnico'], int: [1, 2] },
] as const

export function compatible(e: EjercicioCandidato, x: EntradaAsistente) {
  return x.jugadores >= e.jugadoresMin && x.jugadores <= e.jugadoresMax && x.edad >= e.edadMin && x.edad <= e.edadMax && Math.max(e.espacio.ancho, e.espacio.largo) <= x.espacioMax
}

/** Prefiltro: candidatos compatibles, como mucho `max` (para el contexto de Claude). */
export function prefiltrar(lista: EjercicioCandidato[], x: EntradaAsistente, max = 40): EjercicioCandidato[] {
  return lista.filter((e) => compatible(e, x)).sort((a, b) => Number(b.principio === x.principio) - Number(a.principio === x.principio)).slice(0, max)
}

/** Reparto de minutos por bloque que suma exactamente el total. */
export function repartir(minutos: number): number[] {
  const base = PLAN_BLOQUES.map((b) => Math.max(5, Math.round((minutos * b.reparto) / 5) * 5))
  let dif = minutos - base.reduce((s, m) => s + m, 0)
  for (let i = 1; dif !== 0 && i < 50; i++) {
    const k = dif > 0 ? 1 : 2 // ajusta en los principales
    const paso = Math.sign(dif) * Math.min(Math.abs(dif), 5)
    if (base[k] + paso >= 5) base[k] += paso
    dif -= paso
  }
  return base
}

/** Propuesta determinista (sin IA): puntúa cada candidato para cada bloque. */
export function proponer(lista: EjercicioCandidato[], x: EntradaAsistente): Propuesta {
  const cand = lista.filter((e) => compatible(e, x))
  const usados = new Set<string>()
  const minutos = repartir(x.minutos)
  const avisos: string[] = []
  const bloques: BloquePropuesto[] = []
  PLAN_BLOQUES.forEach((b, i) => {
    const principal = b.tipo === 'principal1' || b.tipo === 'principal2'
    const puntuados = cand
      .filter((e) => !usados.has(e.id) && (b.tipos as readonly string[]).includes(e.tipo))
      .map((e) => {
        let p = 3
        if (principal && e.principio === x.principio) p += 6
        if (e.intensidad >= b.int[0] && e.intensidad <= b.int[1]) p += 2
        if (b.tipo === 'principal2' && e.tipo === 'partido_condicionado') p += 1
        if (b.tipo === 'activacion' && e.tipo === 'activacion') p += 1
        return { e, p }
      })
      .sort((a, z) => z.p - a.p || a.e.id.localeCompare(z.e.id))
    const elegido = puntuados[0]?.e
    if (!elegido) {
      avisos.push(`No hay ejercicios de tu biblioteca para "${nombre(b.tipo)}" con ${x.jugadores} jugadores en ${x.espacioMax} m. Prueba con más espacio o crea uno propio.`)
      return
    }
    usados.add(elegido.id)
    const motivo = principal && elegido.principio === x.principio ? `Trabaja ${x.principio.toLowerCase()}` : `${tipoLegible(elegido.tipo)} de intensidad ${elegido.intensidad}/5`
    bloques.push({ tipo: b.tipo, ejercicioId: elegido.id, minutos: minutos[i], motivo })
  })
  if (x.principio && !bloques.some((b) => cand.find((e) => e.id === b.ejercicioId)?.principio === x.principio))
    avisos.push(`Ningún ejercicio compatible trabaja "${x.principio}". La sesión se ha montado con los más parecidos.`)
  return { bloques, avisos }
}

/**
 * Valida una propuesta que viene de Claude: descarta ids que no estén en los candidatos,
 * bloques repetidos o desconocidos, y vuelve a cuadrar los minutos con el total pedido.
 */
export function validar(bruta: unknown, candidatos: EjercicioCandidato[], x: EntradaAsistente): Propuesta | null {
  const ids = new Set(candidatos.map((c) => c.id))
  const b = (bruta as { bloques?: unknown })?.bloques
  if (!Array.isArray(b)) return null
  const vistos = new Set<string>()
  const tipos = new Set<string>()
  const bloques: BloquePropuesto[] = []
  for (const raw of b) {
    const r = raw as Partial<BloquePropuesto>
    if (!r || typeof r.ejercicioId !== 'string' || !ids.has(r.ejercicioId) || vistos.has(r.ejercicioId)) continue
    if (!PLAN_BLOQUES.some((p) => p.tipo === r.tipo) || tipos.has(r.tipo!)) continue
    vistos.add(r.ejercicioId)
    tipos.add(r.tipo!)
    bloques.push({ tipo: r.tipo!, ejercicioId: r.ejercicioId, minutos: 0, motivo: String(r.motivo ?? '').slice(0, 140) })
  }
  if (bloques.length < 3) return null
  bloques.sort((a, z) => PLAN_BLOQUES.findIndex((p) => p.tipo === a.tipo) - PLAN_BLOQUES.findIndex((p) => p.tipo === z.tipo))
  const mins = repartir(x.minutos)
  for (const bl of bloques) bl.minutos = mins[PLAN_BLOQUES.findIndex((p) => p.tipo === bl.tipo)]
  const falta = x.minutos - bloques.reduce((s, bl) => s + bl.minutos, 0)
  if (falta !== 0) bloques[Math.min(1, bloques.length - 1)].minutos += falta
  return { bloques, avisos: [] }
}

function nombre(t: string) {
  return ({ activacion: 'Activación', principal1: 'Principal 1', principal2: 'Principal 2', calma: 'Vuelta a la calma' } as Record<string, string>)[t] ?? t
}
function tipoLegible(t: string) {
  const s = t.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
