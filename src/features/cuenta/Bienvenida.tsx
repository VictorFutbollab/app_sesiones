import { useState, type FormEvent } from 'react'
import type { RolEquipo, Usuario } from '../../model/comun'
import type { Repo } from '../../lib/db/repo'
import { entrar, entrarCon, recuperar, registrar, validarRegistro, type DatosRegistro } from '../../lib/cuenta'
import { MODO_DEMO } from '../../lib/supabase/cliente'
import { Logo } from '../../ui/Icono'

const ROLES: [RolEquipo, string][] = [['entrenador_principal', 'Entrenador/a principal'], ['ayudante', 'Ayudante'], ['preparador_fisico', 'Preparador/a físico'], ['coordinador', 'Coordinador/a']]

export function Bienvenida({ repo, listo }: { repo: Repo; listo: (u: Usuario) => void }) {
  const [modo, setModo] = useState<'registro' | 'entrar' | 'recuperar' | 'confirmar'>('registro')
  const [d, setD] = useState<DatosRegistro>({ nombre: '', email: '', password: '', rol: 'entrenador_principal', aceptaPrivacidad: false })
  const [errores, setErrores] = useState<Partial<Record<keyof DatosRegistro, string>>>({})
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = <K extends keyof DatosRegistro>(k: K, v: DatosRegistro[K]) => setD({ ...d, [k]: v })

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      setEnviando(true)
      if (modo === 'registro') {
        const errs = validarRegistro(d)
        setErrores(errs)
        if (Object.keys(errs).length) return
        const r = await registrar(repo, d)
        if (r === 'confirmar') setModo('confirmar')
        else listo(r)
      } else if (modo === 'entrar') {
        listo(await entrar(repo, d.email, d.password))
      } else if (modo === 'recuperar') {
        await recuperar(d.email)
        setError('Te hemos enviado un correo para elegir una contraseña nueva.')
      }
    } catch (x) {
      setError((x as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="bienvenida">
      <form className="tarjeta" onSubmit={enviar} noValidate>
        <div className="fila"><Logo t={40} /><div><div className="titulo" style={{ fontSize: '1.4em' }}>FutbolLab Sesiones</div><div className="ter">La sesión de mañana, lista en 5 minutos.</div></div></div>
        {MODO_DEMO ? <div className="banda" role="note">Modo demostración: tu cuenta y tus datos se guardan solo en este dispositivo.</div> : null}

        {modo === 'confirmar' ? (
          <>
            <h1>Revisa tu correo</h1>
            <p className="sec">Te hemos enviado un enlace a <strong>{d.email}</strong>. Ábrelo desde este móvil para entrar.</p>
            <button type="button" className="btn" onClick={() => setModo('entrar')}>Ya lo he confirmado</button>
          </>
        ) : (
          <>
            <h1>{modo === 'registro' ? 'Crea tu cuenta' : modo === 'entrar' ? 'Entra' : 'Recupera tu contraseña'}</h1>
            {!MODO_DEMO && modo !== 'recuperar' ? (
              <div className="pila">
                <button type="button" className="btn ancho" onClick={() => entrarCon('google').catch((x) => setError((x as Error).message))}>Continuar con Google</button>
                <button type="button" className="btn ancho" onClick={() => entrarCon('apple').catch((x) => setError((x as Error).message))}>Continuar con Apple</button>
                <div className="separador">o con tu correo</div>
              </div>
            ) : null}
            {modo === 'registro' ? (
              <label className="campo">Tu nombre<input autoComplete="name" value={d.nombre} onChange={(e) => set('nombre', e.target.value)} aria-invalid={!!errores.nombre} />{errores.nombre ? <span className="error">{errores.nombre}</span> : null}</label>
            ) : null}
            <label className="campo">Correo<input type="email" autoComplete="email" inputMode="email" value={d.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errores.email} />{errores.email ? <span className="error">{errores.email}</span> : null}</label>
            {!MODO_DEMO && modo !== 'recuperar' ? (
              <label className="campo">Contraseña<input type="password" autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} value={d.password} onChange={(e) => set('password', e.target.value)} aria-invalid={!!errores.password} />{errores.password ? <span className="error">{errores.password}</span> : <span className="ayuda">Mínimo 8 caracteres.</span>}</label>
            ) : null}
            {modo === 'registro' ? (
              <>
                <label className="campo">Tu papel en el equipo
                  <select value={d.rol} onChange={(e) => set('rol', e.target.value as RolEquipo)}>{ROLES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                </label>
                <label className="fila" style={{ alignItems: 'flex-start', gap: 10, fontSize: '0.9em' }}>
                  <input type="checkbox" checked={d.aceptaPrivacidad} onChange={(e) => set('aceptaPrivacidad', e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
                  <span>Acepto la <a href="/privacidad.html" target="_blank" rel="noopener">política de privacidad</a>. Si entreno a menores, el club gestiona el consentimiento de sus familias y aquí solo guardo nombre, dorsal, posición y asistencia.</span>
                </label>
                {errores.aceptaPrivacidad ? <span className="error" style={{ color: 'var(--danger)', fontSize: '0.88em' }}>{errores.aceptaPrivacidad}</span> : null}
              </>
            ) : null}
            {error ? <p role="alert" style={{ margin: 0, color: error.startsWith('Te hemos') ? 'var(--accent-2)' : 'var(--danger)' }}>{error}</p> : null}
            <button className="btn primario grande ancho" disabled={enviando}>{enviando ? 'Un momento…' : modo === 'registro' ? 'Crear cuenta' : modo === 'entrar' ? 'Entrar' : 'Enviar enlace'}</button>
            {!MODO_DEMO ? (
              <div className="fila entre">
                <button type="button" className="btn fantasma" onClick={() => setModo(modo === 'registro' ? 'entrar' : 'registro')}>{modo === 'registro' ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button>
                {modo === 'entrar' ? <button type="button" className="btn fantasma" onClick={() => setModo('recuperar')}>He olvidado la contraseña</button> : null}
              </div>
            ) : null}
          </>
        )}
      </form>
    </main>
  )
}
