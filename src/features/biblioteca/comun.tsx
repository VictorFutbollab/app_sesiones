import { useMemo, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href } from '../../app/router'
import type { Ejercicio, Favorito } from '../../model/sesiones'
import type { Repo } from '../../lib/db/repo'
import { visibleEnPlan } from '../../logic/planes'
import { categoria, TIPOS } from '../../data/taxonomia'
import { Pizarra } from '../pizarra/Pizarra'
import { EtiquetaOrigen, Intensidad } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import { minutosEjercicio } from '../../logic/carga'

/** Biblioteca que puede ver este usuario según su plan. */
export function useBiblioteca() {
  const { pro, usuario } = useApp()
  const todos = useTabla('ejercicios')
  return useMemo(() => (todos ? todos.filter((e) => visibleEnPlan(pro ? 'pro' : 'gratis', e) && (e.origen !== 'propio' || e.creadoPor === usuario.id || e.publico)) : null), [todos, pro, usuario.id])
}

export function usePreferencias() {
  const favs = useTabla('favoritos')
  return useMemo(() => new Map((favs ?? []).map((f) => [`${f.entidad}:${f.entidadId}`, f])), [favs])
}

export async function guardarPreferencia(repo: Repo, prefs: Map<string, Favorito>, entidad: Favorito['entidad'], entidadId: string, cambios: Partial<Pick<Favorito, 'favorito' | 'valoracion'>>) {
  const previa = prefs.get(`${entidad}:${entidadId}`)
  const base: Favorito = previa ?? { ...repo.nuevaMeta(), entidad, entidadId, favorito: false, valoracion: null }
  await repo.guardar('favoritos', { ...base, ...cambios })
}

/** Edad media de la categoría del equipo (para filtrar por "edad de mi equipo"). */
export const edadEquipo = (cat: string) => {
  const c = categoria(cat)
  return Math.round((c.edadMin + c.edadMax) / 2)
}

export function TarjetaEjercicio({ e, fav, alFav, accion }: { e: Ejercicio; fav?: boolean; alFav?: () => void; accion?: { texto: string; hacer: () => void } }) {
  const [hover, setHover] = useState(false)
  const contenido = (
    <>
      <div className="mini"><Pizarra p={e.pizarra} mini controles={false} animar={hover} /></div>
      <div className="cuerpo">
        <div className="fila" style={{ gap: 6 }}><EtiquetaOrigen origen={e.origen} /><span className="etiqueta">{TIPOS[e.tipo]}</span></div>
        <h3>{e.titulo}</h3>
        <div className="meta">
          <span>{e.edadMin}–{e.edadMax > 20 ? '+' : e.edadMax} años</span>
          <span>{e.jugadoresMin}–{e.jugadoresMax} jug.</span>
          <span>{minutosEjercicio(e)} min</span>
          <Intensidad v={e.intensidad} />
        </div>
        {accion ? <button className="btn primario" style={{ marginTop: 6 }} onClick={(ev) => { ev.preventDefault(); accion.hacer() }}>{accion.texto}</button> : null}
      </div>
    </>
  )
  return (
    <div style={{ position: 'relative' }} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
      {accion ? <div className="tarjeta-ej">{contenido}</div> : <a className="tarjeta-ej" href={href({ n: 'ejercicio', id: e.id })}>{contenido}</a>}
      {alFav ? (
        <button className={`btn-icono fav${fav ? ' activo' : ''}`} style={{ position: 'absolute', top: 6, right: 6, background: 'rgb(0 0 0 / .4)', color: fav ? 'var(--amber)' : '#fff' }} onClick={alFav} aria-pressed={fav} aria-label={fav ? `Quitar ${e.titulo} de favoritos` : `Añadir ${e.titulo} a favoritos`}>
          <Icono n="estrella" relleno={fav} />
        </button>
      ) : null}
    </div>
  )
}
