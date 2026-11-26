import { useState, type FormEvent } from 'react'
import { useApp } from '../../app/estado'
import { CATEGORIAS, categoria } from '../../data/taxonomia'
import type { Modalidad, Posicion } from '../../model/comun'
import { crearEquipoEjemplo } from '../../data/demo'
import { Paso } from '../../ui/base'
import { MarcoAcceso } from '../../ui/Marca'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Paso 2 del alta: el equipo. Objetivo: registro + equipo en menos de 2 minutos. */
export function CrearEquipo() {
  const { repo, usuario, setEquipoActivo } = useApp()
  const [cat, setCat] = useState('alevin')
  const [nombre, setNombre] = useState('')
  const [modalidad, setModalidad] = useState<Modalidad>('F7')
  const [dias, setDias] = useState<number[]>([2, 4])
  const [n, setN] = useState(14)
  const [lista, setLista] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function crear(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const c = categoria(cat)
    const eq = await repo.guardar('equipos', { ...repo.nuevaMeta(), nombre: nombre.trim() || `${c.nombre} A`, escudo: null, categoria: cat, modalidad, dias, hora: null, demo: false })
    // Plantilla: nombres pegados (uno por línea) o, si no, dorsales del 1 al N para rellenar luego.
    const nombres = lista.split('\n').map((x) => x.trim()).filter(Boolean)
    const total = nombres.length || n
    for (let i = 0; i < total; i++) {
      const pos: Posicion = i === 0 ? 'POR' : i < total * 0.4 ? 'DEF' : i < total * 0.75 ? 'MED' : 'DEL'
      await repo.guardar('jugadores', { ...repo.nuevaMeta(), equipoId: eq.id, nombre: nombres[i] ?? `Jugador ${i + 1}`, dorsal: i + 1, posicion: pos, estado: 'disponible' })
    }
    setEquipoActivo(eq.id)
  }

  async function ejemplo() {
    setEnviando(true)
    const eq = await crearEquipoEjemplo(repo)
    setEquipoActivo(eq.id)
  }

  return (
    <MarcoAcceso lema="Último paso: tu equipo. Menos de un minuto.">
      <form className="pila-form" onSubmit={crear}>
        <div className="progreso-pasos" aria-label="Paso 2 de 2"><i className="on" /><i className="on" /></div>
        <h1>Hola, {usuario.nombre.split(' ')[0]}. Tu equipo</h1>
        <label className="campo">Categoría
          <select value={cat} onChange={(e) => { setCat(e.target.value); setModalidad(categoria(e.target.value).modalidad) }}>
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.edadMin}–{c.edadMax} años)</option>)}
          </select>
        </label>
        <label className="campo">Nombre del equipo<input value={nombre} placeholder={`${categoria(cat).nombre} A`} onChange={(e) => setNombre(e.target.value)} /></label>
        <div className="fila entre">
          <div className="campo"><span>Modalidad</span>
            <div className="segmentado" role="group" aria-label="Modalidad">{(['F7', 'F8', 'F11'] as Modalidad[]).map((m) => <button type="button" key={m} aria-pressed={modalidad === m} onClick={() => setModalidad(m)}>{m.replace('F', 'Fútbol ')}</button>)}</div>
          </div>
          <div className="campo"><span>Jugadores (aprox.)</span><Paso etiqueta="jugadores" valor={n} min={5} max={30} cambiar={setN} /></div>
        </div>
        <div className="campo"><span>Días de entrenamiento</span>
          <div className="chips">{DIAS.map((d, i) => <button type="button" key={d} className="chip" aria-pressed={dias.includes(i + 1)} aria-label={['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][i]} onClick={() => setDias(dias.includes(i + 1) ? dias.filter((x) => x !== i + 1) : [...dias, i + 1].sort())}>{d}</button>)}</div>
        </div>
        <details>
          <summary className="sec" style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>Pegar los nombres de la plantilla (opcional)</summary>
          <label className="campo">Un nombre por línea. Solo nombre: no hace falta apellido ni fecha de nacimiento.
            <textarea value={lista} onChange={(e) => setLista(e.target.value)} placeholder={'Leo\nMarta\nIker'} />
          </label>
        </details>
        <button className="btn primario grande ancho" disabled={enviando}>Crear equipo</button>
        <div className="separador">o</div>
        <button type="button" className="btn ancho" onClick={ejemplo} disabled={enviando}>Probar con un equipo de ejemplo</button>
        <p className="ter" style={{ margin: 0 }}>El equipo de ejemplo trae 16 jugadores ficticios y dos sesiones para que veas la app con datos. Puedes borrarlo cuando quieras.</p>
      </form>
    </MarcoAcceso>
  )
}
