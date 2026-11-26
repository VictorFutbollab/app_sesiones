import { useMemo, useRef, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href, ir, volver } from '../../app/router'
import { FASES, TIPOS, BLOQUES } from '../../data/taxonomia'
import type { Carpeta } from '../../model/sesiones'
import { Cabecera, Dato, EtiquetaOrigen, FilaLista, Hoja, Intensidad, Redondo, Seccion, Vacio, fechaCorta } from '../../ui/base'
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
      <Cabecera titulo={e.titulo} sub={`${TIPOS[e.tipo]} · ${FASES[e.faseJuego]}`} atras={() => volver({ n: 'biblioteca' })}>
        {mio ? <Redondo icono="editar" etiqueta="Editar" href={href({ n: 'ejercicio-editar', id: e.id })} /> : null}
        <Redondo icono="estrella" etiqueta={pref?.favorito ? 'Quitar de favoritos' : 'Añadir a favoritos'} activo={!!pref?.favorito} onClick={() => guardarPreferencia(repo, prefs, 'ejercicio', e.id, { favorito: !pref?.favorito })} />
      </Cabecera>

      <div className="dos-col">
        <div>
          <div className="ficha-pizarra" ref={caja}>
            <Pizarra p={e.pizarra} titulo={e.titulo} auto={e.pizarra.fases.length > 1} />
          </div>
          <div className="etiquetas" style={{ marginTop: 12 }}>
            <EtiquetaOrigen origen={e.origen} /><span className="etiqueta">{e.principio}</span>
            {e.eliminadoEn ? <span className="etiqueta demo">En la papelera</span> : null}
          </div>
          {e.objetivo ? <p style={{ fontSize: '1.08em', margin: '10px 0 0' }}>{e.objetivo}</p> : null}

          <Seccion>
            <button className="btn primario grande ancho" onClick={() => setHoja('sesion')}><Icono n="mas" /> Añadir a una sesión</button>
            <div className="fila-redondos">
              <Redondo texto icono="pdf" etiqueta="PDF" onClick={pdf} />
              <Redondo texto icono="imagen" etiqueta="Imagen" onClick={imagen} />
              <Redondo texto icono="whatsapp" etiqueta="WhatsApp" href={enlaceWhatsApp(resumen)} nueva />
              <Redondo texto icono="carpeta" etiqueta="Carpeta" onClick={() => setHoja('carpeta')} />
              <Redondo texto icono="copiar" etiqueta="Variante" onClick={() => copiar('(variante)')} />
            </div>
          </Seccion>
        </div>

        <div>
          <Seccion titulo="De un vistazo">
            <div className="datos-t">
              <Dato etiqueta="Jugadores" valor={`${e.jugadoresMin}–${e.jugadoresMax}`} />
              <Dato etiqueta="Espacio" valor={`${e.espacio.ancho}×${e.espacio.largo}`} extra="metros" />
              <Dato etiqueta="Duración" valor={`${minutosEjercicio(e)}′`} extra={`${e.series} × ${e.duracion}′`} />
              <Dato etiqueta="Edad" valor={`${e.edadMin}–${e.edadMax > 20 ? '+' : e.edadMax}`} extra="años" />
              <Dato etiqueta="Intensidad" valor={<Intensidad v={e.intensidad} />} extra={`${e.intensidad} de 5`} />
              <Dato etiqueta="Material" valor={e.material.length || '—'} extra={e.material.join(', ') || 'sin material'} />
            </div>
          </Seccion>
          <Seccion titulo="Tu valoración">
            <div className="estrellas" role="group" aria-label="Valoración">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} className={(pref?.valoracion ?? 0) >= v ? 'on' : ''} aria-label={`${v} de 5`} aria-pressed={pref?.valoracion === v} onClick={() => guardarPreferencia(repo, prefs, 'ejercicio', e.id, { valoracion: pref?.valoracion === v ? null : v })}>
                  <Icono n="estrella" relleno={(pref?.valoracion ?? 0) >= v} />
                </button>
              ))}
            </div>
            <p className="ter">{e.autor}{e.tecnica.length ? ` · ${e.tecnica.join(', ')}` : ''}</p>
          </Seccion>
        </div>
      </div>

      <div className="dos-col">
        <Seccion titulo="Cómo se monta">
          <h3>Organización</h3><p>{e.organizacion || '—'}</p>
          <h3>Desarrollo</h3><p>{e.desarrollo || '—'}</p>
          {e.reglas.length ? <><h3>Reglas</h3><ul>{e.reglas.map((x) => <li key={x}>{x}</li>)}</ul></> : null}
          {e.variantes.facil.length + e.variantes.dificil.length ? (
            <><h3>Variantes</h3><ul>{e.variantes.facil.map((x) => <li key={x}><strong>Más fácil:</strong> {x}</li>)}{e.variantes.dificil.map((x) => <li key={x}><strong>Más difícil:</strong> {x}</li>)}</ul></>
          ) : null}
          {e.video ? <a className="btn" href={e.video} target="_blank" rel="noopener noreferrer"><Icono n="play" t={18} /> Ver vídeo</a> : null}
        </Seccion>
        <Seccion titulo="Para el entrenador">
          <h3>Consignas</h3>{e.consignas.length ? <ul>{e.consignas.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="sec">—</p>}
          <h3>Errores típicos</h3>{e.errores.length ? <ul>{e.errores.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="sec">—</p>}
        </Seccion>
      </div>

      <Seccion titulo="Notas"><Notas ejercicioId={e.id} /></Seccion>

      {mio ? (
        <Seccion>
          <FilaLista izq={<span className="icono-cuadro"><Icono n="historial" t={20} /></span>} titulo="Historial de cambios" der={<Icono n="adelante" t={18} />} onClick={() => setHoja('historial')} />
          <FilaLista izq={<span className="icono-cuadro"><Icono n="archivar" t={20} /></span>} titulo={e.archivado ? 'Desarchivar' : 'Archivar'} sub="Lo quita de la biblioteca sin borrarlo" onClick={() => repo.archivar('ejercicios', e.id, !e.archivado)} />
          {e.eliminadoEn ? (
            <FilaLista izq={<span className="icono-cuadro"><Icono n="reiniciar" t={20} /></span>} titulo="Recuperar de la papelera" onClick={() => repo.restaurar('ejercicios', e.id)} />
          ) : (
            <button className="btn peligro-borde ancho" onClick={async () => { await repo.papelera('ejercicios', e.id); aviso('Ejercicio en la papelera (30 días)', { texto: 'Deshacer', hacer: () => void repo.restaurar('ejercicios', e.id) }); ir({ n: 'biblioteca' }) }}><Icono n="papelera" t={18} /> Mover a la papelera</button>
          )}
        </Seccion>
      ) : (
        <button className="btn ancho" onClick={() => copiar('(copia)')}><Icono n="copiar" t={18} /> Guardar una copia en mis ejercicios</button>
      )}

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

