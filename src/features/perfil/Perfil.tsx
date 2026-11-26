import { useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href } from '../../app/router'
import { CATEGORIAS } from '../../data/taxonomia'
import type { Jugador, Modalidad, Posicion } from '../../model/comun'
import { MODO_DEMO, supabase } from '../../lib/supabase/cliente'
import { borrarCuenta } from '../../lib/cuenta'
import { descargar } from '../../lib/exportar/compartir'
import { TABLAS } from '../../model/sesiones'
import { Segmentado } from '../../ui/base'
import { Icono } from '../../ui/Icono'

const POS: [Posicion, string][] = [['POR', 'Portero'], ['DEF', 'Defensa'], ['MED', 'Medio'], ['DEL', 'Delantero']]
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Escudo reducido a 256 px (PNG) para no cargar la base de datos ni el PDF. */
async function reducir(f: File): Promise<string> {
  const img = await createImageBitmap(f)
  const k = Math.min(1, 256 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k)
  c.height = Math.round(img.height * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}

function Plantilla() {
  const { repo, equipo } = useApp()
  const jugadores = (useTabla('jugadores') ?? []).filter((j) => j.equipoId === equipo!.id).sort((a, b) => a.dorsal - b.dorsal)
  const [lista, setLista] = useState('')
  const guardar = (j: Jugador, c: Partial<Jugador>) => repo.guardar('jugadores', { ...j, ...c })
  async function anadir() {
    const nombres = lista.split('\n').map((x) => x.trim()).filter(Boolean)
    let dorsal = Math.max(0, ...jugadores.map((j) => j.dorsal))
    for (const n of nombres.length ? nombres : ['Jugador nuevo']) await repo.guardar('jugadores', { ...repo.nuevaMeta(), equipoId: equipo!.id, nombre: n, dorsal: ++dorsal, posicion: 'MED', estado: 'disponible' })
    setLista('')
  }
  return (
    <div className="pila">
      <p className="ter" style={{ margin: 0 }}>Solo nombre, dorsal, posición y disponibilidad. Sesiones no guarda fechas de nacimiento, contactos ni el motivo de una baja.</p>
      <table className="tabla">
        <thead><tr><th>Dorsal</th><th>Nombre</th><th>Posición</th><th>Disponible</th><th /></tr></thead>
        <tbody>
          {jugadores.map((j) => (
            <tr key={j.id}>
              <td><input className="entrada num" style={{ width: 64 }} type="number" min={0} max={99} value={j.dorsal} onChange={(e) => guardar(j, { dorsal: Math.max(0, Math.min(99, Number(e.target.value))) })} aria-label={`Dorsal de ${j.nombre}`} /></td>
              <td><input className="entrada" value={j.nombre} onChange={(e) => guardar(j, { nombre: e.target.value })} aria-label="Nombre" /></td>
              <td><select className="entrada" value={j.posicion} onChange={(e) => guardar(j, { posicion: e.target.value as Posicion })} aria-label="Posición">{POS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></td>
              <td><input type="checkbox" checked={j.estado === 'disponible'} onChange={(e) => guardar(j, { estado: e.target.checked ? 'disponible' : 'no_disponible' })} style={{ width: 24, height: 24 }} aria-label={`${j.nombre} disponible`} /></td>
              <td><button className="btn-icono" aria-label={`Quitar a ${j.nombre}`} onClick={() => repo.papelera('jugadores', j.id)}><Icono n="papelera" t={18} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <label className="campo">Añadir jugadores (uno por línea)<textarea value={lista} onChange={(e) => setLista(e.target.value)} placeholder={'Leo\nMarta'} /></label>
      <button className="btn" onClick={anadir}><Icono n="mas" t={18} /> Añadir</button>
    </div>
  )
}

function CuerpoTecnico() {
  const { pro, equipo, aviso } = useApp()
  const [correo, setCorreo] = useState('')
  if (MODO_DEMO) return <p className="sec">Compartir con tu cuerpo técnico necesita cuentas en el servidor. En modo demostración no está disponible.</p>
  if (!pro) return <p className="sec">Con Pro, tus ayudantes ven y preparan las sesiones del equipo contigo. <a href={href({ n: 'planes' })}>Ver Pro</a></p>
  async function invitar() {
    const r = await supabase!.rpc('invitar_miembro', { eq: equipo!.id, correo, rol_nuevo: 'ayudante' })
    aviso(r.error ? r.error.message : 'Añadido al cuerpo técnico')
    if (!r.error) setCorreo('')
  }
  return (
    <div className="fila">
      <input className="entrada" style={{ flex: 1 }} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Correo de su cuenta FutbolLab" aria-label="Correo del ayudante" />
      <button className="btn" onClick={invitar} disabled={!correo.includes('@')}>Añadir ayudante</button>
    </div>
  )
}

export function Perfil({ seccion }: { seccion?: string }) {
  const { repo, usuario, setUsuario, equipo, setEquipoActivo, pro, tema, setTema, cerrarSesion, aviso } = useApp()
  const equipos = useTabla('equipos') ?? []
  const carpetas = useTabla('carpetas') ?? []
  const eq = equipo!
  const [nuevo, setNuevo] = useState('')
  const guardarEq = (c: Partial<typeof eq>) => repo.guardar('equipos', { ...eq, ...c })

  async function exportarDatos() {
    const datos: Record<string, unknown> = { exportadoEn: new Date().toISOString(), usuario }
    for (const t of TABLAS) datos[t] = await repo.listar(t, true)
    descargar(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }), 'mis-datos-futbollab-sesiones.json')
  }

  async function crearEquipo() {
    if (!nuevo.trim()) return
    const e = await repo.guardar('equipos', { ...repo.nuevaMeta(), nombre: nuevo.trim(), escudo: null, categoria: eq.categoria, modalidad: eq.modalidad, dias: eq.dias, hora: eq.hora, demo: false })
    setEquipoActivo(e.id)
    setNuevo('')
  }

  return (
    <div className="pila">
      {seccion === 'pro-ok' ? <div className="banda info">¡Bienvenido a Pro! Puede tardar unos segundos en activarse.</div> : null}
      <h1>Perfil</h1>

      <section className="tarjeta pila">
        <div className="fila entre"><h2>Tu cuenta</h2>{pro ? <span className="etiqueta pro">Pro</span> : <a className="btn" href={href({ n: 'planes' })}>Pasar a Pro</a>}</div>
        <label className="campo">Nombre<input value={usuario.nombre} onChange={(e) => setUsuario({ ...usuario, nombre: e.target.value })} onBlur={() => !MODO_DEMO && supabase!.from('profiles').update({ nombre: usuario.nombre }).eq('id', usuario.id)} /></label>
        <p className="ter" style={{ margin: 0 }}>{usuario.email}{MODO_DEMO ? ' · modo demostración (solo este dispositivo)' : ''}</p>
      </section>

      <section className="tarjeta pila" id="equipo">
        <h2>Equipo</h2>
        {equipos.length > 1 ? (
          <div className="chips">{equipos.map((e) => <button key={e.id} className="chip" aria-pressed={e.id === eq.id} onClick={() => setEquipoActivo(e.id)}>{e.nombre}</button>)}</div>
        ) : null}
        <div className="fila">
          {eq.escudo ? <img src={eq.escudo} alt="Escudo" width={56} height={56} style={{ objectFit: 'contain', borderRadius: 10, background: '#fff' }} /> : null}
          <label className="btn">Escudo<input type="file" accept="image/png,image/jpeg" className="oculto" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await guardarEq({ escudo: await reducir(f) }) }} /></label>
          {!pro ? <span className="ter">El escudo sale en los PDF con Pro.</span> : null}
        </div>
        <label className="campo">Nombre<input value={eq.nombre} onChange={(e) => guardarEq({ nombre: e.target.value })} /></label>
        <div className="fila">
          <label className="campo" style={{ flex: 1 }}>Categoría<select value={eq.categoria} onChange={(e) => guardarEq({ categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <label className="campo">Modalidad<select value={eq.modalidad} onChange={(e) => guardarEq({ modalidad: e.target.value as Modalidad })}>{['F7', 'F8', 'F11'].map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="campo" style={{ width: 120 }}>Hora<input type="time" value={eq.hora ?? ''} onChange={(e) => guardarEq({ hora: e.target.value || null })} /></label>
        </div>
        <div className="chips" aria-label="Días de entrenamiento">{DIAS.map((d, i) => <button key={d} className="chip" aria-pressed={eq.dias.includes(i + 1)} onClick={() => guardarEq({ dias: eq.dias.includes(i + 1) ? eq.dias.filter((x) => x !== i + 1) : [...eq.dias, i + 1].sort() })}>{d}</button>)}</div>
        <h3>Plantilla</h3>
        <Plantilla />
        <h3>Cuerpo técnico</h3>
        <CuerpoTecnico />
        <div className="fila">
          <input className="entrada" style={{ flex: 1 }} value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre de otro equipo" aria-label="Nuevo equipo" />
          <button className="btn" onClick={crearEquipo} disabled={!nuevo.trim()}>Crear otro equipo</button>
        </div>
        {eq.demo ? <button className="btn peligro" onClick={async () => { await repo.papelera('equipos', eq.id); const otro = equipos.find((e) => e.id !== eq.id); if (otro) setEquipoActivo(otro.id); aviso('Equipo de ejemplo en la papelera') }}>Quitar el equipo de ejemplo</button> : null}
      </section>

      <section className="tarjeta pila">
        <h2>Ajustes</h2>
        <div className="fila entre"><span>Tema</span><Segmentado etiqueta="Tema" valor={tema} cambiar={setTema} opciones={[['oscuro', 'Pizarra nocturna'], ['claro', 'Claro']]} /></div>
        <p className="ter" style={{ margin: 0 }}>El modo campo (botones un 40 % más grandes y contraste máximo) se activa solo al empezar un entrenamiento.</p>
        {carpetas.length ? <><h3>Carpetas</h3><div className="fila">{carpetas.map((c) => <span key={c.id} className="chip"><i style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.nombre}<button className="btn-icono" style={{ width: 28, height: 28 }} aria-label={`Borrar carpeta ${c.nombre}`} onClick={() => repo.papelera('carpetas', c.id)}><Icono n="cerrar" t={14} /></button></span>)}</div></> : null}
      </section>

      <section className="tarjeta pila">
        <h2>Tus datos</h2>
        <div className="acciones">
          <a className="btn" href={href({ n: 'papelera' })}><Icono n="papelera" t={18} /> Papelera</a>
          <button className="btn" onClick={exportarDatos}><Icono n="descargar" t={18} /> Descargar mis datos</button>
          <a className="btn" href="/privacidad.html" target="_blank" rel="noopener">Privacidad</a>
          <button className="btn" onClick={cerrarSesion}>Cerrar sesión</button>
          <button className="btn peligro" onClick={async () => {
            if (!confirm('Se borrarán tu cuenta y todos tus datos. No se puede deshacer. ¿Seguro?')) return
            try { await borrarCuenta(); await cerrarSesion() } catch (x) { aviso((x as Error).message) }
          }}>Borrar mi cuenta</button>
        </div>
        <p className="ter" style={{ margin: 0 }}>Cerrar sesión borra los datos de este dispositivo.{MODO_DEMO ? ' En modo demostración no hay copia en servidor: se pierden.' : ' Lo no sincronizado se intenta subir antes.'}</p>
      </section>
    </div>
  )
}
