/** Iconos propios en SVG (trazo 2 px, 24 × 24). Sin librerías ni emojis. */
const P: Record<string, string> = {
  inicio: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  biblioteca: 'M4 4h5v16H4zM10 4h4v16h-4zM15.5 5.5l3.8-1 3.2 14.6-3.8 1z',
  mas: 'M12 5v14M5 12h14',
  sesiones: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  filtro: 'M4 6h16M7 12h10M10 18h4',
  estrella: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  play: 'M7 4v16l13-8z',
  pausa: 'M7 4h4v16H7zM13 4h4v16h-4z',
  atras: 'M15 5l-7 7 7 7',
  adelante: 'm9 5 7 7-7 7',
  cerrar: 'M6 6l12 12M18 6 6 18',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  copiar: 'M8 8h12v12H8zM4 16V4h12',
  papelera: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  compartir: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  descargar: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  arrastrar: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  arriba: 'M6 15l6-6 6 6',
  abajo: 'M6 9l6 6 6-6',
  silbato: 'M3 10a5 5 0 0 0 10 0V8h8v4h-4M8 10h.01',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  micro: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  check: 'M5 12l5 5 9-10',
  deshacer: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  rehacer: 'm15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  carpeta: 'M3 6h6l2 2h10v11H3z',
  chispa: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  equipo: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c.8-3 3.2-5 6-5s5.2 2 6 5M14 15.3c.6-.2 1.3-.3 2-.3 2.8 0 5.2 2 6 5',
  nube: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z',
  candado: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  pdf: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  imagen: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  whatsapp: 'M4 20l1.4-4A8 8 0 1 1 8 18.6zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z',
  siguiente: 'M5 5v14l9-7zM17 5h2v14h-2z',
  reiniciar: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  sol: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  luna: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  historial: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  nota: 'M5 4h14v12l-4 4H5zM15 20v-4h4M8 9h8M8 13h5',
  menu: 'M5 12h.01M12 12h.01M19 12h.01',
  archivar: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  salir: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  candado2: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0',
}
export type NombreIcono = keyof typeof P | string

export function Icono({ n, t = 22, relleno = false, titulo }: { n: NombreIcono; t?: number; relleno?: boolean; titulo?: string }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill={relleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={titulo ? undefined : true} role={titulo ? 'img' : undefined}>
      {titulo ? <title>{titulo}</title> : null}
      <path d={P[n] ?? P.info} />
    </svg>
  )
}

export function Logo({ t = 28 }: { t?: number }) {
  return (
    <svg width={t} height={t} viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="112" fill="#0F1A14" />
      <rect x="96" y="120" width="320" height="272" rx="20" fill="none" stroke="#1F9D55" strokeWidth="22" />
      <line x1="256" y1="120" x2="256" y2="392" stroke="#1F9D55" strokeWidth="16" />
      <circle cx="256" cy="256" r="52" fill="none" stroke="#1F9D55" strokeWidth="16" />
      <path d="M150 330 L220 220" stroke="#F4F7F2" strokeWidth="18" strokeLinecap="round" />
      <circle cx="150" cy="330" r="22" fill="#F4F7F2" />
      <circle cx="330" cy="190" r="22" fill="#F2C230" />
    </svg>
  )
}
