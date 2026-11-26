import { useMemo, useRef, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href, ir, volver } from '../../app/router'
import { FASES, TIPOS, BLOQUES } from '../../data/taxonomia'
import type { Carpeta } from '../../model/sesiones'
import { EtiquetaOrigen, Hoja, Intensidad, Vacio, fechaCorta } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import { Pizarra } from '../pizarra/Pizarra'
import { guardarPreferencia, usePreferencias } from '../biblioteca/comun'
import { anadirASesion, bloqueSugerido, duplicarComoPropio } from './acciones'
import { minutosEjercicio } from '../../logic/carga'
import { hoy } from '../../logic/id'
import { compartirArchivo, enlaceWhatsApp, nombreArchivo } from '../../lib/exportar/compartir'
import { Historial } from '../perfil/Historial'
import { Notas } from '../campo/Notas'

const COLORES = ['#1F9D55', '#5AB4E5', '#F2C230', '#FF7A2F', '#9B8CFF', '#E0645C']

export function Ficha({ id }: { id: string }) {
  const { repo, usuario, pro, equipo, aviso } = useApp()
  const todos = useTabla('ejercicios', true)
  const sesiones = useTabla('sesiones')
  const carpetas = useTabla('carpetas')
  const prefs = usePreferencias()
  const [hoja, setHoja] = useState<null | 'sesion' | 'carpeta' | 'historial'>(null)
  const [nuevaCarpeta, setNuevaCarpeta] = useState('')
  const caja = useRef<HTMLDivElement>(null)
  const e = todos?.find((x) => x.id === id)
  const pref = prefs.get(`ejercicio:${id}`)
  const plan = pro ? 'pro' : 'gratis'
  const proximas = useMemo(() => (sesiones ?? []).filter((s) => s.equipoId === equipo!.id && s.estado === 'planificada' && s.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha)), [sesiones, equipo])

  if (!todos) return <div className="vacio">Cargando…</div>
  if (!e || (e.eliminadoEn && e.creadoPor !== usuario.id)) return <Vacio icono="biblioteca"><p>Este ejercicio ya no está en tu biblioteca.</p><a className="btn" href="#biblioteca">Ir a la biblioteca</a></Vacio>
  const mio = e.origen === 'propio' && e.creadoPor === usuario.id
  const ctx = { equipo: equipo!, pro, autor: usuario.nombre }

  async function copiar(sufijo: string) {
    try {
      const c = await duplicarComoPropio(repo, e!, plan, todos!, usuario.id, usuario.nombre, sufijo)
      aviso('Copia creada en tus ejercicios')
      ir({ n: 'ejercicio-editar', id: c.id })
    } catch (x) {
      aviso((x as Error).message, { texto: 'Ver Pro', hacer: () => ir({ n: 'planes' }) })
    }
  }

  async function pdf() {
    const { pdfEjercicio } = await import('../../lib/exportar/pdf')
    const r = await compartirArchivo(await pdfEjercicio(e!, ctx), `${nombreArchivo(e!.titulo)}.pdf`, e!.titulo)
    if (r === 'descargado') aviso('PDF descargado')
  }

  async function imagen() {
    const svg = caja.current?.querySelector('svg.pizarra') as SVGSVGElement | null
    if (!svg) return
    const { svgAPng } = await import('../../lib/exportar/imagen')
    const png = await svgAPng(svg, 1200, pro ? `${e!.titulo} · ${equipo!.nombre}` : `${e!.titulo} · FutbolLab Sesiones`)
    const r = await compartirArchivo(png, `${nombreArchivo(e!.titulo)}.png`, e!.titulo)
    if (r === 'descargado') aviso('Imagen descargada')
  }

  async function alternarCarpeta(c: Carpeta) {
    const ids = e!.carpetaIds.includes(c.id) ? e!.carpetaIds.filter((x) => x !== c.id) : [...e!.carpetaIds, c.id]
    await repo.guardar('ejercicios', { ...e!, carpetaIds: ids })
  }

  async function crearCarpeta() {
    if (!nuevaCarpeta.trim()) return
    const c = await repo.guardar('carpetas', { ...repo.nuevaMeta(), nombre: nuevaCarpeta.trim(), color: COLORES[(carpetas?.length ?? 0) % COLORES.length] })
    setNuevaCarpeta('')
    await repo.guardar('ejercicios', { ...e!, carpetaIds: [...e!.carpetaIds, c.id] })
  }

  const resumen = `${e.titulo}\n${e.objetivo}\n\nOrganización: ${e.organizacion}\nConsignas: ${e.consignas.join(' · ')}\n\nFutbolLab Sesiones`

  return (
    <article className="ficha">
      <div className="fila entre">
        <button className="btn fantasma" onClick={() => volver({ n: 'biblioteca' })}><Icono n="atras" t={18} /> Volver</button>
        <div className="fila">
          <button className={`btn-icono${pref?.favorito ? ' activo' : ''}`} aria-pressed={!!pref?.favorito} aria-label="Favorito" onClick={() => guardarPreferencia(repo, prefs, 'ejercicio', e.id, { favorito: !pref?.favorito })}><Icono n="estrella" relleno={pref?.favorito} /></button>
          {mio ? <a className="btn" href={href({ n: 'ejercicio-editar', id: e.id })}><Icono n="editar" t={18} /> Editar</a> : null}
        </div>
      </div>

      <div className="dos-col" style={{ marginTop: 12 }}>
        <div ref={caja}>
          <Pizarra p={e.pizarra} titulo={e.titulo} auto={e.pizarra.fases.length > 1} />
        </div>
        <div>
          <div className="fila" style={{ gap: 6 }}>
            <EtiquetaOrigen origen={e.origen} /><span className="etiqueta">{TIPOS[e.tipo]}</span><span className="etiqueta">{FASES[e.faseJuego]}</span>
            {e.eliminadoEn ? <span className="etiqueta demo">En la papelera</span> : null}
          </div>
          <h1 style={{ marginTop: 8 }}>{e.titulo}</h1>
          <p className="sec" style={{ fontSize: '1.05em' }}>{e.objetivo}</p>
          <p className="ter">{e.autor} · {e.principio}{e.tecnica.length ? ` · ${e.tecnica.join(', ')}` : ''}</p>
          <div className="datos-ficha">
            <div><b>{e.jugadoresMin}–{e.jugadoresMax}</b><span>jugadores</span></div>
            <div><b>{e.espacio.ancho}×{e.espacio.largo}</b><span>metros</span></div>
            <div><b>{e.series}×{e.duracion}′</b><span>series × min</span></div>
            <div><b>{minutosEjercicio(e)}′</b><span>total</span></div>
            <div><b>{e.edadMin}–{e.edadMax > 20 ? '+' : e.edadMax}</b><span>años</span></div>
            <div><b style={{ fontSize: '1em', paddingTop: 6 }}><Intensidad v={e.intensidad} /></b><span>intensidad {e.intensidad}/5</span></div>
          </div>
          <div className="acciones" style={{ marginTop: 14 }}>
            <button className="btn primario" onClick={() => setHoja('sesion')}><Icono n="mas" t={18} /> Añadir a sesión</button>
            <button className="btn" onClick={() => copiar('(variante)')}>Crear variante</button>
            <button className="btn" onClick={() => setHoja('carpeta')}><Icono n="carpeta" t={18} /> Carpeta</button>
            <button className="btn" onClick={pdf}><Icono n="pdf" t={18} /> PDF</button>
            <button className="btn" onClick={imagen}><Icono n="imagen" t={18} /> Imagen</button>
            <a className="btn" href={enlaceWhatsApp(resumen)} target="_blank" rel="noopener"><Icono n="whatsapp" t={18} /> WhatsApp</a>
            {!mio ? <button className="btn" onClick={() => copiar('(copia)')}><Icono n="copiar" t={18} /> Duplicar</button> : null}
          </div>
          <div className="fila" style={{ marginTop: 12 }} role="group" aria-label="Valoración">
            <span className="ter">Tu valoración</span>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} className="btn-icono" style={{ width: 36, height: 36, color: (pref?.valoracion ?? 0) >= v ? 'var(--amber)' : undefined }} aria-label={`${v} de 5`} aria-pressed={pref?.valoracion === v} onClick={() => guardarPreferencia(repo, prefs, 'ejercicio', e.id, { valoracion: pref?.valoracion === v ? null : v })}>
                <Icono n="estrella" t={18} relleno={(pref?.valoracion ?? 0) >= v} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dos-col">
        <div>
          <section><h2>Organización</h2><p>{e.organizacion}</p></section>
          <section><h2>Desarrollo</h2><p>{e.desarrollo}</p></section>
          {e.reglas.length ? <section><h2>Reglas</h2><ul>{e.reglas.map((x) => <li key={x}>{x}</li>)}</ul></section> : null}
          <section><h2>Variantes</h2>
            <ul>{e.variantes.facil.map((x) => <li key={x}><strong>Más fácil:</strong> {x}</li>)}{e.variantes.dificil.map((x) => <li key={x}><strong>Más difícil:</strong> {x}</li>)}</ul>
          </section>
        </div>
        <div>
          <section><h2>Consignas</h2><ul>{e.consignas.map((x) => <li key={x}>{x}</li>)}</ul></section>
          <section><h2>Errores típicos</h2><ul>{e.errores.map((x) => <li key={x}>{x}</li>)}</ul></section>
          <section><h2>Material</h2><p>{e.material.join(' · ') || '—'}</p></section>
          {e.video ? <section><h2>Vídeo</h2><a href={e.video} target="_blank" rel="noopener noreferrer">Ver vídeo</a></section> : null}
          <section><h2>Notas</h2><Notas ejercicioId={e.id} /></section>
          {mio ? (
            <section className="fila">
              <button className="btn" onClick={() => setHoja('historial')}><Icono n="historial" t={18} /> Historial</button>
              {e.eliminadoEn ? (
                <button className="btn" onClick={() => repo.restaurar('ejercicios', e.id)}>Recuperar</button>
              ) : (
                <button className="btn peligro" onClick={async () => { await repo.papelera('ejercicios', e.id); aviso('Ejercicio en la papelera (30 días)', { texto: 'Deshacer', hacer: () => void repo.restaurar('ejercicios', e.id) }); ir({ n: 'biblioteca' }) }}><Icono n="papelera" t={18} /> Papelera</button>
              )}
              <button className="btn" onClick={() => repo.archivar('ejercicios', e.id, !e.archivado)}>{e.archivado ? 'Desarchivar' : 'Archivar'}</button>
            </section>
          ) : null}
        </div>
      </div>

      <Hoja titulo="Añadir a una sesión" abierta={hoja === 'sesion'} cerrar={() => setHoja(null)}>
        <div className="pila">
          {proximas.map((s) => (
            <div key={s.id} className="tarjeta pila">
              <div className="fila entre"><strong>{s.objetivo || 'Sesión'}</strong><span className="ter">{fechaCorta(s.fecha)}</span></div>
              <div className="chips">
                {BLOQUES.map((b) => (
                  <button key={b.tipo} className="chip" aria-pressed={bloqueSugerido(e, s) === b.tipo} onClick={async () => { await anadirASesion(repo, s, e, b.tipo); setHoja(null); aviso(`Añadido a ${b.nombre}`, { texto: 'Abrir sesión', hacer: () => ir({ n: 'sesion', id: s.id }) }) }}>{b.nombre}</button>
                ))}
              </div>
            </div>
          ))}
          <a className="btn primario ancho" href={href({ n: 'sesion', id: 'nueva' })} onClick={() => sessionStorage.setItem('ejercicioNuevo', e.id)}><Icono n="mas" t={18} /> Nueva sesión con este ejercicio</a>
        </div>
      </Hoja>

      <Hoja titulo="Carpetas" abierta={hoja === 'carpeta'} cerrar={() => setHoja(null)}>
        <div className="pila">
          {!mio ? <p className="ter" style={{ margin: 0 }}>Para ordenar un ejercicio de la biblioteca en tus carpetas, se guarda una copia en tus ejercicios.</p> : null}
          {(carpetas ?? []).map((c) => (
            <label key={c.id} className="fila tarjeta" style={{ padding: 12 }}>
              <input type="checkbox" checked={e.carpetaIds.includes(c.id)} disabled={!mio} onChange={() => alternarCarpeta(c)} style={{ width: 22, height: 22 }} />
              <i style={{ width: 14, height: 14, borderRadius: 4, background: c.color }} /> {c.nombre}
            </label>
          ))}
          {mio ? (
            <div className="fila">
              <input className="entrada" style={{ flex: 1 }} placeholder="Nueva carpeta" value={nuevaCarpeta} onChange={(x) => setNuevaCarpeta(x.target.value)} aria-label="Nombre de la carpeta" />
              <button className="btn" onClick={crearCarpeta} disabled={!nuevaCarpeta.trim()}>Crear</button>
            </div>
          ) : (
            <button className="btn primario" onClick={() => copiar('(copia)')}>Guardar una copia en mis ejercicios</button>
          )}
        </div>
      </Hoja>

      <Hoja titulo="Historial de cambios" abierta={hoja === 'historial'} cerrar={() => setHoja(null)}>
        <Historial filaId={e.id} />
      </Hoja>
    </article>
  )
}

