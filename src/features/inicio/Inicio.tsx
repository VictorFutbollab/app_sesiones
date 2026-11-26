import { useMemo, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href } from '../../app/router'
import { duracionTotal, cargaEstimada, nivelCarga } from '../../logic/carga'
import { hoy, sumarDias } from '../../logic/id'
import { normalizar } from '../../logic/filtros'
import { fechaLarga } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import { TarjetaEjercicio, edadEquipo, guardarPreferencia, useBiblioteca, usePreferencias } from '../biblioteca/comun'
import { nombreBloque } from '../../data/taxonomia'

/** Próximo día de entrenamiento según los días del equipo (1 = lunes). */
function proximoEntreno(dias: number[]) {
  for (let i = 0; i < 8; i++) {
    const f = sumarDias(hoy(), i)
    const [y, m, d] = f.split('-').map(Number)
    const dow = ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1
    if (dias.includes(dow)) return f
  }
  return sumarDias(hoy(), 1)
}

export function Inicio() {
  const { usuario, equipo, repo } = useApp()
  const sesiones = useTabla('sesiones')
  const jugadores = useTabla('jugadores')
  const biblioteca = useBiblioteca()
  const prefs = usePreferencias()
  const [q, setQ] = useState('')
  const eq = equipo!
  const misSes = useMemo(() => (sesiones ?? []).filter((s) => s.equipoId === eq.id), [sesiones, eq.id])
  const proxima = misSes.filter((s) => s.estado === 'planificada' && s.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  const ejMap = useMemo(() => new Map((biblioteca ?? []).map((e) => [e.id, e])), [biblioteca])
  const disponibles = (jugadores ?? []).filter((j) => j.equipoId === eq.id && j.estado === 'disponible').length

  // 3 sugerencias: adecuadas a la edad y a los jugadores, que no se hayan usado en las 3 últimas sesiones.
  const sugeridos = useMemo(() => {
    if (!biblioteca) return []
    const edad = edadEquipo(eq.categoria)
    const usados = new Set(misSes.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3).flatMap((s) => s.bloques.map((b) => b.ejercicioId)))
    const semana = Math.floor(Date.now() / (7 * 864e5))
    const aptos = biblioteca.filter((e) => edad >= e.edadMin && edad <= e.edadMax && disponibles >= e.jugadoresMin && disponibles <= e.jugadoresMax && !usados.has(e.id) && e.tipo !== 'vuelta_calma')
    return aptos.sort((a, b) => ((a.id.charCodeAt(1) + semana) % 7) - ((b.id.charCodeAt(1) + semana) % 7)).slice(0, 3)
  }, [biblioteca, misSes, eq.categoria, disponibles])

  const favoritos = (biblioteca ?? []).filter((e) => prefs.get(`ejercicio:${e.id}`)?.favorito).slice(0, 6)
  const resultados = q.trim().length >= 2 ? {
    ej: (biblioteca ?? []).filter((e) => normalizar(e.titulo + ' ' + e.objetivo).includes(normalizar(q))).slice(0, 5),
    ses: misSes.filter((s) => normalizar(s.objetivo + ' ' + s.bloques.map((b) => ejMap.get(b.ejercicioId)?.titulo ?? '').join(' ')).includes(normalizar(q))).slice(0, 5),
  } : null

  const fechaProx = proximoEntreno(eq.dias)
  const plantilla = (jugadores ?? []).filter((j) => j.equipoId === eq.id).length
  // Semana actual (lunes a domingo): solo recuentos de datos que ya existen.
  const [ya, ma, da] = hoy().split('-').map(Number)
  const lunes = sumarDias(hoy(), -((new Date(ya, ma - 1, da).getDay() + 6) % 7))
  const domingo = sumarDias(lunes, 6)
  const semana = misSes.filter((s) => s.fecha >= lunes && s.fecha <= domingo)
  const minutosSemana = semana.reduce((t, s) => t + duracionTotal(s.bloques), 0)
  return (
    <div>
      <header className="portada">
        <p className="portada-fecha">Hola, {usuario.nombre.split(' ')[0]} · {fechaLarga(hoy()).toLowerCase()}</p>
        <h1 className="portada-equipo">{eq.nombre}</h1>
        <p className="portada-sub">{plantilla ? `${plantilla} jugadores · ${plantilla - disponibles === 0 ? 'todos disponibles' : `${plantilla - disponibles} no disponibles`}` : 'Añade tu plantilla en Perfil para pasar lista en el campo'}</p>
      </header>
      <dl className="indicadores">
        <div><dt>Disponibles</dt><dd className="num">{disponibles}{plantilla ? <small>/{plantilla}</small> : null}</dd></div>
        <div><dt>Sesiones esta semana</dt><dd className="num">{semana.length}</dd></div>
        <div><dt>Minutos planificados</dt><dd className="num">{minutosSemana}</dd></div>
      </dl>

      {!proxima ? (
        <a className="cta" href={href({ n: 'sesion', id: 'nueva' })} onClick={() => sessionStorage.setItem('fechaNueva', fechaProx)}>
          <span className="cta-txt"><strong>Preparar sesión</strong><span className="sub">Próximo entreno: {fechaLarga(fechaProx).toLowerCase()}</span></span>
          <span className="cta-mas" aria-hidden><Icono n="mas" t={28} /></span>
        </a>
      ) : (
        <a className="cta" href={href({ n: 'campo', id: proxima.id })}>
          <span className="cta-txt"><strong>Empezar entrenamiento</strong><span className="sub">{proxima.objetivo || 'Sesión'} · {duracionTotal(proxima.bloques)} min</span></span>
          <span className="cta-mas" aria-hidden><Icono n="silbato" t={28} /></span>
        </a>
      )}

      <div className="buscador bloque-suelto" role="search">
        <Icono n="buscar" />
        <input className="entrada" type="search" placeholder="Busca ejercicios o sesiones" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Búsqueda global" />
      </div>
      {resultados ? (
        <div className="tarjeta pila" aria-live="polite">
          {resultados.ej.map((e) => <a key={e.id} href={href({ n: 'ejercicio', id: e.id })} className="fila entre"><span><Icono n="biblioteca" t={16} /> {e.titulo}</span><span className="ter">Ejercicio</span></a>)}
          {resultados.ses.map((s) => <a key={s.id} href={href({ n: 'sesion', id: s.id })} className="fila entre"><span><Icono n="sesiones" t={16} /> {s.objetivo || 'Sesión'}</span><span className="ter">{s.fecha}</span></a>)}
          {resultados.ej.length + resultados.ses.length === 0 ? <p className="sec" style={{ margin: 0 }}>Nada con «{q}». Prueba otra palabra.</p> : null}
        </div>
      ) : null}

      <section className="bloque">
        {proxima ? (
          <div className="proxima tarjeta">
            <div className="fila entre">
              <div>
                <p className="ter" style={{ margin: 0 }}>Próxima sesión · <span>{fechaLarga(proxima.fecha)}</span>{proxima.hora ? ` · ${proxima.hora}` : ''}</p>
                <h2 style={{ fontSize: '1.7em' }}>{proxima.objetivo || 'Sin objetivo'}</h2>
              </div>
            </div>
            <div className="datos">
              <div className="dato"><b>{duracionTotal(proxima.bloques)}</b><span>minutos</span></div>
              <div className="dato"><b>{proxima.bloques.length}</b><span>ejercicios</span></div>
              <div className="dato"><b>{cargaEstimada(proxima.bloques, ejMap)}</b><span>carga {nivelCarga(cargaEstimada(proxima.bloques, ejMap))}</span></div>
              <div className="dato"><b>{disponibles}</b><span>disponibles</span></div>
            </div>
            <ol className="sec" style={{ margin: 0, paddingLeft: 20 }}>
              {proxima.bloques.map((b) => <li key={b.id}>{nombreBloque(b.tipo)}: {ejMap.get(b.ejercicioId)?.titulo ?? '—'} <span className="ter">({b.minutos}′)</span></li>)}
            </ol>
            <div className="fila">
              <a className="btn" href={href({ n: 'sesion', id: proxima.id })}><Icono n="editar" /> Revisar sesión</a>
            </div>
          </div>
        ) : (
          <a className="tarjeta propuesta" href={href({ n: 'sesion', id: 'nueva' })} onClick={() => { sessionStorage.setItem('fechaNueva', fechaProx); sessionStorage.setItem('abrirAsistente', '1') }}>
            <span className="propuesta-icono" aria-hidden><Icono n="chispa" t={22} /></span>
            <span><strong>¿Sin tiempo? Te propongo una</strong><span className="sec">Aún no tienes sesión para el {fechaLarga(fechaProx).toLowerCase()}. La armo con tu edad y tu plantilla.</span></span>
            <Icono n="adelante" />
          </a>
        )}
      </section>

      <section className="bloque">
        <header><h2>Para tu {eq.nombre}</h2><a href="#biblioteca" className="sec">Ver biblioteca</a></header>
        <div className="rejilla">
          {sugeridos.map((e) => <TarjetaEjercicio key={e.id} e={e} fav={prefs.get(`ejercicio:${e.id}`)?.favorito} alFav={() => void guardarPreferencia(repo, prefs, 'ejercicio', e.id, { favorito: !prefs.get(`ejercicio:${e.id}`)?.favorito })} />)}
        </div>
        {sugeridos.length === 0 && biblioteca ? <p className="sec">No hay sugerencias para {disponibles} jugadores disponibles. Revisa la plantilla o la biblioteca.</p> : null}
      </section>

      <section className="bloque">
        <header><h2>Favoritos</h2></header>
        {favoritos.length ? (
          <div className="chips">{favoritos.map((e) => <a key={e.id} className="chip" href={href({ n: 'ejercicio', id: e.id })}><Icono n="estrella" t={14} relleno /> {e.titulo}</a>)}</div>
        ) : (
          <p className="sec">Marca con la estrella los ejercicios que más usas y los tendrás aquí.</p>
        )}
      </section>
    </div>
  )
}
