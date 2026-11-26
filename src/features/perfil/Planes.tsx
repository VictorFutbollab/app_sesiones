import { useApp } from '../../app/estado'
import { LIMITES, PRECIOS } from '../../logic/planes'
import { MODO_DEMO, supabase } from '../../lib/supabase/cliente'
import { Icono } from '../../ui/Icono'
import { Cabecera } from '../../ui/base'
import { volver } from '../../app/router'

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
    <div>
      <Cabecera titulo="Planes" sub={pro ? 'Tienes Pro' : 'Estás en el plan Gratis'} atras={() => volver({ n: 'perfil' })} />
      {pro ? (
        <div className="banda info" style={{ marginBottom: 14 }}><Icono n="check" /> Tienes Pro{usuario.proHasta ? ` hasta el ${new Date(usuario.proHasta).toLocaleDateString('es-ES')}` : ''}.</div>
      ) : null}
      <div className="planes">
        <section className="plan">
          <div className="fila entre"><h2>Gratis</h2>{!pro ? <span className="recuento">Tu plan</span> : null}</div>
          <div className="precio num">0 €<small> para siempre</small></div>
          <ul>{FILAS.map(([f, g]) => <li key={f}><Icono n="check" t={18} /><span><strong>{f}:</strong> {g.toLowerCase()}</span></li>)}</ul>
        </section>
        <section className="plan pro">
          <div className="fila entre"><h2>Pro</h2>{pro ? <span className="chip-blanco">Tu plan</span> : null}</div>
          <div className="precio num">{PRECIOS.mensual.toFixed(2).replace('.', ',')} €<small> al mes</small></div>
          <ul>{FILAS.map(([f, , p]) => <li key={f}><Icono n="check" t={18} /><span><strong>{f}:</strong> {p.toLowerCase()}</span></li>)}</ul>
          <button className="btn amarillo grande ancho" onClick={() => pagar('mensual')}>{pro && MODO_DEMO ? 'Volver a Gratis (demostración)' : `Pro mensual · ${PRECIOS.mensual.toFixed(2).replace('.', ',')} €`}</button>
          {!(pro && MODO_DEMO) ? <button className="btn grande ancho" onClick={() => pagar('anual')}>Pro anual · {PRECIOS.anual.toFixed(2).replace('.', ',')} € (ahorras un 33 %)</button> : null}
        </section>
      </div>
      <p className="pie-app">{MODO_DEMO ? 'Modo demostración: no se cobra nada; Pro se activa solo en este dispositivo para que lo pruebes.' : 'Pago seguro con Stripe. Cancela cuando quieras desde el enlace del recibo.'}</p>
    </div>
  )
}
