import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Equipo, Usuario } from '../model/comun'
import type { Tabla, Tablas } from '../model/sesiones'
import { Repo } from '../lib/db/repo'
import { borrarTodo, db, type DB } from '../lib/db/idb'
import { Motor, type EstadoSync } from '../lib/sync/motor'
import { transporteSupabase } from '../lib/sync/transporte-supabase'
import { MODO_DEMO, supabase } from '../lib/supabase/cliente'
import { cerrarSesion as salir, usuarioActual } from '../lib/cuenta'
import { escuchar } from '../lib/eventos'
import { esPro as calcularPro } from '../logic/planes'
import { EJERCICIOS_DEMO } from '../data/ejercicios-demo'

export type Tema = 'oscuro' | 'claro'

interface Ctx {
  repo: Repo
  usuario: Usuario
  setUsuario: (u: Usuario) => void
  equipo: Equipo | null
  setEquipoActivo: (id: string) => void
  pro: boolean
  sync: EstadoSync | null
  sincronizar: () => void
  aviso: (texto: string, accion?: { texto: string; hacer: () => void }) => void
  tema: Tema
  setTema: (t: Tema) => void
  usosAsistente: number
  sumarUsoAsistente: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

const C = createContext<Ctx | null>(null)
export const useApp = () => {
  const c = useContext(C)
  if (!c) throw new Error('useApp fuera del proveedor')
  return c
}

/** Filas vivas de una tabla, siempre al día (también tras sincronizar o cambiar en otra pestaña). */
export function useTabla<T extends Tabla>(t: T, conEliminados = false): Tablas[T][] | null {
  const { repo } = useApp()
  const [xs, setXs] = useState<Tablas[T][] | null>(null)
  useEffect(() => {
    let vivo = true
    const cargar = () => repo.listar(t, conEliminados).then((r) => vivo && setXs(r))
    void cargar()
    const fuera = escuchar((ts) => ts.includes(t) && void cargar())
    return () => {
      vivo = false
      fuera()
    }
  }, [repo, t, conEliminados])
  return xs
}

const mesActual = () => new Date().toISOString().slice(0, 7)

/** Carga el catálogo de demostración en el dispositivo (modo demo; con servidor llega por sincronización). */
async function sembrarCatalogo(d: DB) {
  if ((await d.get('meta', 'catalogo')) === 'demo-1') return
  const tx = d.transaction(['ejercicios', 'meta'], 'readwrite')
  for (const e of EJERCICIOS_DEMO) await tx.objectStore('ejercicios').put(e)
  await tx.objectStore('meta').put('demo-1', 'catalogo')
  await tx.done
}

export function Proveedor({ children, pantallaAcceso }: { children: ReactNode; pantallaAcceso: (repo: Repo, listo: (u: Usuario) => void) => ReactNode }) {
  const [d, setD] = useState<DB | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined)
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [activo, setActivo] = useState<string | null>(null)
  const [sync, setSync] = useState<EstadoSync | null>(null)
  const [avisoTxt, setAviso] = useState<{ texto: string; accion?: { texto: string; hacer: () => void } } | null>(null)
  const [tema, setTemaS] = useState<Tema>('claro')
  const [usos, setUsos] = useState(0)
  const motor = useRef<Motor | null>(null)
  const usuarioRef = useRef<string>('')
  const repo = useMemo(() => (d ? new Repo(d, () => usuarioRef.current) : null), [d])

  // Arranque
  useEffect(() => {
    void (async () => {
      const base = await db()
      setD(base)
      const r = new Repo(base, () => usuarioRef.current)
      if (MODO_DEMO) await sembrarCatalogo(base)
      const t = await r.meta<Tema>('tema')
      if (t) setTemaS(t)
      setActivo((await r.meta<string>('equipoActivo')) ?? null)
      const u = await usuarioActual(r)
      if (u) usuarioRef.current = u.id
      setUsuario(u)
      const usosMes = await r.meta<{ mes: string; n: number }>('asistente')
      setUsos(usosMes?.mes === mesActual() ? usosMes.n : 0)
      await r.limpiarPapelera(['ejercicios', 'sesiones', 'notas', 'carpetas', 'vistas'])
    })()
  }, [])

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#102018')
  }, [tema])

  // Equipos (para el equipo activo)
  useEffect(() => {
    if (!repo || !usuario) return
    const cargar = () => repo.listar('equipos').then(setEquipos)
    void cargar()
    return escuchar((ts) => ts.includes('equipos') && void cargar())
  }, [repo, usuario])

  // Sincronización con el servidor (solo con Supabase configurado)
  const sincronizar = useCallback(() => {
    if (!motor.current) return
    void motor.current.sincronizar().then((r) => {
      setSync(r)
      if (r.rechazos.length) setAviso({ texto: r.rechazos[0].motivo })
    })
  }, [])
  useEffect(() => {
    if (MODO_DEMO || !d || !usuario || !supabase) return
    motor.current = new Motor(d, transporteSupabase(supabase))
    sincronizar()
    let t: ReturnType<typeof setTimeout> | undefined
    const tras = escuchar(() => {
      clearTimeout(t)
      t = setTimeout(sincronizar, 1500)
    })
    const enLinea = () => sincronizar()
    addEventListener('online', enLinea)
    const cada = setInterval(sincronizar, 60_000)
    return () => {
      tras()
      removeEventListener('online', enLinea)
      clearInterval(cada)
      clearTimeout(t)
    }
  }, [d, usuario, sincronizar])

  // Pide que el navegador no borre los datos locales (Safari los puede purgar).
  useEffect(() => void navigator.storage?.persist?.().catch(() => undefined), [])

  const aviso = useCallback((texto: string, accion?: { texto: string; hacer: () => void }) => setAviso({ texto, accion }), [])
  useEffect(() => {
    if (!avisoTxt) return
    const t = setTimeout(() => setAviso(null), avisoTxt.accion ? 6000 : 3500)
    return () => clearTimeout(t)
  }, [avisoTxt])

  if (!repo || usuario === undefined) return <div className="vacio" style={{ minHeight: '100dvh', alignContent: 'center' }}>Cargando…</div>
  if (!usuario) return <>{pantallaAcceso(repo, (u) => { usuarioRef.current = u.id; setUsuario(u) })}</>

  const equipo = equipos.find((e) => e.id === activo) ?? equipos[0] ?? null
  const valor: Ctx = {
    repo,
    usuario,
    setUsuario: (u) => {
      setUsuario(u)
      void repo.setMeta('usuario', u)
    },
    equipo,
    setEquipoActivo: (id) => {
      setActivo(id)
      void repo.setMeta('equipoActivo', id)
    },
    pro: calcularPro(usuario.plan, usuario.proHasta),
    sync,
    sincronizar,
    aviso,
    tema,
    setTema: (t) => {
      setTemaS(t)
      void repo.setMeta('tema', t)
    },
    usosAsistente: usos,
    sumarUsoAsistente: async () => {
      const n = usos + 1
      setUsos(n)
      await repo.setMeta('asistente', { mes: mesActual(), n })
    },
    cerrarSesion: async () => {
      await salir()
      await borrarTodo(d!)
      location.hash = ''
      location.reload()
    },
  }
  return (
    <C.Provider value={valor}>
      {children}
      {avisoTxt ? (
        <div className="aviso-flotante" role="status">
          <span>{avisoTxt.texto}</span>
          {avisoTxt.accion ? (
            <button className="btn" style={{ minHeight: 36 }} onClick={() => { avisoTxt.accion!.hacer(); setAviso(null) }}>
              {avisoTxt.accion.texto}
            </button>
          ) : null}
        </div>
      ) : null}
    </C.Provider>
  )
}
