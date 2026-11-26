// Edge Function "asistente": propone una sesión con ejercicios REALES de la biblioteca.
// 1) Comprueba la sesión y el límite del plan (registrar_uso_asistente, en la base de datos).
// 2) Lee los ejercicios que el usuario puede ver (RLS) y prefiltra 40 compatibles.
// 3) Claude elige y ordena entre esos ids (JSON estricto). 4) Se valida: ids inventados fuera.
// 5) Si Claude no está disponible o responde mal, se usa la propuesta por reglas.
// Secretos: ANTHROPIC_API_KEY (y opcional ASISTENTE_MODELO) solo aquí, nunca en la app.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { prefiltrar, proponer, validar, type EjercicioCandidato, type EntradaAsistente } from '../_shared/asistente.ts'

const CORS = { 'Access-Control-Allow-Origin': Deno.env.get('ORIGEN_APP') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Sin sesión' }, 401)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })

  const entrada = (await req.json().catch(() => null)) as EntradaAsistente | null
  if (!entrada || ![entrada.jugadores, entrada.minutos, entrada.espacioMax, entrada.edad].every((n) => Number.isFinite(n) && n > 0 && n < 500))
    return json({ error: 'Datos no válidos' }, 400)

  const uso = await sb.rpc('registrar_uso_asistente')
  if (uso.error) return json({ error: uso.error.message }, uso.error.code === 'P0001' ? 402 : 401)

  const { data, error } = await sb.from('ejercicios').select('id, datos').is('eliminado_en', null).eq('purgada', false).limit(1000)
  if (error) return json({ error: 'No se ha podido leer la biblioteca' }, 500)
  const lista = (data ?? []).map((f: { id: string; datos: EjercicioCandidato }) => ({ ...f.datos, id: f.id }))
  const candidatos = prefiltrar(lista, entrada)
  const porReglas = proponer(candidatos, entrada)

  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key || candidatos.length < 4) return json({ propuesta: porReglas, fuente: 'reglas' })

  const resumen = candidatos.map((c) => ({ id: c.id, titulo: c.titulo, tipo: c.tipo, fase: c.faseJuego, principio: c.principio, intensidad: c.intensidad }))
  const prompt = `Eres un entrenador de fútbol base. Monta una sesión de ${entrada.minutos} minutos para ${entrada.jugadores} jugadores de ${entrada.edad} años cuyo objetivo es "${entrada.principio}".
Usa SOLO ejercicios de esta lista (por su id); no inventes ninguno:
${JSON.stringify(resumen)}
Bloques obligatorios en este orden: activacion (intensidad baja-media), principal1 y principal2 (trabajan el objetivo, intensidad alta), calma (intensidad baja).
Responde SOLO con JSON: {"bloques":[{"tipo":"activacion|principal1|principal2|calma","ejercicioId":"<id de la lista>","motivo":"<máx. 15 palabras, en español, lenguaje de entrenador>"}]}`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: Deno.env.get('ASISTENTE_MODELO') ?? 'claude-sonnet-4-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) throw new Error(`Claude ${r.status}`)
    const cuerpo = await r.json()
    const texto: string = cuerpo?.content?.[0]?.text ?? ''
    const bruto = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1))
    const valida = validar(bruto, candidatos, entrada)
    if (!valida) throw new Error('Respuesta no válida')
    return json({ propuesta: valida, fuente: 'claude' })
  } catch (e) {
    console.error('asistente', e)
    return json({ propuesta: porReglas, fuente: 'reglas' })
  }
})
