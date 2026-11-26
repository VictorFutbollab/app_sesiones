import { useMemo, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href, ir } from '../../app/router'
import { contarFiltros, filtrar, FILTROS_VACIOS, type Filtros, type Orden } from '../../logic/filtros'
import { puedeCrearEjercicio } from '../../logic/planes'
import { FASES } from '../../data/taxonomia'
import type { FaseJuego } from '../../model/sesiones'
import { Cabecera, Hoja, Redondo, Vacio } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import { PanelFiltros } from './Filtros'
import { TarjetaEjercicio, edadEquipo, guardarPreferencia, useBiblioteca, usePreferencias } from './comun'

const CLAVE = 'filtros-biblioteca'
const leerFiltros = (): Filtros => {
  try {
    return { ...FILTROS_VACIOS, ...JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}') }
  } catch {
    return FILTROS_VACIOS
  }
}

export function Biblioteca() {
  const { repo, equipo, usuario, pro, aviso } = useApp()
  const biblioteca = useBiblioteca()
  const todos = useTabla('ejercicios')
  const jugadores = useTabla('jugadores')
  const vistas = useTabla('vistas')
  const carpetas = useTabla('carpetas')
  const prefs = usePreferencias()
  const [f, setF] = useState<Filtros>(leerFiltros)
  const [orden, setOrden] = useState<Orden>('relevancia')
  const [abierto, setAbierto] = useState(false)
  const [nombreVista, setNombreVista] = useState('')
  const set = (x: Filtros) => {
    setF(x)
    sessionStorage.setItem(CLAVE, JSON.stringify(x))
  }
  const favs = useMemo(() => new Set([...prefs.values()].filter((p) => p.favorito && p.entidad === 'ejercicio').map((p) => p.entidadId)), [prefs])
  const lista = useMemo(() => (biblioteca ? filtrar(biblioteca, f, favs, orden) : null), [biblioteca, f, favs, orden])
  const edad = edadEquipo(equipo!.categoria)
  const nJug = (jugadores ?? []).filter((j) => j.equipoId === equipo!.id && j.estado === 'disponible').length || 12
  const n = contarFiltros(f)

  async function guardarVista() {
    if (!nombreVista.trim()) return
    await repo.guardar('vistas', { ...repo.nuevaMeta(), nombre: nombreVista.trim(), filtros: f })
    setNombreVista('')
    aviso('Vista guardada')
  }

  function nuevo() {
    const b = puedeCrearEjercicio(pro ? 'pro' : 'gratis', todos ?? [], usuario.id)
    if (b) return aviso(b.motivo, { texto: 'Ver Pro', hacer: () => ir({ n: 'planes' }) })
    ir({ n: 'ejercicio-editar', id: 'nuevo' })
  }

  return (
    <div>
      <Cabecera titulo="Biblioteca" sub={`${lista ? `${lista.length} ejercicio${lista.length === 1 ? '' : 's'}` : 'Cargando…'}${!pro ? ' · plan Gratis' : ''}`}>
        <Redondo primario icono="mas" etiqueta="Crear ejercicio" onClick={nuevo} />
      </Cabecera>

      <div className="pila">
        <div className="buscador" role="search">
          <Icono n="buscar" />
          <input className="entrada" type="search" value={f.texto} onChange={(e) => set({ ...f, texto: e.target.value })} placeholder="Busca: rondo, presión, conducción…" aria-label="Buscar ejercicios" />
        </div>
        <div className="chips" aria-label="Filtros rápidos">
          <button className="chip" onClick={() => setAbierto(true)} aria-haspopup="dialog" style={n ? { borderColor: 'var(--accent)' } : undefined}><Icono n="filtro" t={16} /> Filtros{n ? ` (${n})` : ''}</button>
          <button className="chip" aria-pressed={f.edad != null} onClick={() => set({ ...f, edad: f.edad == null ? edad : null })}>Mi edad ({edad})</button>
          <button className="chip" aria-pressed={f.jugadores != null} onClick={() => set({ ...f, jugadores: f.jugadores == null ? nJug : null })}>{f.jugadores ?? nJug} jugadores</button>
          {(Object.keys(FASES) as FaseJuego[]).slice(0, 4).map((k) => (
            <button key={k} className="chip" aria-pressed={f.fases.includes(k)} onClick={() => set({ ...f, fases: f.fases.includes(k) ? f.fases.filter((x) => x !== k) : [...f.fases, k] })}>{FASES[k]}</button>
          ))}
          <button className="chip" aria-pressed={f.soloFavoritos} onClick={() => set({ ...f, soloFavoritos: !f.soloFavoritos })}><Icono n="estrella" t={14} /> Favoritos</button>
        </div>
        {vistas?.length ? (
          <div className="chips" aria-label="Vistas guardadas">
            {vistas.map((v) => <button key={v.id} className="chip" onClick={() => set({ ...FILTROS_VACIOS, ...v.filtros })}><Icono n="carpeta" t={14} /> {v.nombre}</button>)}
          </div>
        ) : null}
      </div>

      <div className="fila entre" style={{ margin: '14px 0 12px' }}>
        <p className="sec num" aria-live="polite" style={{ margin: 0 }}>{n ? `${n} filtro${n === 1 ? '' : 's'} activo${n === 1 ? '' : 's'}` : 'Ordenar por'}</p>
        <div className="fila">
          {n ? <button className="btn fantasma" onClick={() => set({ ...FILTROS_VACIOS })}>Quitar filtros</button> : null}
          <select className="entrada" style={{ width: 'auto' }} value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar">
            <option value="relevancia">Más relevantes</option>
            <option value="titulo">A–Z</option>
            <option value="intensidad">Más intensos</option>
            <option value="duracion">Más cortos</option>
            <option value="recientes">Más recientes</option>
          </select>
        </div>
      </div>

      {lista && lista.length === 0 ? (
        <Vacio icono="buscar">
          <p>No hay ejercicios con estos filtros.</p>
          <button className="btn" onClick={() => set({ ...FILTROS_VACIOS, texto: f.texto })}>Quitar filtros</button>
        </Vacio>
      ) : (
        <div className="rejilla">
          {lista?.map((e) => <TarjetaEjercicio key={e.id} e={e} fav={favs.has(e.id)} alFav={() => void guardarPreferencia(repo, prefs, 'ejercicio', e.id, { favorito: !favs.has(e.id) })} />)}
        </div>
      )}
      {!pro ? <p className="ter bloque">Con Pro tendrás la biblioteca completa y novedades cada mes. <a href={href({ n: 'planes' })}>Ver planes</a></p> : null}

      <Hoja
        titulo="Filtros"
        abierta={abierto}
        cerrar={() => setAbierto(false)}
        pie={
          <div className="pila">
            <div className="fila">
              <input className="entrada" style={{ flex: 1 }} value={nombreVista} onChange={(e) => setNombreVista(e.target.value)} placeholder="Nombre de la vista (p. ej. «Alevín, martes»)" aria-label="Nombre de la vista" />
              <button className="btn" onClick={guardarVista} disabled={!nombreVista.trim() || n === 0}>Guardar vista</button>
            </div>
            <button className="btn primario grande ancho" onClick={() => setAbierto(false)}>Ver {lista?.length ?? 0} ejercicios</button>
          </div>
        }
      >
        <PanelFiltros f={f} set={set} edadEquipo={edad} jugadoresEquipo={nJug} carpetas={carpetas ?? []} />
      </Hoja>
    </div>
  )
}
