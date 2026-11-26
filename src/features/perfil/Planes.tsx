import { useApp } from '../../app/estado'
import { LIMITES, PRECIOS } from '../../logic/planes'
import { MODO_DEMO, supabase } from '../../lib/supabase/cliente'
import { Icono } from '../../ui/Icono'

const FILAS: [string, string, string][] = [
  ['Ejercicios de la biblioteca', `${LIMITES.gratis.biblioteca} básicos`, 'Todos y novedades mensuales'],
  ['Ejercicios propios', `${LIMITES.gratis.propios}`, 'Ilimitados, con animación por fases'],
  ['Sesiones guardadas', `${LIMITES.gratis.sesiones}`, 'Ilimitadas'],
  ['Exportar PDF o imagen', 'Con marca de agua', 'Sin marca, con escudo del club'],
  ['Asistente de sesión', `${LIMITES.gratis.asistenteMes} al mes`, 'Ilimitado'],
  ['Notas de voz', 'Sin transcripción', 'Transcritas'],
  ['Compartir con cuerpo técnico', 'No', 'Sí'],
]

export function Planes() {
  const { pro, usuario, setUsuario, aviso } = useApp()

  async function pagar(periodo: 'mensual' | 'anual') {
    if (MODO_DEMO) {
      // Demostración: no hay pago real. Se activa Pro en este dispositivo para enseñarlo.
      setUsuario({ ...usuario, plan: pro ? 'gratis' : 'pro', proHasta: null })
      aviso(pro ? 'Vuelves a Gratis (demostración)' : 'Pro activado en modo demostración (sin pago)')
      return
    }
    const r = await supabase!.functions.invoke('pagos-checkout', { body: { periodo } })
    if (r.error || !(r.data as { url?: string })?.url) return aviso('No se ha podido abrir el pago. Inténtalo de nuevo.')
    location.href = (r.data as { url: string }).url
  }

  return (
    <div className="pila">
      <h1>Planes</h1>
      <table className="tabla tarjeta">
        <thead><tr><th /><th>Gratis</th><th>Pro</th></tr></thead>
        <tbody>{FILAS.map(([f, g, p]) => <tr key={f}><td>{f}</td><td>{g}</td><td className="si">{p}</td></tr>)}</tbody>
      </table>
      {pro ? (
        <div className="banda info"><Icono n="check" /> Tienes Pro{usuario.proHasta ? ` hasta el ${new Date(usuario.proHasta).toLocaleDateString('es-ES')}` : ''}.</div>
      ) : null}
      <div className="rejilla">
        <button className="btn primario grande" onClick={() => pagar('mensual')}>{pro && MODO_DEMO ? 'Volver a Gratis (demostración)' : `Pro mensual · ${PRECIOS.mensual.toFixed(2).replace('.', ',')} €`}</button>
        {!(pro && MODO_DEMO) ? <button className="btn grande" onClick={() => pagar('anual')}>Pro anual · {PRECIOS.anual.toFixed(2).replace('.', ',')} € <span className="ter">(ahorras un 33 %)</span></button> : null}
      </div>
      <p className="ter">{MODO_DEMO ? 'Modo demostración: no se cobra nada; Pro se activa solo en este dispositivo para que lo pruebes.' : 'Pago seguro con Stripe. Cancela cuando quieras desde el enlace del recibo.'}</p>
    </div>
  )
}
