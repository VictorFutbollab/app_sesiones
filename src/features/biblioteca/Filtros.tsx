import type { ReactNode } from 'react'
import type { Filtros } from '../../logic/filtros'
import { FASES, PRINCIPIOS, TECNICAS, TIPOS, INTENSIDAD } from '../../data/taxonomia'
import type { Carpeta, FaseJuego, TipoTarea } from '../../model/sesiones'
import { Paso } from '../../ui/base'

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
      <legend className="sec" style={{ fontWeight: 700, fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{titulo}</legend>
      <div className="fila" style={{ gap: 8 }}>{children}</div>
    </fieldset>
  )
}

const alternar = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

export function PanelFiltros({ f, set, edadEquipo, jugadoresEquipo, carpetas }: { f: Filtros; set: (f: Filtros) => void; edadEquipo: number; jugadoresEquipo: number; carpetas: Carpeta[] }) {
  return (
    <div>
      <Grupo titulo="Para mi equipo">
        <button className="chip" aria-pressed={f.edad != null} onClick={() => set({ ...f, edad: f.edad == null ? edadEquipo : null })}>Edad de mi equipo ({edadEquipo} años)</button>
        <button className="chip" aria-pressed={f.jugadores != null} onClick={() => set({ ...f, jugadores: f.jugadores == null ? jugadoresEquipo : null })}>Jugadores que tengo</button>
        {f.jugadores != null ? <Paso etiqueta="jugadores" valor={f.jugadores} min={2} max={30} sufijo=" jug." cambiar={(n) => set({ ...f, jugadores: n })} /> : null}
      </Grupo>
      <Grupo titulo="Espacio disponible (lado largo)">
        {[15, 25, 40, 60, 105].map((m) => <button key={m} className="chip" aria-pressed={f.espacioMax === m} onClick={() => set({ ...f, espacioMax: f.espacioMax === m ? null : m })}>{m === 105 ? 'Campo entero' : `Hasta ${m} m`}</button>)}
      </Grupo>
      <Grupo titulo="Fase del juego">
        {(Object.entries(FASES) as [FaseJuego, string][]).map(([k, t]) => <button key={k} className="chip" aria-pressed={f.fases.includes(k)} onClick={() => set({ ...f, fases: alternar(f.fases, k) })}>{t}</button>)}
      </Grupo>
      <Grupo titulo="Tipo de tarea">
        {(Object.entries(TIPOS) as [TipoTarea, string][]).map(([k, t]) => <button key={k} className="chip" aria-pressed={f.tipos.includes(k)} onClick={() => set({ ...f, tipos: alternar(f.tipos, k) })}>{t}</button>)}
      </Grupo>
      <Grupo titulo="Principio táctico">
        {PRINCIPIOS.map((p) => <button key={p} className="chip" aria-pressed={f.principios.includes(p)} onClick={() => set({ ...f, principios: alternar(f.principios, p) })}>{p}</button>)}
      </Grupo>
      <Grupo titulo="Contenido técnico">
        {TECNICAS.map((p) => <button key={p} className="chip" aria-pressed={f.tecnicas.includes(p)} onClick={() => set({ ...f, tecnicas: alternar(f.tecnicas, p) })}>{p}</button>)}
      </Grupo>
      <Grupo titulo="Intensidad">
        {[1, 2, 3, 4, 5].map((i) => <button key={i} className="chip" aria-pressed={f.intensidad.includes(i)} onClick={() => set({ ...f, intensidad: alternar(f.intensidad, i) })}>{i} · {INTENSIDAD[i]}</button>)}
      </Grupo>
      <Grupo titulo="Autor">
        {([['oficial', 'FutbolLab'], ['demo', 'Demostración'], ['propio', 'Míos y de mi cuerpo técnico']] as const).map(([k, t]) => <button key={k} className="chip" aria-pressed={f.autor.includes(k)} onClick={() => set({ ...f, autor: alternar(f.autor, k) })}>{t}</button>)}
      </Grupo>
      <Grupo titulo="Colección">
        <button className="chip" aria-pressed={f.soloFavoritos} onClick={() => set({ ...f, soloFavoritos: !f.soloFavoritos })}>Solo favoritos</button>
        {carpetas.map((c) => <button key={c.id} className="chip" aria-pressed={f.carpetaId === c.id} onClick={() => set({ ...f, carpetaId: f.carpetaId === c.id ? null : c.id })}><i style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.nombre}</button>)}
      </Grupo>
    </div>
  )
}
