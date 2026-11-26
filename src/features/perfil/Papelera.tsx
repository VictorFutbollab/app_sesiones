import { useApp, useTabla } from '../../app/estado'
import { Vacio } from '../../ui/base'

const DIAS = 30
const quedan = (e: string) => Math.max(0, DIAS - Math.floor((Date.now() - Date.parse(e)) / 864e5))

/** Papelera de 30 días (acción común): recuperar o borrar ya. */
export function Papelera() {
  const { repo, usuario } = useApp()
  const ej = (useTabla('ejercicios', true) ?? []).filter((e) => e.eliminadoEn && e.creadoPor === usuario.id)
  const ses = (useTabla('sesiones', true) ?? []).filter((s) => s.eliminadoEn)
  const jug = (useTabla('jugadores', true) ?? []).filter((j) => j.eliminadoEn)
  const eqs = (useTabla('equipos', true) ?? []).filter((j) => j.eliminadoEn)
  const filas = [
    ...ej.map((x) => ({ t: 'ejercicios' as const, id: x.id, nombre: x.titulo, tipo: 'Ejercicio', e: x.eliminadoEn! })),
    ...ses.map((x) => ({ t: 'sesiones' as const, id: x.id, nombre: x.objetivo || `Sesión ${x.fecha}`, tipo: 'Sesión', e: x.eliminadoEn! })),
    ...jug.map((x) => ({ t: 'jugadores' as const, id: x.id, nombre: x.nombre, tipo: 'Jugador', e: x.eliminadoEn! })),
    ...eqs.map((x) => ({ t: 'equipos' as const, id: x.id, nombre: x.nombre, tipo: 'Equipo', e: x.eliminadoEn! })),
  ].sort((a, b) => b.e.localeCompare(a.e))
  return (
    <div className="pila">
      <h1>Papelera</h1>
      <p className="sec" style={{ margin: 0 }}>Lo que borras se guarda {DIAS} días por si te equivocas.</p>
      {filas.length === 0 ? <Vacio icono="papelera"><p>La papelera está vacía.</p></Vacio> : filas.map((f) => (
        <div key={f.id} className="tarjeta fila entre">
          <div><strong>{f.nombre}</strong><br /><span className="ter">{f.tipo} · se borra en {quedan(f.e)} días</span></div>
          <div className="fila">
            <button className="btn" onClick={() => repo.restaurar(f.t, f.id)}>Recuperar</button>
            <button className="btn peligro" onClick={() => confirm('¿Borrar para siempre?') && repo.purgar(f.t, f.id)}>Borrar ya</button>
          </div>
        </div>
      ))}
    </div>
  )
}
