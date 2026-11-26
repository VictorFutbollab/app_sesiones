import { useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href } from '../../app/router'
import { CATEGORIAS } from '../../data/taxonomia'
import type { Jugador, Modalidad, Posicion } from '../../model/comun'
import { MODO_DEMO, supabase } from '../../lib/supabase/cliente'
import { borrarCuenta } from '../../lib/cuenta'
import { descargar } from '../../lib/exportar/compartir'
import { TABLAS } from '../../model/sesiones'
import { Cabecera, FilaLista, Seccion, Segmentado } from '../../ui/base'
import { AvatarFutbol } from '../../ui/Marca'
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
    <>
      <p className="sec">Solo nombre, dorsal, posición y disponibilidad. Sesiones no guarda fechas de nacimiento, contactos ni el motivo de una baja.</p>
      <div>
        {jugadores.map((j) => (
          <div key={j.id} className={`plantilla-fila${j.estado === 'disponible' ? '' : ' baja'}`}>
            <input className="entrada num p-dorsal" type="number" inputMode="numeric" min={0} max={99} value={j.dorsal} onChange={(e) => guardar(j, { dorsal: Math.max(0, Math.min(99, Number(e.target.value))) })} aria-label={`Dorsal de ${j.nombre}`} />
            <input className="entrada p-nombre" value={j.nombre} onChange={(e) => guardar(j, { nombre: e.target.value })} aria-label={`Nombre del dorsal ${j.dorsal}`} />
            <select className="entrada p-pos" value={j.posicion} onChange={(e) => guardar(j, { posicion: e.target.value as Posicion })} aria-label={`Posición de ${j.nombre}`}>{POS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
            <label className="interruptor p-disp"><input type="checkbox" checked={j.estado === 'disponible'} onChange={(e) => guardar(j, { estado: e.target.checked ? 'disponible' : 'no_disponible' })} aria-label={`${j.nombre} disponible`} />{j.estado === 'disponible' ? 'Disponible' : 'No disponible'}</label>
            <button className="btn-icono p-quitar" aria-label={`Quitar a ${j.nombre}`} onClick={() => repo.papelera('jugadores', j.id)}><Icono n="papelera" t={18} /></button>
          </div>
        ))}
      </div>
      <label className="campo">Añadir jugadores (uno por línea)<textarea value={lista} onChange={(e) => setLista(e.target.value)} placeholder={'Leo\nMarta'} /></label>
      <button className="btn" onClick={anadir}><Icono n="mas" t={18} /> Añadir a la plantilla</button>
    </>
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
  const nJug = (useTabla('jugadores') ?? []).filter((j) => j.equipoId === equipo!.id && !j.eliminadoEn).length
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
    <div>
      <Cabecera titulo="Mi perfil" sub="Los cambios se guardan solos" />
      {seccion === 'pro-ok' ? <div className="banda info">¡Bienvenido a Pro! Puede tardar unos segundos en activarse.</div> : null}

      <Seccion>
        <div className="perfil-cab">
          <AvatarFutbol size={84} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong>{usuario.nombre}</strong>
            <span className="sec">{usuario.email}</span>
          </div>
          {pro ? <span className="etiqueta pro">Pro</span> : null}
        </div>
        {!pro ? <a className="btn amarillo ancho" href={href({ n: 'planes' })}><Icono n="chispa" t={18} /> Pasar a Pro</a> : null}
      </Seccion>

      <div className="dos-col">
        <div>
          <Seccion titulo="Tus datos">
            <label className="campo">Nombre y apellidos<input value={usuario.nombre} onChange={(e) => setUsuario({ ...usuario, nombre: e.target.value })} onBlur={() => !MODO_DEMO && supabase!.from('profiles').update({ nombre: usuario.nombre }).eq('id', usuario.id)} /></label>
            <label className="campo">Email<input value={usuario.email} readOnly /></label>
            {MODO_DEMO ? <p className="ter">Modo demostración: todo se guarda solo en este dispositivo.</p> : null}
          </Seccion>

          <Seccion titulo="Tu equipo" id="equipo" extra={eq.escudo ? <img src={eq.escudo} alt="Escudo" width={44} height={44} style={{ objectFit: 'contain', borderRadius: 10, background: '#fff' }} /> : null}>
            {equipos.length > 1 ? (
              <div className="chips">{equipos.map((e) => <button key={e.id} className="chip" aria-pressed={e.id === eq.id} onClick={() => setEquipoActivo(e.id)}>{e.nombre}</button>)}</div>
            ) : null}
            <label className="campo">Nombre del equipo<input value={eq.nombre} onChange={(e) => guardarEq({ nombre: e.target.value })} /></label>
            <div className="fila-campos" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="campo">Categoría<select value={eq.categoria} onChange={(e) => guardarEq({ categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
              <label className="campo">Hora<input type="time" value={eq.hora ?? ''} onChange={(e) => guardarEq({ hora: e.target.value || null })} /></label>
            </div>
            <div className="campo"><span>Modalidad</span><Segmentado lleno etiqueta="Modalidad" valor={eq.modalidad} cambiar={(m) => guardarEq({ modalidad: m as Modalidad })} opciones={[['F7', 'Fútbol 7'], ['F8', 'Fútbol 8'], ['F11', 'Fútbol 11']]} /></div>
            <div className="campo"><span>Días de entrenamiento</span>
              <div className="chips" aria-label="Días de entrenamiento">{DIAS.map((d, i) => <button key={d} className="chip" aria-pressed={eq.dias.includes(i + 1)} onClick={() => guardarEq({ dias: eq.dias.includes(i + 1) ? eq.dias.filter((x) => x !== i + 1) : [...eq.dias, i + 1].sort() })}>{d}</button>)}</div>
            </div>
            <label className="btn"><Icono n="imagen" t={18} /> {eq.escudo ? 'Cambiar escudo' : 'Subir escudo'}<input type="file" accept="image/png,image/jpeg" className="oculto" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await guardarEq({ escudo: await reducir(f) }) }} /></label>
            {!pro ? <p className="ter">El escudo sale en los PDF con Pro.</p> : null}
          </Seccion>

          <Seccion titulo="Cuerpo técnico"><CuerpoTecnico /></Seccion>

          <Seccion titulo="Tus equipos">
            <div className="fila">
              <input className="entrada" style={{ flex: 1, minWidth: 0 }} value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre de otro equipo" aria-label="Nuevo equipo" />
              <button className="btn" onClick={crearEquipo} disabled={!nuevo.trim()}><Icono n="mas" t={18} /> Crear equipo</button>
            </div>
            {eq.demo ? <button className="btn peligro-borde" onClick={async () => { await repo.papelera('equipos', eq.id); const otro = equipos.find((e) => e.id !== eq.id); if (otro) setEquipoActivo(otro.id); aviso('Equipo de ejemplo en la papelera') }}>Quitar el equipo de ejemplo</button> : null}
          </Seccion>
        </div>

        <div>
          <Seccion titulo="Plantilla" extra={<span className="recuento num">{nJug}</span>}><Plantilla /></Seccion>

          <Seccion titulo="Apariencia">
            <Segmentado lleno etiqueta="Tema" valor={tema} cambiar={setTema} opciones={[['claro', 'Claro'], ['oscuro', 'Oscuro']]} />
            <p className="ter">En el entrenamiento, botones y letra se agrandan solos para usarlos con el móvil en la mano.</p>
          </Seccion>

          {carpetas.length ? (
            <Seccion titulo="Carpetas">
              <div className="chips" style={{ flexWrap: 'wrap' }}>{carpetas.map((c) => <span key={c.id} className="chip"><i style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />{c.nombre}<button className="btn-icono" style={{ width: 28, height: 28 }} aria-label={`Borrar carpeta ${c.nombre}`} onClick={() => repo.papelera('carpetas', c.id)}><Icono n="cerrar" t={14} /></button></span>)}</div>
            </Seccion>
          ) : null}

          <Seccion titulo="Privacidad y datos" className="lista">
            <FilaLista href={href({ n: 'papelera' })} izq={<span className="icono-cuadro"><Icono n="papelera" t={20} /></span>} titulo="Papelera" sub="Lo borrado se guarda 30 días" der={<Icono n="adelante" t={18} />} />
            <FilaLista onClick={exportarDatos} izq={<span className="icono-cuadro"><Icono n="descargar" t={20} /></span>} titulo="Descargar mis datos" sub="Todo en un archivo JSON" der={<Icono n="adelante" t={18} />} />
            <a className="fila-lista" href="/privacidad.html" target="_blank" rel="noopener"><span className="fl-izq"><span className="icono-cuadro"><Icono n="candado" t={20} /></span></span><span className="fl-txt"><strong>Política de privacidad</strong><span className="sec">Qué guardamos y para qué</span></span><span className="fl-der"><Icono n="adelante" t={18} /></span></a>
          </Seccion>
        </div>
      </div>

      <button className="btn peligro-borde grande ancho" onClick={cerrarSesion}><Icono n="salir" /> Cerrar sesión</button>
      <p className="pie-app">Cerrar sesión borra los datos de este dispositivo.{MODO_DEMO ? ' En modo demostración no hay copia en servidor: se pierden.' : ' Lo no sincronizado se intenta subir antes.'}</p>
      <button className="enlace-peligro" onClick={async () => {
        if (!confirm('Se borrarán tu cuenta y todos tus datos. No se puede deshacer. ¿Seguro?')) return
        try { await borrarCuenta(); await cerrarSesion() } catch (x) { aviso((x as Error).message) }
      }}>Eliminar mi cuenta</button>
      <p className="pie-app">FutbolLab Sesiones{pro ? ' · Pro' : ' · Gratis'}</p>
    </div>
  )
}
