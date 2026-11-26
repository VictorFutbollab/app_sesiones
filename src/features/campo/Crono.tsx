import { useEffect, useRef, useState } from 'react'
import { Icono } from '../../ui/Icono'

type Fase = 'listo' | 'trabajo' | 'descanso' | 'fin'

let audio: AudioContext | null = null
/** Pitido con Web Audio (sin archivos: funciona sin conexión) + vibración si existe. */
export function pitar(veces = 1, largo = 0.18, frecuencia = 880) {
  try {
    audio ??= new AudioContext()
    for (let i = 0; i < veces; i++) {
      const o = audio.createOscillator(), g = audio.createGain()
      const t = audio.currentTime + i * (largo + 0.12)
      o.frequency.value = frecuencia
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + largo)
      o.connect(g).connect(audio.destination)
      o.start(t)
      o.stop(t + largo + 0.05)
    }
  } catch { /* sin audio */ }
  navigator.vibrate?.(Array.from({ length: veces * 2 - 1 }, (_, i) => (i % 2 ? 120 : 220)))
}

const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/**
 * Cronómetro por series. El tiempo se calcula con marcas de reloj (no con "ticks"),
 * así sigue siendo exacto aunque el móvil bloquee la pantalla un momento.
 * Avisos: inicio de serie (1 pitido), 10 s para el final (1 corto), fin de serie (2), fin de descanso (3).
 */
export function Crono({ series, minutos, descanso, alTerminar }: { series: number; minutos: number; descanso: number; alTerminar?: () => void }) {
  const [fase, setFase] = useState<Fase>('listo')
  const [serie, setSerie] = useState(1)
  const [restante, setRestante] = useState(minutos * 60)
  const [corriendo, setCorriendo] = useState(false)
  const fin = useRef(0)
  const avisado = useRef(false)

  useEffect(() => {
    setFase('listo'); setSerie(1); setRestante(minutos * 60); setCorriendo(false)
  }, [series, minutos, descanso])

  useEffect(() => {
    if (!corriendo) return
    const iv = setInterval(() => {
      const r = (fin.current - Date.now()) / 1000
      setRestante(r)
      if (fase === 'trabajo' && r <= 10 && !avisado.current) {
        avisado.current = true
        pitar(1, 0.1, 660)
      }
      if (r > 0) return
      avisado.current = false
      if (fase === 'trabajo') {
        if (serie >= series) {
          pitar(3, 0.25)
          setFase('fin'); setCorriendo(false); setRestante(0)
          alTerminar?.()
        } else if (descanso > 0) {
          pitar(2)
          setFase('descanso'); fin.current = Date.now() + descanso * 1000
        } else {
          pitar(1)
          setSerie(serie + 1); fin.current = Date.now() + minutos * 60 * 1000
        }
      } else if (fase === 'descanso') {
        pitar(3, 0.12, 990)
        setSerie(serie + 1); setFase('trabajo'); fin.current = Date.now() + minutos * 60 * 1000
      }
    }, 200)
    return () => clearInterval(iv)
  }, [corriendo, fase, serie, series, minutos, descanso, alTerminar])

  function alternar() {
    if (fase === 'fin') return
    if (corriendo) {
      setCorriendo(false)
      return
    }
    if (fase === 'listo') {
      setFase('trabajo')
      pitar(1)
      fin.current = Date.now() + minutos * 60 * 1000
    } else fin.current = Date.now() + restante * 1000
    setCorriendo(true)
  }

  const reiniciar = () => { setCorriendo(false); setFase('listo'); setSerie(1); setRestante(minutos * 60); avisado.current = false }
  const mas = () => { fin.current += 60_000; setRestante((r) => r + 60) }

  return (
    <div className="crono tarjeta">
      <span className="sec" aria-live="polite">{fase === 'fin' ? 'Ejercicio terminado' : `Serie ${serie} de ${series}${fase === 'descanso' ? ' · descanso' : ''}`}</span>
      <div className={`tiempo${fase === 'descanso' ? ' descanso' : ''}${fase === 'trabajo' && restante <= 10 ? ' aviso' : ''}`} role="timer" aria-label="Tiempo restante">{mmss(restante)}</div>
      <div className="fila" style={{ justifyContent: 'center' }}>
        <button className="btn primario grande" style={{ minWidth: 160 }} onClick={alternar} disabled={fase === 'fin'}>
          <Icono n={corriendo ? 'pausa' : 'play'} /> {corriendo ? 'Pausa' : fase === 'listo' ? 'Empezar' : 'Seguir'}
        </button>
        <button className="btn grande" onClick={mas} disabled={fase === 'listo' || fase === 'fin'} aria-label="Añadir un minuto">+1′</button>
        <button className="btn grande" onClick={reiniciar} aria-label="Reiniciar"><Icono n="reiniciar" /></button>
      </div>
    </div>
  )
}
