/**
 * Cuenta del entrenador.
 *  - Con Supabase: correo + contraseña (confirmación por email), Google o Apple (OAuth/PKCE).
 *    El plan y el rol se leen SIEMPRE del servidor (tabla profiles).
 *  - Modo demostración: la cuenta vive solo en este dispositivo; no hay contraseña
 *    que proteger porque no hay servidor. Se indica en pantalla.
 */
import type { Plan, RolEquipo, Usuario } from '../model/comun'
import { MODO_DEMO, supabase, errorLegible } from './supabase/cliente'
import { ahora } from '../logic/id'
import type { Repo } from './db/repo'

export const VERSION_PRIVACIDAD = '2026.1'

export interface DatosRegistro {
  nombre: string
  email: string
  password: string
  rol: RolEquipo
  aceptaPrivacidad: boolean
}

export function validarRegistro(d: DatosRegistro): Partial<Record<keyof DatosRegistro, string>> {
  const e: Partial<Record<keyof DatosRegistro, string>> = {}
  if (d.nombre.trim().length < 2) e.nombre = 'Escribe tu nombre.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'Revisa el correo.'
  if (!MODO_DEMO && d.password.length < 8) e.password = 'Mínimo 8 caracteres.'
  if (!d.aceptaPrivacidad) e.aceptaPrivacidad = 'Necesitamos que aceptes la política de privacidad.'
  return e
}

export async function registrar(repo: Repo, d: DatosRegistro): Promise<Usuario | 'confirmar'> {
  if (MODO_DEMO) {
    const u: Usuario = { id: crypto.randomUUID(), nombre: d.nombre.trim(), email: d.email.trim().toLowerCase(), rol: d.rol, plan: 'gratis', proHasta: null, creadoEn: ahora() }
    await repo.setMeta('usuario', u)
    await repo.setMeta('privacidad', { version: VERSION_PRIVACIDAD, fecha: ahora() })
    return u
  }
  const r = await supabase!.auth.signUp({
    email: d.email.trim(), password: d.password,
    options: { data: { nombre: d.nombre.trim(), acepta_privacidad: 'true', version_privacidad: VERSION_PRIVACIDAD }, emailRedirectTo: location.origin },
  })
  if (r.error) throw new Error(errorLegible(r.error))
  await repo.setMeta('rol', d.rol)
  if (!r.data.session) return 'confirmar'
  return (await usuarioDelServidor(repo))!
}

export async function entrar(repo: Repo, email: string, password: string): Promise<Usuario> {
  const r = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
  if (r.error) throw new Error(errorLegible(r.error))
  return (await usuarioDelServidor(repo))!
}

export async function entrarCon(proveedor: 'google' | 'apple') {
  const r = await supabase!.auth.signInWithOAuth({ provider: proveedor, options: { redirectTo: location.origin } })
  if (r.error) throw new Error(errorLegible(r.error))
}

export async function recuperar(email: string) {
  const r = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin })
  if (r.error) throw new Error(errorLegible(r.error))
}

/** Perfil desde el servidor (plan y rol nunca se fían del dispositivo). Sin red, usa la última copia. */
export async function usuarioDelServidor(repo: Repo): Promise<Usuario | null> {
  const { data } = await supabase!.auth.getSession()
  if (!data.session) return null
  const p = await supabase!.from('profiles').select('id, nombre, email, plan, pro_hasta, creado_en').eq('id', data.session.user.id).maybeSingle()
  if (p.error || !p.data) return (await repo.meta<Usuario>('usuario')) ?? null
  const u: Usuario = { id: p.data.id, nombre: p.data.nombre, email: p.data.email, plan: p.data.plan as Plan, proHasta: p.data.pro_hasta, creadoEn: p.data.creado_en, rol: (await repo.meta<RolEquipo>('rol')) ?? 'entrenador_principal' }
  await repo.setMeta('usuario', u)
  return u
}

export async function usuarioActual(repo: Repo): Promise<Usuario | null> {
  if (MODO_DEMO) return (await repo.meta<Usuario>('usuario')) ?? null
  try {
    return await usuarioDelServidor(repo)
  } catch {
    return (await repo.meta<Usuario>('usuario')) ?? null // sin señal: abre con lo último
  }
}

export async function cerrarSesion() {
  if (!MODO_DEMO) await supabase!.auth.signOut().catch(() => undefined)
}

/** Borrar la cuenta (RGPD art. 17). En servidor, la cascada borra todos sus datos. */
export async function borrarCuenta() {
  if (MODO_DEMO) return
  const r = await supabase!.functions.invoke('borrar-cuenta', { method: 'POST' })
  if (r.error) throw new Error('No se ha podido borrar la cuenta. Escríbenos y lo haremos a mano.')
}
