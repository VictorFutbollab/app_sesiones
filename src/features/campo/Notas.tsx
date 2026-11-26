import { useEffect, useRef, useState } from 'react'
import { useApp, useTabla } from '../../app/estado'
import { hoy } from '../../logic/id'
import { Icono } from '../../ui/Icono'

type Reconocimiento = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void }
const Reconocedor = (globalThis as unknown as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento }).SpeechRecognition
  ?? (globalThis as unknown as { webkitSpeechRecognition?: new () => Reconocimiento }).webkitSpeechRecognition

function Audio({ id }: { id: string }) {
  const { repo } = useApp()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let u: string | null = null
    void repo.audio(id).then((b) => b && setUrl((u = URL.createObjectURL(b))))
    return () => void (u && URL.revokeObjectURL(u))
  }, [repo, id])
  return url ? <audio controls src={url} style={{ width: '100%', height: 40 }} /> : <span className="ter">Audio no disponible en este dispositivo</span>
}

/**
 * Notas de texto y de voz. La voz se graba en el dispositivo (sin conexión).
 * Transcripción (Pro): la hace el propio navegador mientras se graba, si lo permite.
 */
export function Notas({ sesionId = null, ejercicioId = null, grande = false }: { sesionId?: string | null; ejercicioId?: string | null; grande?: boolean }) {
  const { repo, pro, aviso } = useApp()
  const notas = (useTabla('notas') ?? []).filter((n) => (sesionId ? n.sesionId === sesionId : n.ejercicioId === ejercicioId) && (ejercicioId ? true : !n.ejercicioId || n.sesionId === sesionId))
  const [texto, setTexto] = useState('')
  const [grabando, setGrabando] = useState(false)
  const rec = useRef<MediaRecorder | null>(null)
  const voz = useRef<Reconocimiento | null>(null)
  const transcripcion = useRef('')

  async function guardar(t: string, audioId: string | null = null, transcrita = false) {
    if (!t.trim() && !audioId) return
    await repo.guardar('notas', { ...repo.nuevaMeta(), sesionId, ejercicioId, texto: t.trim(), audioId, transcrita, fecha: hoy() })
    setTexto('')
  }

  async function grabar() {
    if (grabando) {
      rec.current?.stop()
      voz.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const trozos: Blob[] = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => trozos.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setGrabando(false)
        const blob = new Blob(trozos, { type: mr.mimeType || 'audio/webm' })
        const id = await repo.guardarAudio(blob)
        await guardar(transcripcion.current || (pro ? '' : 'Nota de voz'), id, !!transcripcion.current)
        transcripcion.current = ''
        aviso('Nota de voz guardada')
      }
      rec.current = mr
      mr.start()
      setGrabando(true)
      if (pro && Reconocedor) {
        const r = new Reconocedor()
        r.lang = 'es-ES'
        r.continuous = true
        r.interimResults = false
        r.onresult = (e) => (transcripcion.current = Array.from(e.results).map((x) => x[0].transcript).join(' '))
        r.onerror = () => undefined
        r.start()
        voz.current = r
      }
    } catch {
      aviso('No hay permiso para usar el micrófono.')
    }
  }

  return (
    <div className="pila">
      {notas.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).map((n) => (
        <div key={n.id} className="nota-t">
          {n.texto ? <p style={{ margin: 0 }}>{n.texto}</p> : null}
          {n.audioId ? <Audio id={n.audioId} /> : null}
          <div className="fila entre"><span className="ter">{n.fecha}{n.audioId && !n.transcrita ? (pro ? ' · sin transcripción' : ' · transcripción con Pro') : ''}</span>
            <button className="btn-icono" aria-label="Borrar nota" onClick={() => repo.papelera('notas', n.id)}><Icono n="papelera" t={18} /></button>
          </div>
        </div>
      ))}
      <div className="fila-nota">
        <input className="entrada" placeholder="Escribe una nota" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void guardar(texto)} aria-label="Nota" />
        <button className="btn" onClick={() => guardar(texto)} disabled={!texto.trim()}>Guardar</button>
        {typeof MediaRecorder !== 'undefined' ? (
          <button className={`btn${grabando ? ' primario' : ''}${grande ? ' grande' : ''}`} onClick={grabar} aria-pressed={grabando}>
            <Icono n="micro" t={18} /> {grabando ? 'Parar' : 'Voz'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
