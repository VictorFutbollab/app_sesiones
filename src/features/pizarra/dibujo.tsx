/**
 * Dibujo de la pizarra en SVG (coordenadas en METROS). Lo usan la ficha, las
 * miniaturas, el editor, el modo campo y la exportación a PDF/imagen.
 */
import type { PointerEvent as PE, ReactNode } from 'react'
import type { Elemento, Flecha, Pizarra, Punto, TipoElemento } from '../../model/sesiones'

export const COLOR: Record<TipoElemento, string> = {
  jugador: '#FFD23F', rival: '#4AA3DF', comodin: '#F4F7F2', portero: '#FF9F43', portero_rival: '#9B8CFF',
  cono: '#FF7A2F', pica: '#F2E14C', valla: '#F4F7F2', balon: '#FFFFFF', porteria: '#FFFFFF', miniporteria: '#FFFFFF',
}
export const NOMBRE_ELEMENTO: Record<TipoElemento, string> = {
  jugador: 'Jugador', rival: 'Rival', comodin: 'Comodín', portero: 'Portero', portero_rival: 'Portero rival',
  cono: 'Cono', pica: 'Pica', valla: 'Valla', balon: 'Balón', porteria: 'Portería', miniporteria: 'Miniportería',
}

export const radio = (p: Pick<Pizarra, 'ancho' | 'largo'>) => Math.min(1.6, Math.max(0.55, Math.max(p.ancho, p.largo) / 42))

function Campo({ p, id }: { p: Pizarra; id: string }) {
  const { ancho: w, largo: h } = p
  const franjas = Math.max(4, Math.round(h / 6))
  const l = { stroke: 'var(--campo-linea, #fff)', strokeWidth: Math.max(0.12, w / 220), fill: 'none' }
  const areaGrande = (y: number, dir: 1 | -1) => {
    const aw = Math.min(40.3, w * 0.6), ah = Math.min(16.5, h * 0.3)
    const pw = Math.min(18.3, w * 0.28), ph = Math.min(5.5, h * 0.1)
    return (
      <g>
        <rect x={(w - aw) / 2} y={dir === 1 ? y : y - ah} width={aw} height={ah} {...l} />
        <rect x={(w - pw) / 2} y={dir === 1 ? y : y - ph} width={pw} height={ph} {...l} />
        <circle cx={w / 2} cy={y + dir * Math.min(11, ah * 0.67)} r={l.strokeWidth * 1.6} fill={l.stroke} />
      </g>
    )
  }
  return (
    <g>
      <defs>
        <clipPath id={`${id}-c`}><rect x={0} y={0} width={w} height={h} /></clipPath>
      </defs>
      <rect x={-1} y={-1} width={w + 2} height={h + 2} fill="var(--campo, #1C5A34)" />
      <g clipPath={`url(#${id}-c)`}>
        {Array.from({ length: franjas }, (_, i) => i % 2 === 1 && <rect key={i} x={0} y={(i * h) / franjas} width={w} height={h / franjas} fill="var(--campo-2, #1F6239)" />)}
      </g>
      <rect x={0} y={0} width={w} height={h} {...l} />
      {p.campo === 'completo' ? (
        <g>
          <line x1={0} y1={h / 2} x2={w} y2={h / 2} {...l} />
          <circle cx={w / 2} cy={h / 2} r={Math.min(9.15, w / 7)} {...l} />
          {areaGrande(0, 1)}
          {areaGrande(h, -1)}
        </g>
      ) : p.campo === 'medio' ? (
        <g>
          {areaGrande(0, 1)}
          <path d={`M ${w / 2 - Math.min(9.15, w / 7)} ${h} A ${Math.min(9.15, w / 7)} ${Math.min(9.15, w / 7)} 0 0 1 ${w / 2 + Math.min(9.15, w / 7)} ${h}`} {...l} />
        </g>
      ) : null}
    </g>
  )
}

function ondulada(a: Punto, b: Punto, amp: number) {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 0.01) return ''
  const n = Math.max(2, Math.round(len / (amp * 3)))
  const ux = dx / len, uy = dy / len, px = -uy, py = ux
  let d = `M ${a.x} ${a.y}`
  for (let i = 1; i <= n; i++) {
    const t = i / n, m = (i - 0.5) / n, s = i % 2 ? 1 : -1
    const cx = a.x + dx * m + px * amp * s, cy = a.y + dy * m + py * amp * s
    d += ` Q ${cx} ${cy} ${a.x + dx * t} ${a.y + dy * t}`
  }
  return d
}

export function DibujoFlecha({ f, r, id, opacidad = 1 }: { f: Flecha; r: number; id: string; opacidad?: number }) {
  const color = f.tipo === 'tiro' ? '#FFD23F' : '#FFFFFF'
  const ancho = r * (f.tipo === 'tiro' ? 0.28 : 0.2)
  // recorta el final para que la punta no tape al jugador
  const dx = f.hasta.x - f.desde.x, dy = f.hasta.y - f.desde.y, len = Math.hypot(dx, dy) || 1
  const fin = { x: f.hasta.x - (dx / len) * r * 0.4, y: f.hasta.y - (dy / len) * r * 0.4 }
  const comun = { stroke: color, strokeWidth: ancho, fill: 'none', markerEnd: `url(#${id}-punta-${f.tipo === 'tiro' ? 't' : 'n'})`, opacity: opacidad, strokeLinecap: 'round' as const }
  if (f.tipo === 'conduccion') return <path d={ondulada(f.desde, fin, r * 0.35)} {...comun} />
  return <line x1={f.desde.x} y1={f.desde.y} x2={fin.x} y2={fin.y} {...comun} strokeDasharray={f.tipo === 'desmarque' ? `${r * 0.6} ${r * 0.45}` : undefined} />
}

export function DibujoElemento({ e, pos, r, seleccionado, onPointerDown }: { e: Elemento; pos: Punto; r: number; seleccionado?: boolean; onPointerDown?: (ev: PE<SVGGElement>) => void }) {
  const c = COLOR[e.tipo]
  let forma: ReactNode
  switch (e.tipo) {
    case 'cono':
      forma = <path d={`M ${-r * 0.55} ${r * 0.45} L 0 ${-r * 0.6} L ${r * 0.55} ${r * 0.45} Z`} fill={c} stroke="#7A2E00" strokeWidth={r * 0.08} />
      break
    case 'pica':
      forma = <rect x={-r * 0.12} y={-r * 0.9} width={r * 0.24} height={r * 1.8} rx={r * 0.1} fill={c} stroke="#3B3500" strokeWidth={r * 0.06} />
      break
    case 'valla':
      forma = <rect x={-r * 0.9} y={-r * 0.18} width={r * 1.8} height={r * 0.36} fill={c} stroke="#222" strokeWidth={r * 0.06} />
      break
    case 'balon':
      forma = <g><circle r={r * 0.42} fill="#fff" stroke="#111" strokeWidth={r * 0.08} /><circle r={r * 0.14} fill="#111" /></g>
      break
    case 'porteria':
      forma = <rect x={-3.66} y={-r * 0.35} width={7.32} height={r * 0.7} fill="rgb(255 255 255 / 0.25)" stroke={c} strokeWidth={r * 0.14} />
      break
    case 'miniporteria':
      forma = <rect x={-1.2} y={-r * 0.3} width={2.4} height={r * 0.6} fill="rgb(255 255 255 / 0.25)" stroke={c} strokeWidth={r * 0.12} />
      break
    default: {
      const oscuro = e.tipo === 'rival' || e.tipo === 'portero_rival'
      forma = (
        <g>
          <circle r={r} fill={c} stroke="rgb(0 0 0 / 0.55)" strokeWidth={r * 0.1} />
          {e.tipo === 'portero' || e.tipo === 'portero_rival' ? <circle r={r * 0.62} fill="none" stroke="rgb(0 0 0 / 0.45)" strokeWidth={r * 0.1} /> : null}
          {e.etiqueta ? (
            <text y={r * 0.38} textAnchor="middle" fontSize={r * 1.05} fontWeight={700} fontFamily="Inter, sans-serif" fill={oscuro ? '#fff' : '#111'}>
              {e.etiqueta}
            </text>
          ) : null}
        </g>
      )
    }
  }
  return (
    <g transform={`translate(${pos.x} ${pos.y}) rotate(${e.giro ?? 0})`} onPointerDown={onPointerDown} style={onPointerDown ? { cursor: 'grab' } : undefined} data-elemento={e.id}>
      {seleccionado ? <circle r={r * 1.45} fill="none" stroke="#fff" strokeWidth={r * 0.12} strokeDasharray={`${r * 0.4} ${r * 0.3}`} /> : null}
      {/* zona táctil generosa para el dedo */}
      {onPointerDown ? <circle r={Math.max(r * 1.6, 1.4)} fill="transparent" /> : null}
      {forma}
    </g>
  )
}

export interface PropsDibujo {
  p: Pizarra
  posiciones: Record<string, Punto>
  flechas: Flecha[]
  opacidadFlechas?: number
  id: string
  titulo?: string
  seleccion?: string | null
  onElemento?: (id: string, ev: PE<SVGGElement>) => void
  svgProps?: React.SVGProps<SVGSVGElement>
  extra?: ReactNode
}

export function DibujoPizarra({ p, posiciones, flechas, opacidadFlechas = 1, id, titulo, seleccion, onElemento, svgProps, extra }: PropsDibujo) {
  const r = radio(p)
  // Orden de pintado: porterías y material debajo, jugadores encima, balón arriba.
  const capa = (t: TipoElemento) => (t === 'porteria' || t === 'miniporteria' ? 0 : t === 'cono' || t === 'pica' || t === 'valla' ? 1 : t === 'balon' ? 3 : 2)
  const orden = [...p.elementos].sort((a, b) => capa(a.tipo) - capa(b.tipo))
  return (
    <svg viewBox={`-1 -1 ${p.ancho + 2} ${p.largo + 2}`} className="pizarra" role="img" aria-label={titulo ?? 'Pizarra del ejercicio'} {...svgProps}>
      <defs>
        {(['n', 't'] as const).map((k) => (
          <marker key={k} id={`${id}-punta-${k}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={k === 't' ? '#FFD23F' : '#fff'} />
          </marker>
        ))}
      </defs>
      <Campo p={p} id={id} />
      <g>{flechas.map((f) => <DibujoFlecha key={f.id} f={f} r={r} id={id} opacidad={opacidadFlechas} />)}</g>
      {orden.map((e) => (
        <DibujoElemento key={e.id} e={e} pos={posiciones[e.id] ?? e} r={r} seleccionado={seleccion === e.id} onPointerDown={onElemento ? (ev) => onElemento(e.id, ev) : undefined} />
      ))}
      {extra}
    </svg>
  )
}
