import type { FaseJuego, TipoBloque, TipoTarea } from '../model/sesiones'
import type { Modalidad } from '../model/comun'

/** Categorías de fútbol base (RFEF) con edades orientativas y modalidad habitual. */
export const CATEGORIAS: { id: string; nombre: string; edadMin: number; edadMax: number; modalidad: Modalidad }[] = [
  { id: 'prebenjamin', nombre: 'Prebenjamín', edadMin: 6, edadMax: 7, modalidad: 'F7' },
  { id: 'benjamin', nombre: 'Benjamín', edadMin: 8, edadMax: 9, modalidad: 'F7' },
  { id: 'alevin', nombre: 'Alevín', edadMin: 10, edadMax: 11, modalidad: 'F7' },
  { id: 'infantil', nombre: 'Infantil', edadMin: 12, edadMax: 13, modalidad: 'F11' },
  { id: 'cadete', nombre: 'Cadete', edadMin: 14, edadMax: 15, modalidad: 'F11' },
  { id: 'juvenil', nombre: 'Juvenil', edadMin: 16, edadMax: 18, modalidad: 'F11' },
  { id: 'amateur', nombre: 'Amateur', edadMin: 18, edadMax: 45, modalidad: 'F11' },
]
export const categoria = (id: string) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[2]

export const FASES: Record<FaseJuego, string> = {
  ataque: 'Ataque organizado',
  defensa: 'Defensa organizada',
  transicion_ofensiva: 'Transición defensa-ataque',
  transicion_defensiva: 'Transición ataque-defensa',
  balon_parado: 'Balón parado',
  global: 'Juego global',
}

export const PRINCIPIOS = [
  'Conservación del balón', 'Progresión', 'Amplitud y profundidad', 'Desmarque de apoyo y ruptura',
  'Finalización', 'Presión tras pérdida', 'Repliegue', 'Basculación', 'Cobertura y permuta', 'Marcaje',
  'Activación', 'Recuperación',
]

export const TECNICAS = [
  'Pase', 'Control orientado', 'Conducción', 'Regate', 'Tiro', 'Cabeceo', 'Entrada', 'Interceptación',
  'Coordinación', 'Juego de portero',
]

export const TIPOS: Record<TipoTarea, string> = {
  activacion: 'Activación',
  rondo: 'Rondo',
  posesion: 'Posesión',
  juego_reducido: 'Juego reducido',
  partido_condicionado: 'Partido condicionado',
  oleadas: 'Oleadas',
  finalizacion: 'Finalización',
  circuito_tecnico: 'Circuito técnico',
  vuelta_calma: 'Vuelta a la calma',
}

export const BLOQUES: { tipo: TipoBloque; nombre: string; minutos: number; tipos: TipoTarea[]; intensidad: [number, number] }[] = [
  { tipo: 'activacion', nombre: 'Activación', minutos: 15, tipos: ['activacion', 'rondo', 'circuito_tecnico'], intensidad: [1, 3] },
  { tipo: 'principal1', nombre: 'Principal 1', minutos: 25, tipos: ['rondo', 'posesion', 'oleadas', 'finalizacion', 'circuito_tecnico', 'juego_reducido'], intensidad: [3, 5] },
  { tipo: 'principal2', nombre: 'Principal 2', minutos: 25, tipos: ['juego_reducido', 'partido_condicionado', 'posesion', 'oleadas'], intensidad: [3, 5] },
  { tipo: 'calma', nombre: 'Vuelta a la calma', minutos: 10, tipos: ['vuelta_calma', 'circuito_tecnico'], intensidad: [1, 2] },
]
export const nombreBloque = (t: TipoBloque) => BLOQUES.find((b) => b.tipo === t)!.nombre

export const INTENSIDAD = ['', 'Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta']
