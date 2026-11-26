import { Suspense, lazy } from 'react'
import { Proveedor, useApp } from './estado'
import { href, useRuta, type Ruta } from './router'
import { Icono, Logo } from '../ui/Icono'
import { Bienvenida } from '../features/cuenta/Bienvenida'
import { CrearEquipo } from '../features/cuenta/CrearEquipo'
import { Inicio } from '../features/inicio/Inicio'
import { Biblioteca } from '../features/biblioteca/Biblioteca'
import { MODO_DEMO } from '../lib/supabase/cliente'

// Carga diferida: lo pesado (editor, modo campo, PDF) solo se descarga al usarlo.
const Ficha = lazy(() => import('../features/ejercicio/Ficha').then((m) => ({ default: m.Ficha })))
const FormEjercicio = lazy(() => import('../features/ejercicio/FormEjercicio').then((m) => ({ default: m.FormEjercicio })))
const Constructor = lazy(() => import('../features/sesion/Constructor').then((m) => ({ default: m.Constructor })))
const MisSesiones = lazy(() => import('../features/calendario/MisSesiones').then((m) => ({ default: m.MisSesiones })))
const ModoCampo = lazy(() => import('../features/campo/ModoCampo').then((m) => ({ default: m.ModoCampo })))
const Perfil = lazy(() => import('../features/perfil/Perfil').then((m) => ({ default: m.Perfil })))
const Planes = lazy(() => import('../features/perfil/Planes').then((m) => ({ default: m.Planes })))
const Papelera = lazy(() => import('../features/perfil/Papelera').then((m) => ({ default: m.Papelera })))

function Pantalla({ r }: { r: Ruta }) {
  switch (r.n) {
    case 'biblioteca': return <Biblioteca />
    case 'ejercicio': return <Ficha id={r.id} />
    case 'ejercicio-editar': return <FormEjercicio id={r.id} />
    case 'sesiones': return <MisSesiones />
    case 'sesion': return <Constructor id={r.id} />
    case 'perfil': return <Perfil seccion={r.seccion} />
    case 'planes': return <Planes />
    case 'papelera': return <Papelera />
    default: return <Inicio />
  }
}

const NAV: { r: Ruta; t: string; i: string; activo: (r: Ruta) => boolean }[] = [
  { r: { n: 'inicio' }, t: 'Inicio', i: 'inicio', activo: (r) => r.n === 'inicio' },
  { r: { n: 'biblioteca' }, t: 'Biblioteca', i: 'biblioteca', activo: (r) => r.n === 'biblioteca' || r.n === 'ejercicio' || r.n === 'ejercicio-editar' },
  { r: { n: 'sesiones' }, t: 'Sesiones', i: 'sesiones', activo: (r) => r.n === 'sesiones' || r.n === 'sesion' },
  { r: { n: 'perfil' }, t: 'Perfil', i: 'perfil', activo: (r) => r.n === 'perfil' || r.n === 'planes' || r.n === 'papelera' },
]

function EstadoSync() {
  const { sync, sincronizar } = useApp()
  if (MODO_DEMO) return <span className="estado-sync" title="Modo demostración: los datos se guardan solo en este dispositivo"><i style={{ background: 'var(--amber)' }} />Demostración</span>
  if (!sync) return null
  const txt = sync.estado === 'sin_red' ? `Sin conexión${sync.pendientes ? ` · ${sync.pendientes} por subir` : ''}` : sync.estado === 'pendiente' ? `${sync.pendientes} por subir` : sync.estado === 'error' ? 'Error al sincronizar' : 'Sincronizado'
  return (
    <button className={`estado-sync ${sync.estado}`} onClick={sincronizar} title="Sincronizar ahora" style={{ cursor: 'pointer' }}>
      <i />{txt}
    </button>
  )
}

function Marco() {
  const r = useRuta()
  const { equipo } = useApp()
  if (!equipo) return <CrearEquipo />
  if (r.n === 'campo') {
    return (
      <Suspense fallback={<div className="vacio">Preparando el campo…</div>}>
        <ModoCampo id={r.id} />
      </Suspense>
    )
  }
  const crear: Ruta = { n: 'sesion', id: 'nueva' }
  return (
    <div className="app">
      <nav className="nav-lat" aria-label="Principal">
        <a href="#inicio" className="marca" style={{ padding: '4px 8px 12px' }}><Logo /> <span>Sesiones<small style={{ display: 'block' }}>FutbolLab</small></span></a>
        <a href={href(crear)} className="crear"><Icono n="mas" /> Nueva sesión</a>
        {NAV.map((x) => (
          <a key={x.t} href={href(x.r)} aria-current={x.activo(r) ? 'page' : undefined}><Icono n={x.i} /> {x.t}</a>
        ))}
        <div className="pie"><EstadoSync /></div>
      </nav>
      <div>
        <header className="barra-sup">
          <a href="#inicio" className="marca"><Logo t={26} /> Sesiones</a>
          <div className="derecha">
            <EstadoSync />
            <a href="#perfil--equipo" className="chip" title="Equipo activo">{equipo.nombre}</a>
          </div>
        </header>
        <main className="contenido" id="contenido">
          <Suspense fallback={<div className="vacio">Cargando…</div>}>
            <Pantalla r={r} />
          </Suspense>
        </main>
      </div>
      <nav className="nav-inf" aria-label="Principal">
        {NAV.slice(0, 2).map((x) => (
          <a key={x.t} href={href(x.r)} aria-current={x.activo(r) ? 'page' : undefined}><Icono n={x.i} /> {x.t}</a>
        ))}
        <a href={href(crear)} className="mas" aria-label="Nueva sesión"><span className="circulo"><Icono n="mas" t={28} /></span></a>
        {NAV.slice(2).map((x) => (
          <a key={x.t} href={href(x.r)} aria-current={x.activo(r) ? 'page' : undefined}><Icono n={x.i} /> {x.t}</a>
        ))}
      </nav>
    </div>
  )
}

export function App() {
  return (
    <Proveedor pantallaAcceso={(repo, listo) => <Bienvenida repo={repo} listo={listo} />}>
      <Marco />
    </Proveedor>
  )
}
