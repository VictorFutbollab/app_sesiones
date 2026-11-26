import { useEffect, useMemo, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href, ir } from '../../app/router'
import type { Asistencia, EstadoAsistencia, ObjetivoCumplido } from '../../model/sesiones'
import type { Jugador } from '../../model/comun'
import { enOrden } from '../../logic/bloques'
import { duracionTotal, cargaReal } from '../../logic/carga'
import { nombreBloque } from '../../data/taxonomia'
import { Pizarra } from '../pizarra/Pizarra'
import { Crono } from './Crono'
import { Notas } from './Notas'
import { Icono } from '../../ui/Icono'
import { Vacio } from '../../ui/base'

const CICLO: EstadoAsistencia[] = ['presente', 'ausente', 'justificado', 'no_disponible']
const TEXTO: Record<EstadoAsistencia, string> = { presente: 'Está', ausente: 'Falta', justificado: 'Justificada', no_disponible: 'No disponible' }

/** Pantalla encendida mientras se entrena (si el navegador lo permite). */
function useSinApagar() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const pedir = () => (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined)
    void pedir()
    const vis = () => document.visibilityState === 'visible' && void pedir()
    document.addEventListener('visibilitychange', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      void lock?.release().catch(() => undefined)
    }
  }, [])
}

export function ModoCampo({ id }: { id: string }) {
  const { repo, equipo, aviso } = useApp()
  const sesiones = useTabla('sesiones')
  const jugadores = useTabla('jugadores')
  const asistencias = useTabla('asistencias')
  const cierres = useTabla('cierres')
  const ejercicios = useTabla('ejercicios', true)
  const [paso, setPaso] = useState<'asistencia' | number | 'cierre' | 'resumen'>('asistencia')
  const [grande, setGrande] = useState(true)
  useSinApagar()

  useEffect(() => {
    document.documentElement.dataset.campo = grande ? 'si' : 'no'
    return () => void delete document.documentElement.dataset.campo
  }, [grande])

  const s = sesiones?.find((x) => x.id === id)
  const ejMap = useMemo(() => new Map((ejercicios ?? []).map((e) => [e.id, e])), [ejercicios])
  const plantilla = useMemo(() => (jugadores ?? []).filter((j) => j.equipoId === equipo!.id).sort((a, b) => a.dorsal - b.dorsal), [jugadores, equipo])
  const deSesion = useMemo(() => new Map((asistencias ?? []).filter((a) => a.sesionId === id).map((a) => [a.jugadorId, a])), [asistencias, id])
  const cierre = (cierres ?? []).find((c) => c.sesionId === id)
  const [obj, setObj] = useState<ObjetivoCumplido | null>(null)
  const [rpe, setRpe] = useState<number | null>(null)
  const [nota, setNota] = useState('')
  useEffect(() => {
    if (cierre) { setObj(cierre.objetivoCumplido); setRpe(cierre.rpe); setNota(cierre.nota) }
  }, [cierre?.id]) // eslint-disable-line

  if (!sesiones || !jugadores || !ejercicios) return <div className="vacio">Cargando…</div>
  if (!s) return <Vacio><p>No se encuentra la sesión.</p><a className="btn" href="#sesiones">Mis sesiones</a></Vacio>
  const bloques = enOrden(s.bloques)

  const estadoDe = (j: Jugador): EstadoAsistencia => deSesion.get(j.id)?.estado ?? (j.estado === 'no_disponible' ? 'no_disponible' : 'presente')
  async function marcar(j: Jugador, e: EstadoAsistencia) {
    const previa = deSesion.get(j.id)
    const a: Asistencia = previa ? { ...previa, estado: e } : { ...repo.nuevaMeta(), sesionId: id, jugadorId: j.id, estado: e }
    await repo.guardar('asistencias', a)
  }
  const tocar = (j: Jugador) => void marcar(j, CICLO[(CICLO.indexOf(estadoDe(j)) + 1) % CICLO.length])
  async function confirmarLista() {
    // Los que no se han tocado quedan guardados con su estado por defecto.
    for (const j of plantilla) if (!deSesion.has(j.id)) await marcar(j, estadoDe(j))
    setPaso(bloques.length ? 0 : 'cierre')
  }
  const presentes = plantilla.filter((j) => estadoDe(j) === 'presente').length

  async function cerrarSesion() {
    if (!obj || !rpe) return aviso('Marca si se cumplió el objetivo y el esfuerzo del grupo.')
    await repo.guardar('cierres', cierre ? { ...cierre, objetivoCumplido: obj, rpe, nota } : { ...repo.nuevaMeta(), sesionId: id, objetivoCumplido: obj, rpe, nota })
    await repo.guardar('sesiones', { ...s!, estado: 'hecha' })
    setPaso('resumen')
  }

  const ej = typeof paso === 'number' ? bloques[paso] : null
  const e = ej ? ejMap.get(ej.ejercicioId) : null
  const titulo = paso === 'asistencia' ? 'Asistencia' : paso === 'cierre' ? 'Cierre' : paso === 'resumen' ? 'Hecho' : `${(paso as number) + 1} de ${bloques.length}`

  return (
    <div className="campo-pantalla">
      <header>
        <a className="btn-icono" href={href({ n: 'sesion', id })} aria-label="Salir del modo entrenamiento"><Icono n="cerrar" /></a>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong className="titulo" style={{ fontSize: '1.2em', display: 'block' }}>{titulo}</strong>
          <span className="ter">{s.objetivo || 'Entrenamiento'} · {duracionTotal(s.bloques)}′</span>
        </div>
        <button className="btn" onClick={() => setGrande(!grande)} aria-pressed={grande} title="Botones y texto más grandes, contraste máximo">{grande ? 'Normal' : 'Grande'}</button>
      </header>

      <main>
        {paso === 'asistencia' ? (
          <div className="pila">
            <p className="sec" style={{ margin: 0 }}>Todos vienen marcados. Toca a quien falte (otro toque: justificada, no disponible).</p>
            <div className="fila entre"><strong className="num" style={{ fontSize: '1.3em' }} aria-live="polite">{presentes} de {plantilla.length} están</strong></div>
            <div className="lista-asistencia">
              {plantilla.map((j) => {
                const est = estadoDe(j)
                return (
                  <button key={j.id} className={`jug ${est}`} onClick={() => tocar(j)} aria-label={`${j.dorsal} ${j.nombre}: ${TEXTO[est]}`}>
                    <b>{j.dorsal}</b><span>{j.nombre}</span><small>{TEXTO[est]}</small>
                  </button>
                )
              })}
            </div>
            {plantilla.length === 0 ? <p className="sec">Tu equipo no tiene jugadores. Añádelos en Perfil → Equipo.</p> : null}
          </div>
        ) : null}

        {ej ? (
          <div className="dos-col">
            <div className="pila">
              <div>
                <span className="etiqueta">{nombreBloque(ej.tipo)} · {ej.minutos}′</span>
                <h1 style={{ marginTop: 6 }}>{e?.titulo ?? 'Ejercicio no disponible'}</h1>
              </div>
              {e ? <Pizarra p={e.pizarra} titulo={e.titulo} auto={e.pizarra.fases.length > 1} /> : null}
            </div>
            <div className="pila">
              {e ? <Crono series={e.series} minutos={Math.max(1, Math.round((ej.minutos - ((e.series - 1) * e.descanso) / 60) / e.series))} descanso={e.descanso} alTerminar={() => aviso('Ejercicio terminado')} /> : null}
              {e ? (
                <details open className="tarjeta">
                  <summary style={{ fontWeight: 700, cursor: 'pointer', minHeight: 'var(--toque)', display: 'flex', alignItems: 'center' }}>Consignas</summary>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>{e.consignas.map((c) => <li key={c}>{c}</li>)}</ul>
                  <p className="ter">{e.organizacion}</p>
                </details>
              ) : null}
              <div className="tarjeta"><strong>Notas de la sesión</strong><Notas sesionId={id} grande /></div>
            </div>
          </div>
        ) : null}

        {paso === 'cierre' ? (
          <div className="pila" style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2>¿Se cumplió el objetivo?</h2>
            <p className="sec" style={{ margin: 0 }}>{s.objetivo || 'Objetivo de la sesión'}</p>
            <div className="segmentado" style={{ width: '100%' }} role="group" aria-label="Objetivo cumplido">
              {([['si', 'Sí'], ['en_parte', 'En parte'], ['no', 'No']] as [ObjetivoCumplido, string][]).map(([v, t]) => <button key={v} style={{ flex: 1 }} aria-pressed={obj === v} onClick={() => setObj(v)}>{t}</button>)}
            </div>
            <h2>Esfuerzo del grupo (1–10)</h2>
            <div className="rpe" role="group" aria-label="Esfuerzo percibido">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button key={n} aria-pressed={rpe === n} onClick={() => setRpe(n)}>{n}</button>)}
            </div>
            <p className="ter" style={{ margin: 0 }}>1 muy suave · 5 exigente · 10 máximo</p>
            <label className="campo">Nota (opcional)<textarea value={nota} onChange={(x) => setNota(x.target.value)} placeholder="¿Qué ha funcionado? ¿Qué cambiarías?" /></label>
            <button className="btn primario grande ancho" onClick={cerrarSesion}><Icono n="check" /> Cerrar sesión</button>
          </div>
        ) : null}

        {paso === 'resumen' ? (
          <div className="pila" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <Icono n="check" t={56} />
            <h1>Sesión cerrada</h1>
            <div className="datos-ficha" style={{ textAlign: 'left' }}>
              <div><b>{presentes}</b><span>presentes</span></div>
              <div><b>{duracionTotal(s.bloques)}′</b><span>duración</span></div>
              <div><b>{cargaReal(duracionTotal(s.bloques), rpe ?? 0)}</b><span>carga (UA)</span></div>
            </div>
            <p className="sec">Queda guardada en tu historial{navigator.onLine ? '' : ' y se subirá en cuanto haya señal'}.</p>
            <button className="btn primario grande" onClick={() => ir({ n: 'inicio' })}>Terminar</button>
          </div>
        ) : null}
      </main>

      {paso !== 'resumen' ? (
        <footer>
          <button className="btn grande" disabled={paso === 'asistencia'} onClick={() => setPaso(paso === 'cierre' ? (bloques.length ? bloques.length - 1 : 'asistencia') : typeof paso === 'number' && paso > 0 ? paso - 1 : 'asistencia')}><Icono n="atras" /> Anterior</button>
          {paso === 'asistencia' ? (
            <button className="btn primario grande" onClick={confirmarLista}>Lista hecha <Icono n="adelante" /></button>
          ) : paso === 'cierre' ? (
            <span />
          ) : (
            <button className="btn primario grande" onClick={() => setPaso((paso as number) < bloques.length - 1 ? (paso as number) + 1 : 'cierre')}>{(paso as number) < bloques.length - 1 ? 'Siguiente' : 'Cerrar sesión'} <Icono n="siguiente" /></button>
          )}
        </footer>
      ) : null}
    </div>
  )
}
