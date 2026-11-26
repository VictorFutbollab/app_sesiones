// Edge Function "borrar-cuenta" (RGPD art. 17, y exigencia de Apple/Google).
// Borra el usuario de Auth con service_role: la cascada elimina perfil, equipos que creó,
// sesiones, asistencias, notas… Los audios de Storage se borran antes.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const CORS = { 'Access-Control-Allow-Origin': Deno.env.get('ORIGEN_APP') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const usuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await usuario.auth.getUser()
  if (!user) return new Response('Sin sesión', { status: 401, headers: CORS })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: audios } = await admin.storage.from('audios').list(user.id, { limit: 1000 })
  if (audios?.length) await admin.storage.from('audios').remove(audios.map((a) => `${user.id}/${a.name}`))
  const r = await admin.auth.admin.deleteUser(user.id)
  if (r.error) return new Response(r.error.message, { status: 500, headers: CORS })
  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
