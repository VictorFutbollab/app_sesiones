import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase del proyecto PROPIO de Sesiones. Solo la clave pública (anon):
 * los permisos los decide la base de datos (RLS). La service_role nunca va en la app.
 *
 * Sin variables de entorno, la app funciona en MODO DEMOSTRACIÓN: todo se guarda en
 * este dispositivo y no hay cuentas en servidor. Se indica siempre en pantalla.
 */
const limpio = (v: unknown) => (typeof v === 'string' ? v.replace(/[^\x21-\x7e]/g, '') : '') || undefined
const url = limpio(import.meta.env.VITE_SUPABASE_URL)
const clave = limpio(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const MODO_DEMO = !url || !clave

export const supabase: SupabaseClient | null = MODO_DEMO
  ? null
  : createClient(url!, clave!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } })

/** Mensajes del servidor en lenguaje de entrenador. */
export function errorLegible(e: unknown): string {
  const err = e as { message?: string; code?: string } | null
  const m = err?.message ?? String(e)
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/User already registered/i.test(m)) return 'Ya hay una cuenta con ese correo. Entra con tu contraseña.'
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo: te hemos enviado un enlace.'
  if (/rate limit/i.test(m)) return 'Demasiados intentos seguidos. Espera unos minutos.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Inténtalo cuando vuelva la señal.'
  if (/Password should be/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.'
  return m
}
