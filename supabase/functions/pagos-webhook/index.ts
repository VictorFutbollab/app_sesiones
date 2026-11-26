// Edge Function "pagos-webhook": Stripe avisa de altas, renovaciones y bajas.
// Verifica la firma y actualiza plan + suscripción con service_role (único que puede).
// Secretos: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY.
import Stripe from 'npm:stripe@17'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  const firma = req.headers.get('stripe-signature')
  if (!firma) return new Response('Sin firma', { status: 400 })
  let evento: Stripe.Event
  try {
    evento = await stripe.webhooks.constructEventAsync(await req.text(), firma, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
  } catch {
    return new Response('Firma no válida', { status: 400 })
  }
  if (evento.type.startsWith('customer.subscription.')) {
    const sub = evento.data.object as Stripe.Subscription
    const usuario = sub.metadata.usuario
    if (!usuario) return new Response('Sin usuario', { status: 200 })
    const activa = sub.status === 'active' || sub.status === 'trialing'
    const fin = new Date(sub.items.data[0].current_period_end * 1000).toISOString()
    await admin.from('suscripciones').upsert({
      usuario, cliente_pago: String(sub.customer), suscripcion_pago: sub.id,
      estado: activa ? 'activa' : sub.status === 'past_due' ? 'impagada' : 'cancelada',
      periodo: sub.metadata.periodo === 'anual' ? 'anual' : 'mensual', fin_periodo: fin, actualizado_en: new Date().toISOString(),
    })
    const r = await admin.rpc('fijar_plan', { usuario, nuevo: activa ? 'pro' : 'gratis', hasta: activa ? fin : null })
    if (r.error) return new Response(r.error.message, { status: 500 })
  }
  return new Response('ok')
})
