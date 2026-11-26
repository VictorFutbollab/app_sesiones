/** PNG a partir del SVG de una pizarra que ya está en pantalla (se genera en el dispositivo). */
export async function svgAPng(svg: SVGSVGElement, anchoPx = 1200, marca?: string): Promise<Blob> {
  const copia = svg.cloneNode(true) as SVGSVGElement
  const vb = svg.viewBox.baseVal
  const alto = Math.round((anchoPx * vb.height) / vb.width)
  copia.setAttribute('width', String(anchoPx))
  copia.setAttribute('height', String(alto))
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const txt = new XMLSerializer().serializeToString(copia)
  const url = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((ok, ko) => {
      img.onload = () => ok()
      img.onerror = () => ko(new Error('No se ha podido dibujar la pizarra'))
      img.src = url
    })
    const c = document.createElement('canvas')
    c.width = anchoPx
    c.height = alto + (marca ? 44 : 0)
    const g = c.getContext('2d')!
    g.fillStyle = '#0F1A14'
    g.fillRect(0, 0, c.width, c.height)
    g.drawImage(img, 0, 0, anchoPx, alto)
    if (marca) {
      g.fillStyle = '#EEF3EE'
      g.font = '600 22px Inter, sans-serif'
      g.fillText(marca, 16, alto + 30)
    }
    return await new Promise<Blob>((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('Sin imagen'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
