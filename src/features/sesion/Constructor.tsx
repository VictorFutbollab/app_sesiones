import { useEffect, useMemo, useRef, useState, type PointerEvent as PE } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { href, ir, volver } from '../../app/router'
import type { Bloque, Ejercicio, Sesion, TipoBloque } from '../../model/sesiones'
import { BLOQUES, PRINCIPIOS, TIPOS, nombreBloque } from '../../data/taxonomia'
import { cargaEstimada, duracionTotal, minutosEjercicio, nivelCarga } from '../../logic/carga'
import { puedeGuardarSesion } from '../../logic/planes'
import { hoy, sumarDias, uuid } from '../../logic/id'
import { filtrar, FILTROS_VACIOS } from '../../logic/filtros'
import { mover, ORDEN_BLOQUES } from '../../logic/bloques'
import { Hoja, Paso, Vacio, fechaLarga, Intensidad } from '../../ui/base'
import { Icono } from '../../ui/Icono'
import { Pizarra } from '../pizarra/Pizarra'
import { TarjetaEjercicio, edadEquipo, useBiblioteca } from '../biblioteca/comun'
import { Asistente } from './Asistente'
import { Historial } from '../perfil/Historial'
import { compartirArchivo, enlaceWhatsApp, nombreArchivo } from '../../lib/exportar/compartir'

const ORDEN = ORDEN_BLOQUES

export function Constructor({ id }: { id: string }) {
  const { repo, usuario, pro, equipo, aviso } = useApp()
  const sesiones = useTabla('sesiones', true)
  const jugadores = useTabla('jugadores')
  const biblioteca = useBiblioteca()
  const [elegir, setElegir] = useState<TipoBloque | null>(null)
  const [asistente, setAsistente] = useState(false)
  const [historial, setHistorial] = useState(false)
  const [q, setQ] = useState('')
  const [arrastre, setArrastre] = useState<{ id: string; x: number; y: number; destino: TipoBloque | null; indice: number } | null>(null)
  const [objetivoMin, setObjetivoMin] = useState(75)
  const creando = useRef(false)
  const eq = equipo!
  const s = sesiones?.find((x) => x.id === id)
  const ejMap = useMemo(() => new Map((biblioteca ?? []).map((e) => [e.id, e])), [biblioteca])
  const disponibles = (jugadores ?? []).filter((j) => j.equipoId === eq.id && j.estado === 'disponible').length

  // Nueva sesión: se crea al entrar (respetando el límite del plan) y se sustituye la ruta.
  useEffect(() => {
    if (id !== 'nueva' || !sesiones || creando.current) return
    creando.current = true
    const b = puedeGuardarSesion(pro ? 'pro' : 'gratis', sesiones, usuario.id)
    if (b) {
      aviso(b.motivo, { texto: 'Ver Pro', hacer: () => ir({ n: 'planes' }) })
      ir({ n: 'sesiones' }, true)
      return
    }
    const fecha = sessionStorage.getItem('fechaNueva') ?? sumarDias(hoy(), 1)
    const ejId = sessionStorage.getItem('ejercicioNuevo')
    const abrir = sessionStorage.getItem('abrirAsistente')
    sessionStorage.removeItem('fechaNueva')
    sessionStorage.removeItem('ejercicioNuevo')
    sessionStorage.removeItem('abrirAsistente')
    const e = ejId ? ejMap.get(ejId) : undefined
    const nueva: Sesion = {
      ...repo.nuevaMeta(), equipoId: eq.id, fecha, hora: eq.hora, objetivo: '', estado: 'planificada', asistente: false,
      bloques: e ? [{ id: uuid(), tipo: e.tipo === 'activacion' ? 'activacion' : e.tipo === 'vuelta_calma' ? 'calma' : 'principal1', orden: 0, ejercicioId: e.id, minutos: minutosEjercicio(e) }] : [],
    }
    void repo.guardar('sesiones', nueva).then(() => {
      if (abrir) sessionStorage.setItem('abrirAsistente-' + nueva.id, '1')
      ir({ n: 'sesion', id: nueva.id }, true)
    })
  }, [id, sesiones, pro, usuario.id, repo, eq, ejMap, aviso])

  useEffect(() => {
    if (s && sessionStorage.getItem('abrirAsistente-' + s.id)) {
      sessionStorage.removeItem('abrirAsistente-' + s.id)
      setAsistente(true)
    }
  }, [s])

  if (!sesiones || !biblioteca || id === 'nueva') return <div className="vacio">Preparando la sesión…</div>
  if (!s) return <Vacio icono="sesiones"><p>Esta sesión ya no existe.</p><a className="btn" href="#sesiones">Mis sesiones</a></Vacio>

  const guardar = (c: Partial<Sesion>) => repo.guardar('sesiones', { ...s, ...c })
  const total = duracionTotal(s.bloques)
  const carga = cargaEstimada(s.bloques, ejMap)
  const ctx = { equipo: eq, pro, autor: usuario.nombre }

  function anadir(e: Ejercicio, tipo: TipoBloque) {
    const orden = s!.bloques.filter((b) => b.tipo === tipo).length
    void guardar({ bloques: [...s!.bloques, { id: uuid(), tipo, orden, ejercicioId: e.id, minutos: minutosEjercicio(e) }] })
    setElegir(null)
    setQ('')
  }

  // ── Arrastrar y soltar (táctil y ratón) ──
  function empezarArrastre(b: Bloque, ev: PE<HTMLButtonElement>) {
    ev.preventDefault()
    ;(ev.currentTarget as Element).setPointerCapture(ev.pointerId)
    setArrastre({ id: b.id, x: ev.clientX, y: ev.clientY, destino: b.tipo, indice: b.orden })
  }
  function moverArrastre(ev: PE<HTMLButtonElement>) {
    if (!arrastre) return
    const el = document.elementFromPoint(ev.clientX, ev.clientY)
    const bloque = el?.closest('[data-bloque]') as HTMLElement | null
    let indice = 0
    if (bloque) {
      const items = [...bloque.querySelectorAll<HTMLElement>('[data-item]')].filter((x) => x.dataset.item !== arrastre.id)
      indice = items.filter((x) => x.getBoundingClientRect().top + x.offsetHeight / 2 < ev.clientY).length
    }
    setArrastre({ ...arrastre, x: ev.clientX, y: ev.clientY, destino: (bloque?.dataset.bloque as TipoBloque) ?? null, indice })
  }
  function soltar() {
    if (arrastre?.destino) void guardar({ bloques: mover(s!.bloques, arrastre.id, arrastre.destino, arrastre.indice) })
    setArrastre(null)
  }

  async function pdf() {
    const { pdfSesion } = await import('../../lib/exportar/pdf')
    const r = await compartirArchivo(await pdfSesion(s!, ejMap, ctx), `sesion-${s!.fecha}-${nombreArchivo(eq.nombre)}.pdf`, `Sesión ${s!.fecha}`)
    if (r === 'descargado') aviso('PDF descargado')
  }

  const resumen = `${eq.nombre} · ${fechaLarga(s.fecha)}${s.hora ? ` · ${s.hora}` : ''}\nObjetivo: ${s.objetivo || '—'}\n` +
    ORDEN.flatMap((t) => s.bloques.filter((b) => b.tipo === t).sort((a, z) => a.orden - z.orden).map((b) => `• ${nombreBloque(t)}: ${ejMap.get(b.ejercicioId)?.titulo ?? '—'} (${b.minutos}′)`)).join('\n') + `\nTotal: ${total}′`

  const candidatos = elegir ? filtrar(biblioteca, { ...FILTROS_VACIOS, texto: q, edad: edadEquipo(eq.categoria) }).sort((a, b) => Number(BLOQUES.find((x) => x.tipo === elegir)!.tipos.includes(b.tipo)) - Number(BLOQUES.find((x) => x.tipo === elegir)!.tipos.includes(a.tipo))) : []

  return (
    <div>
      <div className="fila entre">
        <button className="btn fantasma" onClick={() => volver({ n: 'sesiones' })}><Icono n="atras" t={18} /> Sesiones</button>
        <span className="ter">{s.estado === 'hecha' ? 'Hecha' : 'Guardado automático'}</span>
      </div>

      <div className="dos-col" style={{ marginTop: 8 }}>
        <div className="pila">
          <label className="campo">Objetivo de la sesión
            <input value={s.objetivo} onChange={(e) => guardar({ objetivo: e.target.value })} placeholder="¿Qué vais a trabajar?" list="principios" style={{ fontSize: '1.15em' }} />
            <datalist id="principios">{PRINCIPIOS.map((p) => <option key={p} value={p} />)}</datalist>
          </label>
          <div className="fila">
            <label className="campo" style={{ flex: 1 }}>Fecha<input type="date" value={s.fecha} onChange={(e) => e.target.value && guardar({ fecha: e.target.value })} /></label>
            <label className="campo" style={{ width: 130 }}>Hora<input type="time" value={s.hora ?? ''} onChange={(e) => guardar({ hora: e.target.value || null })} /></label>
          </div>
        </div>
        <div className="tarjeta pila">
          <div className={`duracion${total > objetivoMin ? ' pasada' : ''}`}>
            <div className="fila entre">
              <span><b className="total num titulo" style={{ fontSize: '1.8em' }}>{total}′</b> <span className="ter">de</span></span>
              <Paso etiqueta="minutos previstos" valor={objetivoMin} min={30} max={150} paso={5} sufijo="′" cambiar={setObjetivoMin} />
            </div>
            <div className="barra" role="img" aria-label={`Duración ${total} de ${objetivoMin} minutos`}>
              {ORDEN.map((t) => { const m = duracionTotal(s.bloques.filter((b) => b.tipo === t)); return <i key={t} className={`b-${t}`} style={{ width: `${(m / Math.max(total, objetivoMin)) * 100}%` }} /> })}
            </div>
            {total > objetivoMin ? <span className="ter" style={{ color: 'var(--amber)' }}>Te pasas {total - objetivoMin} minutos</span> : null}
          </div>
          <div className="fila entre"><span className="sec">Carga estimada</span><strong className="num">{carga} UA · {nivelCarga(carga)}</strong></div>
          <div className="fila entre"><span className="sec">Jugadores disponibles</span><strong className="num">{disponibles}</strong></div>
          <button className="btn" onClick={() => setAsistente(true)}><Icono n="chispa" t={18} /> Proponme una sesión</button>
        </div>
      </div>

      <div className="pila bloque">
        {BLOQUES.map((bl) => {
          const items = s.bloques.filter((b) => b.tipo === bl.tipo).sort((a, z) => a.orden - z.orden)
          return (
            <section key={bl.tipo} className={`bloque-ses${arrastre?.destino === bl.tipo ? ' destino' : ''}`} data-bloque={bl.tipo} aria-label={bl.nombre}>
              <header>
                <span className={`punto b-${bl.tipo}`} />
                <h2 style={{ fontSize: '1.2em' }}>{bl.nombre}</h2>
                <span className="ter num" style={{ marginLeft: 'auto' }}>{duracionTotal(items)}′</span>
              </header>
              {items.map((b, i) => {
                const e = ejMap.get(b.ejercicioId)
                return (
                  <div key={b.id} className={`item-ses${arrastre?.id === b.id ? ' arrastrando' : ''}`} data-item={b.id}>
                    <button className="asa-arrastre" aria-label={`Arrastrar ${e?.titulo ?? 'ejercicio'}`} onPointerDown={(ev) => empezarArrastre(b, ev)} onPointerMove={moverArrastre} onPointerUp={soltar} onPointerCancel={() => setArrastre(null)}><Icono n="arrastrar" /></button>
                    <a className="mini" href={e ? href({ n: 'ejercicio', id: e.id }) : undefined} aria-label={`Ficha de ${e?.titulo}`}>{e ? <Pizarra p={e.pizarra} mini controles={false} /> : null}</a>
                    <div style={{ minWidth: 0 }}>
                      <strong className="titulo-item">{e?.titulo ?? 'Ejercicio no disponible'}</strong>
                      <span className="ter">{e ? <>{TIPOS[e.tipo]} · <Intensidad v={e.intensidad} /></> : 'Quítalo o cámbialo'}</span>
                    </div>
                    <div className="controles">
                      <Paso etiqueta="minutos" valor={b.minutos} min={1} max={60} sufijo="′" cambiar={(n) => guardar({ bloques: s.bloques.map((x) => (x.id === b.id ? { ...x, minutos: n } : x)) })} />
                      <button className="btn-icono" aria-label="Subir" disabled={i === 0 && bl.tipo === 'activacion'} onClick={() => { const ti = ORDEN.indexOf(bl.tipo); guardar({ bloques: i > 0 ? mover(s.bloques, b.id, bl.tipo, i - 1) : mover(s.bloques, b.id, ORDEN[ti - 1], 99) }) }}><Icono n="arriba" t={18} /></button>
                      <button className="btn-icono" aria-label="Bajar" disabled={i === items.length - 1 && bl.tipo === 'calma'} onClick={() => { const ti = ORDEN.indexOf(bl.tipo); guardar({ bloques: i < items.length - 1 ? mover(s.bloques, b.id, bl.tipo, i + 1) : mover(s.bloques, b.id, ORDEN[ti + 1], 0) }) }}><Icono n="abajo" t={18} /></button>
                      <button className="btn-icono" aria-label="Quitar" onClick={() => { const antes = s.bloques; void guardar({ bloques: s.bloques.filter((x) => x.id !== b.id) }); aviso('Ejercicio quitado', { texto: 'Deshacer', hacer: () => void guardar({ bloques: antes }) }) }}><Icono n="cerrar" t={18} /></button>
                    </div>
                  </div>
                )
              })}
              <button className="btn fantasma" style={{ justifySelf: 'start' }} onClick={() => setElegir(bl.tipo)}><Icono n="mas" t={18} /> Añadir ejercicio</button>
            </section>
          )
        })}
      </div>

      <div className="acciones bloque">
        <a className="btn primario grande" href={href({ n: 'campo', id: s.id })}><Icono n="silbato" /> Empezar entrenamiento</a>
        <button className="btn" onClick={pdf}><Icono n="pdf" t={18} /> PDF</button>
        <a className="btn" href={enlaceWhatsApp(resumen)} target="_blank" rel="noopener"><Icono n="whatsapp" t={18} /> WhatsApp</a>
        <button className="btn" onClick={async () => {
          const b = puedeGuardarSesion(pro ? 'pro' : 'gratis', sesiones, usuario.id)
          if (b) return aviso(b.motivo, { texto: 'Ver Pro', hacer: () => ir({ n: 'planes' }) })
          const c = await repo.duplicar('sesiones', s.id, { fecha: sumarDias(s.fecha, 7), estado: 'planificada', bloques: s.bloques.map((x) => ({ ...x, id: uuid() })) })
          if (c) { aviso('Sesión duplicada para la semana siguiente'); ir({ n: 'sesion', id: c.id }) }
        }}><Icono n="copiar" t={18} /> Duplicar</button>
        <button className="btn" onClick={() => setHistorial(true)}><Icono n="historial" t={18} /> Historial</button>
        <button className="btn" onClick={() => repo.archivar('sesiones', s.id, !s.archivado)}>{s.archivado ? 'Desarchivar' : 'Archivar'}</button>
        <button className="btn peligro" onClick={async () => { await repo.papelera('sesiones', s.id); aviso('Sesión en la papelera (30 días)', { texto: 'Deshacer', hacer: () => void repo.restaurar('sesiones', s.id) }); ir({ n: 'sesiones' }) }}><Icono n="papelera" t={18} /> Papelera</button>
      </div>

      {arrastre ? <div className="fantasma-arrastre" style={{ left: arrastre.x, top: arrastre.y }}>{ejMap.get(s.bloques.find((b) => b.id === arrastre.id)?.ejercicioId ?? '')?.titulo}</div> : null}

      <Hoja titulo={elegir ? `Añadir a ${nombreBloque(elegir)}` : ''} abierta={!!elegir} cerrar={() => setElegir(null)}>
        <div className="buscador" style={{ marginBottom: 12 }}><Icono n="buscar" /><input className="entrada" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la biblioteca" aria-label="Buscar ejercicio" /></div>
        <div className="rejilla">
          {candidatos.slice(0, 30).map((e) => <TarjetaEjercicio key={e.id} e={e} accion={{ texto: 'Añadir', hacer: () => anadir(e, elegir!) }} />)}
        </div>
        {candidatos.length === 0 ? <p className="sec">Nada con «{q}».</p> : null}
      </Hoja>

      <Asistente abierta={asistente} cerrar={() => setAsistente(false)} biblioteca={biblioteca} edad={edadEquipo(eq.categoria)} jugadores={disponibles || 12} objetivoInicial={s.objetivo}
        aplicar={(p, principio) => {
          const antes = s.bloques
          void guardar({ asistente: true, objetivo: s.objetivo || principio, bloques: p.bloques.map((b) => ({ id: uuid(), tipo: b.tipo, orden: 0, ejercicioId: b.ejercicioId, minutos: b.minutos })) })
          setObjetivoMin(p.bloques.reduce((t, b) => t + b.minutos, 0))
          if (antes.length) aviso('Sesión sustituida por la propuesta', { texto: 'Deshacer', hacer: () => void guardar({ bloques: antes }) })
        }} />

      <Hoja titulo="Historial de cambios" abierta={historial} cerrar={() => setHistorial(false)}><Historial filaId={s.id} /></Hoja>
    </div>
  )
}
