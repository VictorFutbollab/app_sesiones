import { useState } from 'react'
import { useApp } from '../../app/estado'
import { ir } from '../../app/router'
import { PRINCIPIOS, nombreBloque } from '../../data/taxonomia'
import { proponer, type EntradaAsistente, type Propuesta } from '../../../supabase/functions/_shared/asistente'
import type { Ejercicio } from '../../model/sesiones'
import { puedeUsarAsistente, LIMITES } from '../../logic/planes'
import { MODO_DEMO, supabase } from '../../lib/supabase/cliente'
import { Hoja, Paso } from '../../ui/base'
import { Icono } from '../../ui/Icono'

/**
 * "Proponme una sesión" a partir de 4 datos. Con servidor y señal, la propuesta la hace
 * la Edge Function (Claude + validación). Sin señal o en demostración, las mismas reglas
 * corren en el móvil. En los dos casos solo se usan ejercicios de TU biblioteca.
 */
export function Asistente({ abierta, cerrar, biblioteca, edad, jugadores, aplicar, objetivoInicial }: {
  abierta: boolean; cerrar: () => void; biblioteca: Ejercicio[]; edad: number; jugadores: number; objetivoInicial: string
  aplicar: (p: Propuesta, principio: string) => void
}) {
  const { pro, usosAsistente, sumarUsoAsistente, aviso } = useApp()
  const [x, setX] = useState<EntradaAsistente>({ principio: PRINCIPIOS.includes(objetivoInicial) ? objetivoInicial : PRINCIPIOS[0], jugadores, minutos: 75, espacioMax: 40, edad })
  const [res, setRes] = useState<{ p: Propuesta; fuente: string } | null>(null)
  const [cargando, setCargando] = useState(false)
  const porId = new Map(biblioteca.map((e) => [e.id, e]))
  const quedan = pro ? null : Math.max(0, LIMITES.gratis.asistenteMes - usosAsistente)

  async function pedir() {
    const b = puedeUsarAsistente(pro ? 'pro' : 'gratis', usosAsistente)
    if (b) return aviso(b.motivo, { texto: 'Ver Pro', hacer: () => ir({ n: 'planes' }) })
    setCargando(true)
    try {
      if (!MODO_DEMO && navigator.onLine) {
        const r = await supabase!.functions.invoke('asistente', { body: x })
        if (r.error) throw r.error
        const data = r.data as { propuesta: Propuesta; fuente: string }
        // La propuesta del servidor solo puede traer ejercicios que el dispositivo conoce.
        data.propuesta.bloques = data.propuesta.bloques.filter((b) => porId.has(b.ejercicioId))
        setRes({ p: data.propuesta, fuente: data.fuente })
      } else {
        setRes({ p: proponer(biblioteca, x), fuente: 'reglas' })
      }
      await sumarUsoAsistente()
    } catch (e) {
      const m = (e as { message?: string }).message ?? ''
      if (/3 propuestas/.test(m)) aviso(m)
      else setRes({ p: proponer(biblioteca, x), fuente: 'reglas' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <Hoja titulo="Proponme una sesión" abierta={abierta} cerrar={cerrar}
      pie={res?.p.bloques.length ? (
        <div className="fila"><button className="btn" onClick={() => setRes(null)}>Cambiar datos</button><button className="btn primario grande" style={{ flex: 1 }} onClick={() => { aplicar(res.p, x.principio); cerrar() }}>Usar esta sesión</button></div>
      ) : (
        <button className="btn primario grande ancho" onClick={pedir} disabled={cargando}><Icono n="chispa" /> {cargando ? 'Preparando…' : 'Proponer'}</button>
      )}>
      {!res ? (
        <div className="pila">
          <label className="campo">¿Qué quieres trabajar?
            <select value={x.principio} onChange={(e) => setX({ ...x, principio: e.target.value })}>{PRINCIPIOS.filter((p) => p !== 'Activación' && p !== 'Recuperación').map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <div className="fila entre"><span className="sec">Jugadores disponibles</span><Paso etiqueta="jugadores" valor={x.jugadores} min={4} max={30} cambiar={(n) => setX({ ...x, jugadores: n })} /></div>
          <div className="fila entre"><span className="sec">Minutos</span><Paso etiqueta="minutos" valor={x.minutos} min={30} max={120} paso={5} sufijo="′" cambiar={(n) => setX({ ...x, minutos: n })} /></div>
          <div className="campo"><span>Espacio (lado largo)</span>
            <div className="chips">{[20, 30, 40, 55, 105].map((m) => <button key={m} className="chip" aria-pressed={x.espacioMax === m} onClick={() => setX({ ...x, espacioMax: m })}>{m === 105 ? 'Campo entero' : `${m} m`}</button>)}</div>
          </div>
          <p className="ter" style={{ margin: 0 }}>Edad: {edad} años (de tu equipo). Solo usa ejercicios de tu biblioteca.{quedan != null ? ` Te quedan ${quedan} propuestas este mes.` : ''}</p>
        </div>
      ) : (
        <div className="pila">
          {res.p.avisos.map((a) => <div key={a} className="banda">{a}</div>)}
          {res.p.bloques.map((b) => (
            <div key={b.tipo} className="nota-t">
              <div className="fila entre"><span className="etiqueta">{nombreBloque(b.tipo)}</span><span className="num sec">{b.minutos}′</span></div>
              <strong style={{ display: 'block', marginTop: 6 }}>{porId.get(b.ejercicioId)?.titulo}</strong>
              <span className="ter">{b.motivo}</span>
            </div>
          ))}
          <p className="ter" style={{ margin: 0 }}>Propuesta {res.fuente === 'claude' ? 'del asistente' : 'por reglas (sin conexión)'} · podrás cambiar cualquier ejercicio después.</p>
        </div>
      )}
    </Hoja>
  )
}
