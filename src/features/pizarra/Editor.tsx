import { useCallback, useId, useRef, useState, type PointerEvent as PE } from 'react'
import type { Elemento, Fase, Flecha, Pizarra as TPizarra, Punto, TipoCampo, TipoElemento, TipoFlecha } from '../../model/sesiones'
import { COLOR, DibujoFlecha, DibujoPizarra, NOMBRE_ELEMENTO, radio } from './dibujo'
import { Pizarra } from './Pizarra'
import { Icono } from '../../ui/Icono'
import { Paso, Segmentado } from '../../ui/base'
import { uuid } from '../../logic/id'

type Herramienta = 'mover' | 'borrar' | TipoElemento | `flecha-${TipoFlecha}`

const ELEMENTOS: TipoElemento[] = ['jugador', 'rival', 'comodin', 'portero', 'portero_rival', 'balon', 'cono', 'pica', 'valla', 'porteria', 'miniporteria']
const FLECHAS: [TipoFlecha, string][] = [['pase', 'Pase'], ['conduccion', 'Conducción'], ['desmarque', 'Desmarque'], ['tiro', 'Tiro']]
const MEDIDAS: Record<TipoCampo, [number, number]> = { completo: [68, 105], medio: [68, 52], reducido: [30, 40] }

export const pizarraVacia = (campo: TipoCampo = 'reducido'): TPizarra => ({
  campo, ancho: MEDIDAS[campo][0], largo: MEDIDAS[campo][1], elementos: [], fases: [{ id: uuid(), nombre: 'Inicio', posiciones: {}, flechas: [] }],
})

const igual = (a?: Punto, b?: Punto) => !!a && !!b && Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01
const redondear = (n: number) => Math.round(n * 10) / 10

function IconoElemento({ t }: { t: TipoElemento }) {
  const c = COLOR[t]
  return (
    <svg width="26" height="26" viewBox="-1.3 -1.3 2.6 2.6" aria-hidden>
      {t === 'cono' ? <path d="M-.7 .6 0 -.8 .7 .6Z" fill={c} /> : t === 'pica' ? <rect x="-.15" y="-1" width=".3" height="2" fill={c} /> : t === 'valla' ? <rect x="-1" y="-.2" width="2" height=".4" fill={c} /> : t === 'porteria' || t === 'miniporteria' ? <rect x="-1.1" y="-.4" width="2.2" height=".8" fill="none" stroke={c} strokeWidth=".18" /> : t === 'balon' ? <circle r=".6" fill="#fff" stroke="#111" strokeWidth=".12" /> : <circle r="1" fill={c} stroke="rgb(0 0 0 / .4)" strokeWidth=".12" />}
    </svg>
  )
}

export function EditorPizarra({ valor, cambiar, puedeAnimar, avisoPro }: { valor: TPizarra; cambiar: (p: TPizarra) => void; puedeAnimar: boolean; avisoPro: () => void }) {
  const id = useId().replace(/:/g, '')
  const [fase, setFase] = useState(0)
  const [herr, setHerr] = useState<Herramienta>('jugador')
  const [sel, setSel] = useState<string | null>(null)
  const [pasado, setPasado] = useState<TPizarra[]>([])
  const [futuro, setFuturo] = useState<TPizarra[]>([])
  const [previa, setPrevia] = useState(false)
  const [trazo, setTrazo] = useState<{ desde: Punto; hasta: Punto } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const arrastre = useRef<{ id: string; antes: TPizarra; desde: Punto; movido: boolean } | null>(null)
  const p = valor
  const f = p.fases[Math.min(fase, p.fases.length - 1)]
  const r = radio(p)

  const aplicar = useCallback((nueva: TPizarra, antes: TPizarra = p) => {
    setPasado((h) => [...h.slice(-49), antes])
    setFuturo([])
    cambiar(nueva)
  }, [p, cambiar])

  const punto = (ev: { clientX: number; clientY: number }): Punto => {
    const m = svg.current!.getScreenCTM()!.inverse()
    const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m)
    return { x: redondear(Math.min(p.ancho, Math.max(0, q.x))), y: redondear(Math.min(p.largo, Math.max(0, q.y))) }
  }

  const conPosicion = (fases: Fase[], idE: string, desdeFase: number, nuevo: Punto, viejo?: Punto) =>
    fases.map((x, i) => {
      if (i < desdeFase) return x
      // La posición se arrastra a las fases siguientes que no la habían cambiado.
      if (i === desdeFase || igual(x.posiciones[idE], viejo)) return { ...x, posiciones: { ...x.posiciones, [idE]: nuevo } }
      return x
    })

  const etiquetaNueva = (t: TipoElemento) => {
    if (t !== 'jugador' && t !== 'rival') return undefined
    const n = p.elementos.filter((e) => e.tipo === t).length + 1
    return String(n)
  }

  function alPulsarCampo(ev: PE<SVGSVGElement>) {
    if ((ev.target as Element).closest('[data-elemento]') && !herr.startsWith('flecha')) return
    const q = punto(ev)
    if (herr.startsWith('flecha-')) {
      ;(ev.currentTarget as Element).setPointerCapture(ev.pointerId)
      // engancha al centro del elemento más cercano
      const cerca = p.elementos.map((e) => ({ e, d: Math.hypot((f.posiciones[e.id]?.x ?? e.x) - q.x, (f.posiciones[e.id]?.y ?? e.y) - q.y) })).sort((a, b) => a.d - b.d)[0]
      const desde = cerca && cerca.d < r * 1.6 ? (f.posiciones[cerca.e.id] ?? cerca.e) : q
      setTrazo({ desde: { x: desde.x, y: desde.y }, hasta: q })
      return
    }
    if (herr === 'mover' || herr === 'borrar') {
      setSel(null)
      return
    }
    const tipo = herr as TipoElemento
    const e: Elemento = { id: uuid(), tipo, x: q.x, y: q.y, ...(etiquetaNueva(tipo) ? { etiqueta: etiquetaNueva(tipo) } : {}) }
    aplicar({ ...p, elementos: [...p.elementos, e], fases: p.fases.map((x) => ({ ...x, posiciones: { ...x.posiciones, [e.id]: { x: q.x, y: q.y } } })) })
    setSel(e.id)
  }

  function alPulsarElemento(idE: string, ev: PE<SVGGElement>) {
    if (herr.startsWith('flecha-')) return
    ev.stopPropagation()
    if (herr === 'borrar') {
      borrarElemento(idE)
      return
    }
    setSel(idE)
    ;(svg.current as Element).setPointerCapture(ev.pointerId)
    arrastre.current = { id: idE, antes: p, desde: f.posiciones[idE] ?? p.elementos.find((e) => e.id === idE)!, movido: false }
  }

  function alMover(ev: PE<SVGSVGElement>) {
    if (trazo) {
      setTrazo({ ...trazo, hasta: punto(ev) })
      return
    }
    const a = arrastre.current
    if (!a) return
    const q = punto(ev)
    a.movido = true
    const fases = conPosicion(a.antes.fases, a.id, fase, q, a.desde)
    const elementos = fase === 0 ? a.antes.elementos.map((e) => (e.id === a.id ? { ...e, x: q.x, y: q.y } : e)) : a.antes.elementos
    cambiar({ ...a.antes, elementos, fases })
  }

  function alSoltar() {
    if (trazo) {
      const largo = Math.hypot(trazo.hasta.x - trazo.desde.x, trazo.hasta.y - trazo.desde.y)
      if (largo > r) {
        const fl: Flecha = { id: uuid(), tipo: herr.replace('flecha-', '') as TipoFlecha, desde: trazo.desde, hasta: trazo.hasta }
        aplicar({ ...p, fases: p.fases.map((x, i) => (i === fase ? { ...x, flechas: [...x.flechas, fl] } : x)) })
      }
      setTrazo(null)
      return
    }
    const a = arrastre.current
    arrastre.current = null
    if (a?.movido) {
      setPasado((h) => [...h.slice(-49), a.antes])
      setFuturo([])
    }
  }

  function borrarElemento(idE: string) {
    aplicar({
      ...p,
      elementos: p.elementos.filter((e) => e.id !== idE),
      fases: p.fases.map((x) => {
        const { [idE]: _fuera, ...resto } = x.posiciones
        return { ...x, posiciones: resto }
      }),
    })
    setSel(null)
  }

  const borrarFlecha = (fid: string) => aplicar({ ...p, fases: p.fases.map((x, i) => (i === fase ? { ...x, flechas: x.flechas.filter((y) => y.id !== fid) } : x)) })

  function nuevaFase() {
    if (!puedeAnimar && p.fases.length >= 1) {
      avisoPro()
      return
    }
    const nueva: Fase = { id: uuid(), nombre: `Fase ${p.fases.length + 1}`, posiciones: { ...f.posiciones }, flechas: [] }
    const fases = [...p.fases.slice(0, fase + 1), nueva, ...p.fases.slice(fase + 1)]
    aplicar({ ...p, fases })
    setFase(fase + 1)
  }

  function quitarFase() {
    if (p.fases.length <= 1) return
    aplicar({ ...p, fases: p.fases.filter((_, i) => i !== fase) })
    setFase(Math.max(0, fase - 1))
  }

  const deshacer = () => {
    const prev = pasado.at(-1)
    if (!prev) return
    setPasado(pasado.slice(0, -1))
    setFuturo([p, ...futuro])
    cambiar(prev)
  }
  const rehacer = () => {
    const sig = futuro[0]
    if (!sig) return
    setFuturo(futuro.slice(1))
    setPasado([...pasado, p])
    cambiar(sig)
  }

  const elSel = p.elementos.find((e) => e.id === sel)

  if (previa) {
    return (
      <div className="pila">
        <Pizarra p={p} auto />
        <button className="btn" onClick={() => setPrevia(false)}><Icono n="editar" t={18} /> Volver a editar</button>
      </div>
    )
  }

  return (
    <div className="editor pila">
      <div className="fila entre">
        <Segmentado etiqueta="Tipo de campo" valor={p.campo} cambiar={(c) => aplicar({ ...p, campo: c, ancho: MEDIDAS[c][0], largo: MEDIDAS[c][1] })} opciones={[['reducido', 'Reducido'], ['medio', 'Medio'], ['completo', 'Completo']]} />
        <div className="fila">
          <Paso etiqueta="ancho" valor={p.ancho} min={8} max={75} paso={2} sufijo=" m" cambiar={(n) => aplicar({ ...p, ancho: n })} />
          <span className="ter">×</span>
          <Paso etiqueta="largo" valor={p.largo} min={8} max={110} paso={2} sufijo=" m" cambiar={(n) => aplicar({ ...p, largo: n })} />
        </div>
      </div>

      <div className="paleta" role="toolbar" aria-label="Herramientas de la pizarra">
        <button aria-pressed={herr === 'mover'} onClick={() => setHerr('mover')}><Icono n="arrastrar" />Mover</button>
        <span className="sep" />
        {ELEMENTOS.map((t) => (
          <button key={t} aria-pressed={herr === t} onClick={() => setHerr(t)} title={NOMBRE_ELEMENTO[t]}>
            <IconoElemento t={t} />{NOMBRE_ELEMENTO[t]}
          </button>
        ))}
        <span className="sep" />
        {FLECHAS.map(([t, n]) => (
          <button key={t} aria-pressed={herr === `flecha-${t}`} onClick={() => setHerr(`flecha-${t}`)}>
            <svg width="30" height="16" viewBox="0 0 30 16" aria-hidden><DibujoFlecha f={{ id: t, tipo: t, desde: { x: 2, y: 8 }, hasta: { x: 28, y: 8 } }} r={5} id={`${id}-ico`} /></svg>{n}
          </button>
        ))}
        <span className="sep" />
        <button aria-pressed={herr === 'borrar'} onClick={() => setHerr('borrar')}><Icono n="papelera" />Borrar</button>
      </div>

      <div className="fila entre">
        <div className="fila" role="tablist" aria-label="Fases">
          {p.fases.map((x, i) => (
            <button key={x.id} role="tab" className="chip" aria-pressed={i === fase} aria-selected={i === fase} onClick={() => setFase(i)}>{i + 1}. {x.nombre}</button>
          ))}
          <button className="chip" onClick={nuevaFase}>+ Fase{!puedeAnimar ? ' (Pro)' : ''}</button>
        </div>
        <div className="fila">
          <button className="btn-icono" onClick={deshacer} disabled={!pasado.length} aria-label="Deshacer"><Icono n="deshacer" /></button>
          <button className="btn-icono" onClick={rehacer} disabled={!futuro.length} aria-label="Rehacer"><Icono n="rehacer" /></button>
          {p.fases.length > 1 ? <button className="btn" onClick={() => setPrevia(true)}><Icono n="play" t={18} /> Ver animación</button> : null}
        </div>
      </div>

      <DibujoPizarra
        p={p}
        id={id}
        posiciones={f.posiciones}
        flechas={[]}
        seleccion={sel}
        onElemento={alPulsarElemento}
        titulo="Editor de pizarra: toca el campo para colocar el elemento elegido"
        svgProps={{ ref: svg, onPointerDown: alPulsarCampo, onPointerMove: alMover, onPointerUp: alSoltar, onPointerCancel: alSoltar, style: { cursor: herr === 'mover' ? 'default' : 'crosshair' } }}
        extra={
          <g>
            {f.flechas.map((fl) => (
              <g key={fl.id} onPointerDown={herr === 'borrar' ? (ev) => { ev.stopPropagation(); borrarFlecha(fl.id) } : undefined} style={herr === 'borrar' ? { cursor: 'pointer' } : undefined}>
                <line x1={fl.desde.x} y1={fl.desde.y} x2={fl.hasta.x} y2={fl.hasta.y} stroke="transparent" strokeWidth={r * 1.2} />
                <DibujoFlecha f={fl} r={r} id={id} />
              </g>
            ))}
            {trazo ? <DibujoFlecha f={{ id: 'trazo', tipo: herr.replace('flecha-', '') as TipoFlecha, ...trazo }} r={r} id={id} opacidad={0.7} /> : null}
          </g>
        }
      />

      <div className="fila entre">
        <label className="campo" style={{ flex: 1, minWidth: 200 }}>
          Nombre de la fase
          <input value={f.nombre} onChange={(e) => cambiar({ ...p, fases: p.fases.map((x, i) => (i === fase ? { ...x, nombre: e.target.value } : x)) })} />
        </label>
        {p.fases.length > 1 ? <button className="btn peligro" onClick={quitarFase}>Quitar fase</button> : null}
      </div>

      {elSel ? (
        <div className="tarjeta fila">
          <strong>{NOMBRE_ELEMENTO[elSel.tipo]}</strong>
          {elSel.tipo === 'jugador' || elSel.tipo === 'rival' || elSel.tipo === 'comodin' || elSel.tipo === 'portero' || elSel.tipo === 'portero_rival' ? (
            <label className="campo" style={{ width: 110 }}>
              Etiqueta
              <input maxLength={3} value={elSel.etiqueta ?? ''} onChange={(e) => cambiar({ ...p, elementos: p.elementos.map((x) => (x.id === elSel.id ? { ...x, etiqueta: e.target.value } : x)) })} />
            </label>
          ) : null}
          {elSel.tipo === 'porteria' || elSel.tipo === 'miniporteria' || elSel.tipo === 'valla' ? (
            <button className="btn" onClick={() => aplicar({ ...p, elementos: p.elementos.map((x) => (x.id === elSel.id ? { ...x, giro: ((x.giro ?? 0) + 90) % 180 } : x)) })}>Girar</button>
          ) : null}
          <button className="btn peligro" onClick={() => borrarElemento(elSel.id)}><Icono n="papelera" t={18} /> Quitar</button>
        </div>
      ) : (
        <p className="ter">Elige un elemento y toca el campo para colocarlo. Con «Mover», arrastra. Para una flecha, arrastra desde el jugador hasta el destino. Cada fase guarda las posiciones y las flechas de ese momento.</p>
      )}
    </div>
  )
}
