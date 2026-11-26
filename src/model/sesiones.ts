import type { Meta } from './comun'

// ───────────── Pizarra ─────────────

export type TipoCampo = 'completo' | 'medio' | 'reducido'
export type TipoElemento =
  | 'jugador' | 'rival' | 'comodin' | 'portero' | 'portero_rival'
  | 'cono' | 'pica' | 'valla' | 'balon' | 'porteria' | 'miniporteria'
export type TipoFlecha = 'pase' | 'conduccion' | 'desmarque' | 'tiro'

export interface Punto { x: number; y: number } // metros desde la esquina superior izquierda

export interface Elemento extends Punto {
  id: string
  tipo: TipoElemento
  etiqueta?: string
  /** Rotación en grados (porterías y vallas). */
  giro?: number
}

export interface Flecha {
  id: string
  tipo: TipoFlecha
  desde: Punto
  hasta: Punto
}

/**
 * Una fase = posición de cada elemento en ese momento + flechas que explican
 * lo que pasa hasta la fase siguiente. La animación interpola de una a otra.
 */
export interface Fase {
  id: string
  nombre: string
  posiciones: Record<string, Punto>
  flechas: Flecha[]
}

export interface Pizarra {
  campo: TipoCampo
  /** Medidas del espacio dibujado (m): ancho (x) y largo (y). */
  ancho: number
  largo: number
  elementos: Elemento[]
  fases: Fase[]
}

// ───────────── Ejercicio ─────────────

export type FaseJuego = 'ataque' | 'defensa' | 'transicion_ofensiva' | 'transicion_defensiva' | 'balon_parado' | 'global'
export type TipoTarea =
  | 'activacion' | 'rondo' | 'posesion' | 'juego_reducido' | 'partido_condicionado'
  | 'oleadas' | 'finalizacion' | 'circuito_tecnico' | 'vuelta_calma'
/** oficial = revisado por entrenadores de FutbolLab; demo = ejemplo del prototipo; propio = del usuario. */
export type Origen = 'oficial' | 'demo' | 'propio'

export interface Ejercicio extends Meta {
  titulo: string
  origen: Origen
  /** Visible en Gratis (60 básicos). Solo aplica a los oficiales y de demostración. */
  basico: boolean
  autor: string // "FutbolLab (demostración)" o nombre del entrenador
  publico: boolean // propio compartido con el cuerpo técnico
  equipoId: string | null
  pizarra: Pizarra
  objetivo: string
  faseJuego: FaseJuego
  principio: string
  tecnica: string[]
  tipo: TipoTarea
  jugadoresMin: number
  jugadoresMax: number
  espacio: { ancho: number; largo: number }
  edadMin: number
  edadMax: number
  intensidad: 1 | 2 | 3 | 4 | 5
  duracion: number // minutos por serie
  series: number
  descanso: number // segundos entre series
  material: string[]
  organizacion: string
  desarrollo: string
  reglas: string[]
  variantes: { facil: string[]; dificil: string[] }
  consignas: string[]
  errores: string[]
  video: string | null
  carpetaIds: string[]
}

// ───────────── Sesión ─────────────

export type TipoBloque = 'activacion' | 'principal1' | 'principal2' | 'calma'
export interface Bloque {
  id: string
  tipo: TipoBloque
  orden: number
  ejercicioId: string
  minutos: number
}

export type EstadoSesion = 'planificada' | 'hecha'

export interface Sesion extends Meta {
  equipoId: string
  fecha: string // YYYY-MM-DD
  hora: string | null
  objetivo: string
  bloques: Bloque[]
  estado: EstadoSesion
  /** Si la propuso el asistente (para métricas, no se muestra como "IA"). */
  asistente: boolean
}

export type EstadoAsistencia = 'presente' | 'justificado' | 'ausente' | 'no_disponible'

export interface Asistencia extends Meta {
  sesionId: string
  jugadorId: string
  estado: EstadoAsistencia
}

export type ObjetivoCumplido = 'si' | 'en_parte' | 'no'

export interface Cierre extends Meta {
  sesionId: string
  objetivoCumplido: ObjetivoCumplido
  rpe: number // 1–10, esfuerzo percibido del grupo
  nota: string
}

export interface Nota extends Meta {
  sesionId: string | null
  ejercicioId: string | null
  texto: string
  /** Id del audio en el almacén local de audios (y en Storage al sincronizar). */
  audioId: string | null
  transcrita: boolean
  fecha: string
}

export interface Carpeta extends Meta {
  nombre: string
  color: string
}

export interface VistaGuardada extends Meta {
  nombre: string
  filtros: import('../logic/filtros').Filtros
}

/** Preferencias de un usuario sobre un elemento: favorito y valoración (1–5). */
export interface Favorito extends Meta {
  entidad: 'ejercicio' | 'sesion'
  entidadId: string
  favorito: boolean
  valoracion: number | null
}

/** Tablas sincronizables y su tipo. */
export interface Tablas {
  equipos: import('./comun').Equipo
  jugadores: import('./comun').Jugador
  ejercicios: Ejercicio
  sesiones: Sesion
  asistencias: Asistencia
  cierres: Cierre
  notas: Nota
  carpetas: Carpeta
  vistas: VistaGuardada
  favoritos: Favorito
}
export type Tabla = keyof Tablas
export const TABLAS: Tabla[] = ['equipos', 'jugadores', 'ejercicios', 'sesiones', 'asistencias', 'cierres', 'notas', 'carpetas', 'vistas', 'favoritos']
