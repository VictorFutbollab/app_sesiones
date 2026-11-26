/** UUID v4 generado en el dispositivo (permite crear sin conexión y subir sin duplicados). */
export const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

export const ahora = () => new Date().toISOString()
export const hoy = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}
export function sumarDias(fecha: string, n: number) {
  const [y, m, d] = fecha.split('-').map(Number)
  return hoy(new Date(y, m - 1, d + n))
}
