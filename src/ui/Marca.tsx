import { useId, type ReactNode } from 'react'
import logoUrl from '../assets/logo-futbollab.png'

/**
 * Logo oficial de FutbolLab (el mismo de futbollab.com y de FutbolLab Jugadores).
 * Proporción del archivo: 313 × 64 px. "Futbol" es blanco: va siempre sobre fondo oscuro.
 */
const PROPORCION = 313 / 64

/**
 * Foto de perfil por defecto (la misma de FutbolLab Jugadores): un balón en el centro
 * del campo, sobre césped a franjas. Ilustración propia de FutbolLab.
 */
export function AvatarFutbol({ size = 40 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  const centro = '50,48.5 57.13,53.68 54.41,62.07 45.59,62.07 42.87,53.68'
  const fuera = ['50,42 41.92,36.13 45,26.62 55,26.62 58.08,36.13', '63.31,51.67 66.4,42.17 76.39,42.17 79.48,51.67 71.4,57.55', '58.23,67.33 68.22,67.33 71.31,76.83 63.23,82.7 55.14,76.83', '41.77,67.33 44.86,76.83 36.77,82.7 28.69,76.83 31.78,67.33', '36.69,51.67 28.6,57.55 20.52,51.67 23.61,42.17 33.6,42.17']
  const costuras = [[50, 48.5, 50, 41], [57.13, 53.68, 64.27, 51.36], [54.41, 62.07, 58.82, 68.14], [45.59, 62.07, 41.18, 68.14], [42.87, 53.68, 35.73, 51.36]]
  return (
    <svg className="avatar-futbol" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <clipPath id={`${id}-c`}><circle cx="50" cy="50" r="50" /></clipPath>
        <clipPath id={`${id}-b`}><circle cx="50" cy="56" r="21" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <rect width="100" height="100" fill="#1E4F8C" />
        {[0, 24, 48, 72, 96].map((x) => <rect key={x} x={x} y="0" width="12" height="100" fill="#22589A" />)}
        <g fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2"><line x1="0" y1="56" x2="100" y2="56" /><circle cx="50" cy="56" r="33" /></g>
        <ellipse cx="51" cy="79" rx="15" ry="3.2" fill="#000000" opacity="0.25" />
        <circle cx="50" cy="56" r="21" fill="#ffffff" />
        <g clipPath={`url(#${id}-b)`} fill="#0F2440">
          <polygon points={centro} />
          {fuera.map((p) => <polygon key={p} points={p} />)}
          <g stroke="#0F2440" strokeWidth="1.4" strokeLinecap="round">{costuras.map(([x1, y1, x2, y2]) => <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />)}</g>
        </g>
      </g>
    </svg>
  )
}

/** Marco de las pantallas de entrada: foto del campo de noche, logo y una hoja blanca con el formulario. */
export function MarcoAcceso({ children, lema = 'La sesión de mañana, lista en 5 minutos.' }: { children: ReactNode; lema?: string }) {
  return (
    <div className="acceso">
      <div className="acceso-campo" aria-hidden />
      <div className="acceso-caja">
        <div className="acceso-marca">
          <Marca alto={34} />
          <p className="acceso-app">Sesiones</p>
          <p className="acceso-lema">{lema}</p>
        </div>
        <div className="acceso-hoja">{children}</div>
      </div>
    </div>
  )
}

export function Marca({ alto = 28, app }: { alto?: number; app?: string }) {
  return (
    <span className="logo" style={{ height: alto }} role="img" aria-label={`FutbolLab${app ? ` ${app}` : ''}`}>
      <img src={logoUrl} alt="" height={alto} width={Math.round(alto * PROPORCION)} />
      {app ? <span className="logo-app" style={{ fontSize: Math.max(11, alto * 0.42) }}>{app}</span> : null}
    </span>
  )
}
