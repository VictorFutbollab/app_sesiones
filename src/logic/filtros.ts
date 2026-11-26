import type { Ejercicio, FaseJuego, TipoTarea } from '../model/sesiones'

export interface Filtros {
  texto: string
  fases: FaseJuego[]
  principios: string[]
  tecnicas: string[]
  tipos: TipoTarea[]
  /** Jugadores que tienes hoy: el ejercicio debe admitirlos. */
  jugadores: number | null
  /** Espacio máximo disponible (lado largo, m). */
  espacioMax: number | null
  /** Edad de tu equipo: el ejercicio debe cubrirla. */
  edad: number | null
  intensidad: number[]
  autor: ('oficial' | 'demo' | 'propio')[]
  soloFavoritos: boolean
  carpetaId: string | null
}

export const FILTROS_VACIOS: Filtros = {
  texto: '', fases: [], principios: [], tecnicas: [], tipos: [], jugadores: null, espacioMax: null, edad: null,
  intensidad: [], autor: [], soloFavoritos: false, carpetaId: null,
}

export type Orden = 'relevancia' | 'titulo' | 'intensidad' | 'duracion' | 'recientes'

/** Minúsculas y sin tildes: "pase" encuentra "Pasé" y "rondó". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const textoDe = (e: Ejercicio) =>
  normalizar([e.titulo, e.objetivo, e.principio, e.tecnica.join(' '), e.organizacion, e.desarrollo, e.consignas.join(' '), e.material.join(' ')].join(' '))

/** Nº de filtros activos (para el contador del botón "Filtros"). */
export function contarFiltros(f: Filtros) {
  return (
    f.fases.length + f.principios.length + f.tecnicas.length + f.tipos.length + f.intensidad.length + f.autor.length +
    (f.jugadores != null ? 1 : 0) + (f.espacioMax != null ? 1 : 0) + (f.edad != null ? 1 : 0) + (f.soloFavoritos ? 1 : 0) + (f.carpetaId ? 1 : 0)
  )
}

export function filtrar(lista: Ejercicio[], f: Filtros, favoritos: Set<string> = new Set(), orden: Orden = 'relevancia'): Ejercicio[] {
  const palabras = normalizar(f.texto).split(/\s+/).filter(Boolean)
  const puntos = new Map<string, number>()
  const out = lista.filter((e) => {
    if (e.eliminadoEn || e.archivado) return false
    if (f.fases.length && !f.fases.includes(e.faseJuego)) return false
    if (f.principios.length && !f.principios.includes(e.principio)) return false
    if (f.tecnicas.length && !f.tecnicas.some((t) => e.tecnica.includes(t))) return false
    if (f.tipos.length && !f.tipos.includes(e.tipo)) return false
    if (f.jugadores != null && (f.jugadores < e.jugadoresMin || f.jugadores > e.jugadoresMax)) return false
    if (f.espacioMax != null && Math.max(e.espacio.ancho, e.espacio.largo) > f.espacioMax) return false
    if (f.edad != null && (f.edad < e.edadMin || f.edad > e.edadMax)) return false
    if (f.intensidad.length && !f.intensidad.includes(e.intensidad)) return false
    if (f.autor.length && !f.autor.includes(e.origen)) return false
    if (f.soloFavoritos && !favoritos.has(e.id)) return false
    if (f.carpetaId && !e.carpetaIds.includes(f.carpetaId)) return false
    if (palabras.length) {
      const t = textoDe(e)
      if (!palabras.every((p) => t.includes(p))) return false
      const titulo = normalizar(e.titulo)
      puntos.set(e.id, palabras.reduce((s, p) => s + (titulo.includes(p) ? 3 : 1), 0))
    }
    return true
  })
  const cmp: Record<Orden, (a: Ejercicio, b: Ejercicio) => number> = {
    relevancia: (a, b) => (puntos.get(b.id) ?? 0) - (puntos.get(a.id) ?? 0) || a.titulo.localeCompare(b.titulo, 'es'),
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'es'),
    intensidad: (a, b) => b.intensidad - a.intensidad,
    duracion: (a, b) => a.duracion * a.series - b.duracion * b.series,
    recientes: (a, b) => b.creadoEn.localeCompare(a.creadoEn),
  }
  return out.sort(cmp[orden])
}
