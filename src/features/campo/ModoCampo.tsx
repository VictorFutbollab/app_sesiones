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
import { Dato, Vacio } from '../../ui/base'

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
        <header className="cabecera">
          <a className="redondo" href={href({ n: 'sesion', id })} aria-label="Salir del modo entrenamiento"><Icono n="cerrar" /></a>
          <div className="cabecera-txt">
            <h1>{titulo}</h1>
            <p className="sub">{s.objetivo || 'Entrenamiento'} · {duracionTotal(s.bloques)}′</p>
          </div>
          <button className="redondo" onClick={() => setGrande(!grande)} aria-pressed={grande} aria-label={grande ? 'Letra normal' : 'Letra grande'} title={grande ? 'Letra normal' : 'Botones y letra más grandes'}><span style={{ fontWeight: 800, fontSize: grande ? '0.9em' : '1.15em' }}>Aa</span></button>
        </header>
      </header>

      <main>
        {paso === 'asistencia' ? (
          <div className="caja">
            <div className="caja-cab"><h2>¿Quién ha venido?</h2><span className="recuento num" aria-live="polite">{presentes} de {plantilla.length}</span></div>
            <p className="sec">Todos vienen marcados. Toca a quien falte; otro toque: justificada o no disponible.</p>
            <div className="lista-asistencia">
              {plantilla.map((j) => {
                const est = estadoDe(j)
                return (
                  <button key={j.id} className={`jug ${est}`} onClick={() => tocar(j)} aria-label={`${j.dorsal} ${j.nombre}: ${TEXTO[est]}`}>
                    <b>{j.dorsal}</b>
                    <span className="jug-txt"><span>{j.nombre}</span>{est !== 'presente' ? <small>{TEXTO[est]}</small> : null}</span>
                    <span className="check" aria-hidden><Icono n="check" t={16} /></span>
                  </button>
                )
              })}
            </div>
            {plantilla.length === 0 ? <p className="sec">Tu equipo no tiene jugadores. Añádelos en Perfil → Plantilla.</p> : null}
          </div>
        ) : null}

        {ej ? (
          <div className="dos-col">
            <div className="pila">
              <div>
                <span className="etiqueta propio">{nombreBloque(ej.tipo)} · {ej.minutos}′</span>
                <h2 style={{ marginTop: 8, fontSize: '1.6em', fontWeight: 800 }}>{e?.titulo ?? 'Ejercicio no disponible'}</h2>
              </div>
              {e ? <div className="ficha-pizarra"><Pizarra p={e.pizarra} titulo={e.titulo} auto={e.pizarra.fases.length > 1} /></div> : null}
            </div>
            <div className="pila">
              {e ? <Crono series={e.series} minutos={Math.max(1, Math.round((ej.minutos - ((e.series - 1) * e.descanso) / 60) / e.series))} descanso={e.descanso} alTerminar={() => aviso('Ejercicio terminado')} /> : null}
              {e ? (
                <div className="caja" style={{ margin: 0 }}>
                  <h2 style={{ fontSize: '1.2em', fontWeight: 800 }}>Consignas</h2>
                  <ul>{e.consignas.map((c) => <li key={c}>{c}</li>)}</ul>
                  <p className="sec">{e.organizacion}</p>
                </div>
              ) : null}
              <div className="caja" style={{ margin: 0 }}><h2 style={{ fontSize: '1.2em', fontWeight: 800 }}>Notas de la sesión</h2><Notas sesionId={id} grande /></div>
            </div>
          </div>
        ) : null}

        {paso === 'cierre' ? (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div className="caja">
              <h2 style={{ fontSize: '1.2em', fontWeight: 800 }}>¿Se cumplió el objetivo?</h2>
              <p className="sec">{s.objetivo || 'Objetivo de la sesión'}</p>
              <div className="segmentado lleno" role="group" aria-label="Objetivo cumplido">
                {([['si', 'Sí'], ['en_parte', 'En parte'], ['no', 'No']] as [ObjetivoCumplido, string][]).map(([v, t]) => <button key={v} aria-pressed={obj === v} onClick={() => setObj(v)}>{t}</button>)}
              </div>
            </div>
            <div className="caja">
              <h2 style={{ fontSize: '1.2em', fontWeight: 800 }}>Esfuerzo del grupo</h2>
              <div className="rpe" role="group" aria-label="Esfuerzo percibido">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button key={n} aria-pressed={rpe === n} onClick={() => setRpe(n)}>{n}</button>)}
              </div>
              <p className="ter">1 muy suave · 5 exigente · 10 máximo</p>
            </div>
            <div className="caja">
              <label className="campo">Nota (opcional)<textarea value={nota} onChange={(x) => setNota(x.target.value)} placeholder="¿Qué ha funcionado? ¿Qué cambiarías?" /></label>
            </div>
            <button className="btn amarillo grande ancho" onClick={cerrarSesion}><Icono n="check" /> Cerrar sesión</button>
          </div>
        ) : null}

        {paso === 'resumen' ? (
          <div className="pila" style={{ maxWidth: 560, margin: '0 auto' }}>
            <div className="hero">
              <div className="hero-txt"><strong style={{ fontSize: '1.5em', fontFamily: 'var(--f-titulo)' }}>Sesión cerrada</strong><span>Queda guardada en tu historial{navigator.onLine ? '' : ' y se subirá en cuanto haya señal'}.</span></div>
              <div className="hero-num"><Icono n="check" t={56} /></div>
            </div>
            <div className="caja">
              <div className="datos-t">
                <Dato etiqueta="Presentes" valor={presentes} extra={`de ${plantilla.length}`} />
                <Dato etiqueta="Duración" valor={`${duracionTotal(s.bloques)}′`} />
                <Dato etiqueta="Carga" valor={cargaReal(duracionTotal(s.bloques), rpe ?? 0)} extra="UA" />
              </div>
            </div>
            <button className="btn amarillo grande ancho" onClick={() => ir({ n: 'inicio' })}>Terminar</button>
          </div>
        ) : null}
      </main>

      {paso !== 'resumen' ? (
        <footer><div className="pie-fijo">
          <button className="btn grande" disabled={paso === 'asistencia'} onClick={() => setPaso(paso === 'cierre' ? (bloques.length ? bloques.length - 1 : 'asistencia') : typeof paso === 'number' && paso > 0 ? paso - 1 : 'asistencia')}><Icono n="atras" /> Anterior</button>
          {paso === 'asistencia' ? (
            <button className="btn primario grande" onClick={confirmarLista}>Lista hecha <Icono n="adelante" /></button>
          ) : paso === 'cierre' ? (
            null
          ) : (
            <button className="btn primario grande" onClick={() => setPaso((paso as number) < bloques.length - 1 ? (paso as number) + 1 : 'cierre')}>{(paso as number) < bloques.length - 1 ? 'Siguiente' : 'Cerrar sesión'} <Icono n="siguiente" /></button>
          )}
        </div></footer>
      ) : null}
    </div>
  )
}
