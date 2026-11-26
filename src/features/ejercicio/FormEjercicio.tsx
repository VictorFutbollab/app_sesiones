import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { ir, volver } from '../../app/router'
import type { Ejercicio, FaseJuego, TipoTarea } from '../../model/sesiones'
import { FASES, PRINCIPIOS, TECNICAS, TIPOS } from '../../data/taxonomia'
import { EditorPizarra, pizarraVacia } from '../pizarra/Editor'
import { Cabecera, Paso, Redondo, Seccion as Caja, Vacio } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import { puedeCrearEjercicio } from '../../logic/planes'
import { categoria } from '../../data/taxonomia'

const aLineas = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

function Lineas({ etiqueta, valor, cambiar, ayuda }: { etiqueta: string; valor: string[]; cambiar: (v: string[]) => void; ayuda?: string }) {
  const [t, setT] = useState(valor.join('\n'))
  return (
    <label className="campo">{etiqueta}
      <textarea value={t} onChange={(e) => { setT(e.target.value); cambiar(aLineas(e.target.value)) }} />
      <span className="ayuda">{ayuda ?? 'Una por línea.'}</span>
    </label>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <Caja titulo={titulo}>{children}</Caja>
}

export function FormEjercicio({ id }: { id: string }) {
  const { repo, usuario, pro, equipo, aviso } = useApp()
  const todos = useTabla('ejercicios', true)
  const [e, setE] = useState<Ejercicio | null>(null)
  const [guardado, setGuardado] = useState<'no' | 'guardando' | 'si'>('no')
  const creado = useRef(id !== 'nuevo')
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!todos || e) return
    if (id === 'nuevo') {
      const c = categoria(equipo!.categoria)
      setE({
        ...repo.nuevaMeta(), titulo: '', origen: 'propio', basico: false, autor: usuario.nombre, publico: false, equipoId: null, pizarra: pizarraVacia(), objetivo: '', faseJuego: 'ataque',
        principio: PRINCIPIOS[0], tecnica: [], tipo: 'juego_reducido', jugadoresMin: 6, jugadoresMax: 16, espacio: { ancho: 20, largo: 30 }, edadMin: c.edadMin, edadMax: c.edadMax,
        intensidad: 3, duracion: 5, series: 3, descanso: 60, material: [], organizacion: '', desarrollo: '', reglas: [], variantes: { facil: [], dificil: [] }, consignas: [], errores: [], video: null, carpetaIds: [],
      })
    } else {
      const x = todos.find((y) => y.id === id)
      if (x) setE(x)
    }
  }, [todos, id, e, repo, usuario.nombre, equipo])

  // Guardado automático (también sin conexión): 700 ms después del último cambio.
  useEffect(() => {
    if (!e || !e.titulo.trim() || !creado.current) return
    setGuardado('guardando')
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => void repo.guardar('ejercicios', e).then(() => setGuardado('si')), 700)
    return () => clearTimeout(temporizador.current)
  }, [e, repo])

  if (!todos) return <div className="vacio">Cargando…</div>
  if (!e) return <Vacio><p>No se encuentra el ejercicio.</p></Vacio>
  if (e.origen !== 'propio' || e.creadoPor !== usuario.id) return <Vacio><p>Solo puedes editar tus ejercicios. Crea una variante desde la ficha.</p></Vacio>
  const set = (c: Partial<Ejercicio>) => setE({ ...e, ...c })

  async function crear() {
    if (!e!.titulo.trim()) return aviso('Ponle un título al ejercicio.')
    const b = puedeCrearEjercicio(pro ? 'pro' : 'gratis', todos!, usuario.id)
    if (b) return aviso(b.motivo, { texto: 'Ver Pro', hacer: () => ir({ n: 'planes' }) })
    creado.current = true
    await repo.guardar('ejercicios', e!)
    aviso('Ejercicio creado')
    ir({ n: 'ejercicio-editar', id: e!.id }, true)
  }

  return (
    <div>
      <Cabecera titulo={e.titulo.trim() || 'Nuevo ejercicio'} sub={<span aria-live="polite">{creado.current ? (guardado === 'guardando' ? 'Guardando…' : 'Se guarda solo') : 'Aún sin guardar'}</span>} atras={() => volver({ n: 'biblioteca' })}>
        {creado.current ? <Redondo primario icono="check" etiqueta="Ver ficha" onClick={() => ir({ n: 'ejercicio', id: e.id })} /> : null}
      </Cabecera>
      <Caja>
        <label className="campo">Título<input value={e.titulo} onChange={(x) => set({ titulo: x.target.value })} placeholder="Ej.: Rondo 4 contra 2 con transición" /></label>
        {!creado.current ? <button className="btn primario grande ancho" onClick={crear}><Icono n="check" /> Crear ejercicio</button> : null}
      </Caja>

      <div className="dos-col">
        <Seccion titulo="Pizarra">
          <EditorPizarra valor={e.pizarra} cambiar={(p) => set({ pizarra: p })} puedeAnimar={pro} avisoPro={() => aviso('La animación por fases de tus ejercicios es Pro.', { texto: 'Ver Pro', hacer: () => ir({ n: 'planes' }) })} />
        </Seccion>
        <div>
          <Seccion titulo="Clasificación">
            <label className="campo">Objetivo<textarea value={e.objetivo} onChange={(x) => set({ objetivo: x.target.value })} /></label>
            <div className="dos-col" style={{ gap: 12 }}>
              <label className="campo">Fase del juego<select value={e.faseJuego} onChange={(x) => set({ faseJuego: x.target.value as FaseJuego })}>{Object.entries(FASES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
              <label className="campo">Tipo de tarea<select value={e.tipo} onChange={(x) => set({ tipo: x.target.value as TipoTarea })}>{Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
            </div>
            <label className="campo">Principio táctico<select value={e.principio} onChange={(x) => set({ principio: x.target.value })}>{PRINCIPIOS.map((p) => <option key={p}>{p}</option>)}</select></label>
            <div className="campo"><span>Contenido técnico</span>
              <div className="fila" style={{ gap: 6 }}>{TECNICAS.map((t) => <button type="button" key={t} className="chip" aria-pressed={e.tecnica.includes(t)} onClick={() => set({ tecnica: e.tecnica.includes(t) ? e.tecnica.filter((x) => x !== t) : [...e.tecnica, t] })}>{t}</button>)}</div>
            </div>
          </Seccion>
          <Seccion titulo="Organización">
            <div className="fila entre"><span className="sec">Jugadores</span><div className="fila"><Paso etiqueta="mínimo de jugadores" valor={e.jugadoresMin} min={1} max={e.jugadoresMax} cambiar={(n) => set({ jugadoresMin: n })} /><span>a</span><Paso etiqueta="máximo de jugadores" valor={e.jugadoresMax} min={e.jugadoresMin} max={40} cambiar={(n) => set({ jugadoresMax: n })} /></div></div>
            <div className="fila entre"><span className="sec">Espacio (m)</span><div className="fila"><Paso etiqueta="ancho del espacio" valor={e.espacio.ancho} min={5} max={70} cambiar={(n) => set({ espacio: { ...e.espacio, ancho: n } })} /><span>×</span><Paso etiqueta="largo del espacio" valor={e.espacio.largo} min={5} max={105} cambiar={(n) => set({ espacio: { ...e.espacio, largo: n } })} /></div></div>
            <div className="fila entre"><span className="sec">Edad</span><div className="fila"><Paso etiqueta="edad mínima" valor={e.edadMin} min={5} max={e.edadMax} cambiar={(n) => set({ edadMin: n })} /><span>a</span><Paso etiqueta="edad máxima" valor={e.edadMax} min={e.edadMin} max={45} cambiar={(n) => set({ edadMax: n })} /></div></div>
            <div className="fila entre"><span className="sec">Intensidad</span><Paso etiqueta="intensidad" valor={e.intensidad} min={1} max={5} cambiar={(n) => set({ intensidad: n as Ejercicio['intensidad'] })} /></div>
            <div className="fila entre"><span className="sec">Series × minutos</span><div className="fila"><Paso etiqueta="series" valor={e.series} min={1} max={12} cambiar={(n) => set({ series: n })} /><span>×</span><Paso etiqueta="minutos por serie" valor={e.duracion} min={1} max={45} sufijo="′" cambiar={(n) => set({ duracion: n })} /></div></div>
            <div className="fila entre"><span className="sec">Descanso entre series</span><Paso etiqueta="descanso" valor={e.descanso} min={0} max={300} paso={15} sufijo=" s" cambiar={(n) => set({ descanso: n })} /></div>
            <label className="campo">Material<input value={e.material.join(', ')} onChange={(x) => set({ material: x.target.value.split(',').map((y) => y.trim()).filter(Boolean) })} placeholder="Conos, petos, 6 balones" /></label>
            <label className="campo">Organización<textarea value={e.organizacion} onChange={(x) => set({ organizacion: x.target.value })} placeholder="Dónde se colocan, grupos, espacio…" /></label>
            <label className="campo">Desarrollo<textarea value={e.desarrollo} onChange={(x) => set({ desarrollo: x.target.value })} placeholder="Qué hacen y cómo se puntúa" /></label>
          </Seccion>
          <Seccion titulo="Para el entrenador">
            <Lineas etiqueta="Reglas" valor={e.reglas} cambiar={(v) => set({ reglas: v })} />
            <Lineas etiqueta="Variantes más fáciles" valor={e.variantes.facil} cambiar={(v) => set({ variantes: { ...e.variantes, facil: v } })} />
            <Lineas etiqueta="Variantes más difíciles" valor={e.variantes.dificil} cambiar={(v) => set({ variantes: { ...e.variantes, dificil: v } })} />
            <Lineas etiqueta="Consignas" valor={e.consignas} cambiar={(v) => set({ consignas: v })} />
            <Lineas etiqueta="Errores típicos" valor={e.errores} cambiar={(v) => set({ errores: v })} />
            <label className="campo">Vídeo (enlace, opcional)<input type="url" value={e.video ?? ''} onChange={(x) => set({ video: x.target.value || null })} placeholder="https://" /></label>
            <label className="fila" style={{ gap: 10 }}>
              <input type="checkbox" disabled={!pro} checked={e.publico && e.equipoId != null} onChange={(x) => set({ publico: x.target.checked, equipoId: x.target.checked ? equipo!.id : null })} style={{ width: 22, height: 22 }} />
              <span>Compartir con el cuerpo técnico de {equipo!.nombre}{!pro ? ' (Pro)' : ''}</span>
            </label>
          </Seccion>
        </div>
      </div>
    </div>
  )
}
