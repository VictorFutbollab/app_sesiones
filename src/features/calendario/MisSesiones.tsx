import { useMemo, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href } from '../../app/router'
import { duracionTotal } from '../../logic/carga'
import { hoy } from '../../logic/id'
import { normalizar } from '../../logic/filtros'
import { Cabecera, Redondo, Seccion, Segmentado, Vacio, diaSemana } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import type { Sesion } from '../../model/sesiones'

const z = (n: number) => String(n).padStart(2, '0')

function Fila({ s, titulos, cerrada }: { s: Sesion; titulos: string; cerrada?: string }) {
  const [, m, d] = s.fecha.split('-')
  return (
    <a className="fila-ses" href={href({ n: 'sesion', id: s.id })}>
      <div className="fecha"><small>{diaSemana(s.fecha)}</small><b>{Number(d)}</b><small>{new Date(2026, Number(m) - 1, 1).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</small></div>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block' }}>{s.objetivo || 'Sin objetivo'}</strong>
        <span className="ter" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulos || 'Sin ejercicios'}</span>
        {cerrada ? <span className="ter">{cerrada}</span> : null}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="num" style={{ fontWeight: 700 }}>{duracionTotal(s.bloques)}′</span><br />
        <span className={`etiqueta${s.estado === 'hecha' ? '' : ' propio'}`}>{s.estado === 'hecha' ? 'Hecha' : 'Planificada'}</span>
      </div>
    </a>
  )
}

export function MisSesiones() {
  const { equipo } = useApp()
  const sesiones = useTabla('sesiones')
  const ejercicios = useTabla('ejercicios', true)
  const cierres = useTabla('cierres')
  const [vista, setVista] = useState<'lista' | 'calendario'>('lista')
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'todas' | 'planificada' | 'hecha'>('todas')
  const [mes, setMes] = useState(() => hoy().slice(0, 7))
  const [dia, setDia] = useState<string | null>(null)
  const titulos = useMemo(() => new Map((ejercicios ?? []).map((e) => [e.id, e.titulo])), [ejercicios])
  const cierreDe = useMemo(() => new Map((cierres ?? []).map((c) => [c.sesionId, c])), [cierres])
  const eq = equipo!
  const texto = (s: Sesion) => s.bloques.map((b) => titulos.get(b.ejercicioId) ?? '').join(' · ')
  const lista = useMemo(() => (sesiones ?? [])
    .filter((s) => s.equipoId === eq.id && !s.archivado && (estado === 'todas' || s.estado === estado))
    .filter((s) => !q.trim() || normalizar(`${s.objetivo} ${texto(s)} ${s.fecha}`).includes(normalizar(q)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha)), [sesiones, eq.id, estado, q, titulos]) // eslint-disable-line

  if (!sesiones) return <div className="vacio">Cargando…</div>
  const proximas = lista.filter((s) => s.estado === 'planificada' && s.fecha >= hoy()).reverse()
  const pasadas = lista.filter((s) => !(s.estado === 'planificada' && s.fecha >= hoy()))
  const OBJ = { si: 'Objetivo cumplido', en_parte: 'Objetivo en parte', no: 'Objetivo no cumplido' }

  // Calendario del mes
  const [y, m] = mes.split('-').map(Number)
  const primero = new Date(y, m - 1, 1)
  const inicio = new Date(y, m - 1, 1 - ((primero.getDay() + 6) % 7))
  const dias = Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i))
  const porDia = new Map<string, Sesion[]>()
  for (const s of lista) porDia.set(s.fecha, [...(porDia.get(s.fecha) ?? []), s])
  const cambiarMes = (n: number) => { const d = new Date(y, m - 1 + n, 1); setMes(`${d.getFullYear()}-${z(d.getMonth() + 1)}`); setDia(null) }

  return (
    <div>
      <Cabecera titulo="Sesiones" sub={`${eq.nombre} · ${lista.length} sesi${lista.length === 1 ? 'ón' : 'ones'}`}>
        <Redondo primario icono="mas" etiqueta="Nueva sesión" href={href({ n: 'sesion', id: 'nueva' })} />
      </Cabecera>
      <div className="pila">
        <Segmentado lleno etiqueta="Vista" valor={vista} cambiar={setVista} opciones={[['lista', 'Lista'], ['calendario', 'Calendario']]} />
        <div className="buscador" role="search"><Icono n="buscar" /><input className="entrada" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por objetivo o ejercicio" aria-label="Buscar sesiones" /></div>
        <div className="chips" role="group" aria-label="Estado">
          {([['todas', 'Todas'], ['planificada', 'Planificadas'], ['hecha', 'Hechas']] as const).map(([v, t]) => <button key={v} className="chip" aria-pressed={estado === v} onClick={() => setEstado(v)}>{t}</button>)}
        </div>
      </div>

      {vista === 'calendario' ? (
        <div className="caja">
          <div className="fila entre">
            <button className="btn-icono" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><Icono n="atras" /></button>
            <strong className="titulo" style={{ fontSize: '1.3em', textTransform: 'capitalize' }}>{primero.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</strong>
            <button className="btn-icono" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><Icono n="adelante" /></button>
          </div>
          <div className="cal">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <span key={d} className="dia-sem">{d}</span>)}
            {dias.map((d) => {
              const f = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
              const ss = porDia.get(f) ?? []
              const entreno = eq.dias.includes(((d.getDay() + 6) % 7) + 1)
              return (
                <button key={f} className={`${d.getMonth() !== m - 1 ? 'fuera' : ''}${f === hoy() ? ' hoy' : ''}`} aria-pressed={dia === f} onClick={() => setDia(f)} aria-label={`${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}: ${ss.length} sesiones`}>
                  {d.getDate()}
                  <span className="marcas">{ss.length ? ss.map((s) => <i key={s.id} className={s.estado === 'hecha' ? 'hecha' : ''} />) : entreno ? <i className="entreno" /> : null}</span>
                </button>
              )
            })}
          </div>
          {dia ? (
            <div className="pila">
              {(porDia.get(dia) ?? []).map((s) => <Fila key={s.id} s={s} titulos={texto(s)} cerrada={cierreDe.get(s.id) ? OBJ[cierreDe.get(s.id)!.objetivoCumplido] : undefined} />)}
              <a className="btn" href={href({ n: 'sesion', id: 'nueva' })} onClick={() => sessionStorage.setItem('fechaNueva', dia)}><Icono n="mas" t={18} /> Sesión el {dia.split('-').reverse().slice(0, 2).join('/')}</a>
            </div>
          ) : <p className="ter">Toca un día para ver o crear sesiones. Los círculos huecos son tus días de entreno.</p>}
        </div>
      ) : lista.length === 0 ? (
        <Vacio icono="sesiones"><p>{q ? `No hay sesiones con «${q}».` : 'Aún no tienes sesiones.'}</p><a className="btn primario" href={href({ n: 'sesion', id: 'nueva' })}>Preparar la primera</a></Vacio>
      ) : (
        <>
          {proximas.length ? <Seccion titulo="Próximas" className="lista">{proximas.map((s) => <Fila key={s.id} s={s} titulos={texto(s)} />)}</Seccion> : null}
          {pasadas.length ? <Seccion titulo="Historial" className="lista">{pasadas.map((s) => <Fila key={s.id} s={s} titulos={texto(s)} cerrada={cierreDe.get(s.id) ? `${OBJ[cierreDe.get(s.id)!.objetivoCumplido]} · esfuerzo ${cierreDe.get(s.id)!.rpe}/10` : undefined} />)}</Seccion> : null}
        </>
      )}
    </div>
  )
}
