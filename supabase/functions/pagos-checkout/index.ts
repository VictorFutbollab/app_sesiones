// Edge Function "pagos-checkout": crea una sesión de pago de Stripe para pasar a Pro.
// Secretos: STRIPE_SECRET_KEY, STRIPE_PRECIO_MENSUAL, STRIPE_PRECIO_ANUAL, ORIGEN_APP.
import Stripe from 'npm:stripe@17'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': Deno.env.get('ORIGEN_APP') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Sin sesión', { status: 401, headers: CORS })
  const { periodo } = (await req.json().catch(() => ({}))) as { periodo?: 'mensual' | 'anual' }
  const precio = periodo === 'anual' ? Deno.env.get('STRIPE_PRECIO_ANUAL') : Deno.env.get('STRIPE_PRECIO_MENSUAL')
  const origen = Deno.env.get('ORIGEN_APP')!
  const s = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: precio!, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { usuario: user.id, periodo: periodo ?? 'mensual' },
    subscription_data: { metadata: { usuario: user.id, periodo: periodo ?? 'mensual' } },
    success_url: `${origen}/#perfil--pro-ok`,
    cancel_url: `${origen}/#planes`,
    locale: 'es',
    automatic_tax: { enabled: true },
  })
  return new Response(JSON.stringify({ url: s.url }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
