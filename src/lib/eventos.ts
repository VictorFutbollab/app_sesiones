/** Aviso de "algo cambió en los datos" para refrescar pantallas (también entre pestañas). */
type Oyente = (tablas: string[]) => void
const oyentes = new Set<Oyente>()
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('futbollab-sesiones') : null
canal?.addEventListener('message', (e) => oyentes.forEach((o) => o(e.data as string[])))

export function avisar(tablas: string[], local = false) {
  oyentes.forEach((o) => o(tablas))
  if (!local) canal?.postMessage(tablas)
}
export function escuchar(o: Oyente) {
  oyentes.add(o)
  return () => void oyentes.delete(o)
}
