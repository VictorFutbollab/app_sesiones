import { useApp, useTabla } from '../../app/estado'
import { Cabecera, FilaLista, Seccion, Vacio } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import { volver } from '../../app/router'

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
    <div>
      <Cabecera titulo="Papelera" sub={`Lo que borras se guarda ${DIAS} días por si te equivocas`} atras={() => volver({ n: 'perfil' })} />
      {filas.length === 0 ? <Seccion><Vacio icono="papelera"><p>La papelera está vacía.</p></Vacio></Seccion> : (
        <Seccion titulo={`${filas.length} elemento${filas.length === 1 ? '' : 's'}`} className="lista">
          {filas.map((f) => (
            <FilaLista key={f.id} izq={<span className="icono-cuadro"><Icono n={f.t === 'sesiones' ? 'sesiones' : f.t === 'jugadores' || f.t === 'equipos' ? 'equipo' : 'biblioteca'} t={20} /></span>} titulo={f.nombre} sub={`${f.tipo} · se borra en ${quedan(f.e)} días`}
              der={<><button className="btn" style={{ minHeight: 40 }} onClick={() => repo.restaurar(f.t, f.id)}>Recuperar</button><button className="btn-icono" aria-label={`Borrar ${f.nombre} para siempre`} style={{ color: 'var(--danger)' }} onClick={() => confirm('¿Borrar para siempre?') && repo.purgar(f.t, f.id)}><Icono n="papelera" t={18} /></button></>} />
          ))}
        </Seccion>
      )}
    </div>
  )
}
