/** Compartir un archivo: hoja del sistema (WhatsApp, correo…) si existe; si no, descarga. */
export async function compartirArchivo(blob: Blob, nombre: string, texto: string): Promise<'compartido' | 'descargado' | 'cancelado'> {
  const archivo = new File([blob], nombre, { type: blob.type })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre, text: texto })
      return 'compartido'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado'
    }
  }
  descargar(blob, nombre)
  return 'descargado'
}

export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Enlace de WhatsApp con un resumen en texto (funciona sin instalar nada). */
export const enlaceWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`

export const nombreArchivo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'futbollab'
