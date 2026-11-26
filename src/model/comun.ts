/**
 * Modelo común FutbolLab: debe ser idéntico en las 4 apps (Sesiones, Temporada,
 * Jugadores, Informes). Ids UUID generados en el dispositivo; fechas ISO 8601.
 * Hoy NO hay dependencia con otras apps: se comparte la forma, no la base de datos.
 */

/** Campos de toda fila sincronizable (acciones comunes y sincronización). */
export interface Meta {
  id: string
  creadoEn: string
  actualizadoEn: string
  creadoPor: string
  /** Versión del servidor que conoce este dispositivo (0 = nunca sincronizada). */
  version: number
  archivado: boolean
  /** Con valor: en la papelera. Se borra definitivamente a los 30 días. */
  eliminadoEn: string | null
}

export type RolEquipo = 'entrenador_principal' | 'ayudante' | 'preparador_fisico' | 'coordinador'
export type Modalidad = 'F7' | 'F8' | 'F11'
export type Plan = 'gratis' | 'pro'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolEquipo
  plan: Plan
  /** Fin del periodo Pro pagado (null en Gratis). */
  proHasta: string | null
  creadoEn: string
}

export interface Equipo extends Meta {
  nombre: string
  escudo: string | null // data URL pequeña o null
  categoria: string // valor de CATEGORIAS
  modalidad: Modalidad
  /** Días de entrenamiento: 1 = lunes … 7 = domingo. */
  dias: number[]
  hora: string | null // "18:30"
  demo: boolean
}

/**
 * Disponibilidad SIN causa (art. 9 RGPD): "lesionado" o "enfermo" son datos de salud
 * y Sesiones no los guarda. Basta con saber si puede entrenar.
 */
export type EstadoJugador = 'disponible' | 'no_disponible'
export type Posicion = 'POR' | 'DEF' | 'MED' | 'DEL'

/** Datos mínimos de un menor: nombre, dorsal, posición y disponibilidad. Nada más. */
export interface Jugador extends Meta {
  equipoId: string
  nombre: string
  dorsal: number
  posicion: Posicion
  estado: EstadoJugador
}
