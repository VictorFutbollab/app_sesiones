import { useEffect, useState } from 'react'
import { useApp } from '../../app/estado'
import type { EntradaHistorial } from '../../lib/db/idb'
import { escuchar } from '../../lib/eventos'

const ACCION: Record<string, string> = { crear: 'Creado', editar: 'Cambiado', borrar: 'A la papelera', restaurar: 'Recuperado', purgar: 'Borrado' }
const CAMPO: Record<string, string> = { titulo: 'título', objetivo: 'objetivo', bloques: 'bloques', fecha: 'fecha', pizarra: 'pizarra', estado: 'estado', texto: 'texto', nombre: 'nombre', archivado: 'archivado', eliminadoEn: 'papelera', carpetaIds: 'carpetas' }

/** Historial de cambios (acción común): qué cambió, cuándo y si llegó al servidor. */
export function Historial({ filaId }: { filaId: string }) {
  const { repo } = useApp()
  const [h, setH] = useState<EntradaHistorial[]>([])
  useEffect(() => {
    const cargar = () => repo.historial(filaId).then(setH)
    void cargar()
    return escuchar(() => void cargar())
  }, [repo, filaId])
  if (!h.length) return <p className="sec">Sin cambios registrados en este dispositivo.</p>
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
      {h.map((x) => (
        <li key={x.id} className="nota-t">
          <div className="fila entre">
            <strong>{ACCION[x.tipo]}</strong>
            <span className="ter">{new Date(x.ts).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          {x.tipo === 'editar' ? <p className="sec" style={{ margin: '4px 0 0' }}>{x.campos.filter((c) => c !== 'actualizadoEn').map((c) => CAMPO[c] ?? c).join(', ')}</p> : null}
          <p className="ter" style={{ margin: '4px 0 0' }}>
            {x.estado === 'pendiente' ? 'Guardado en el móvil, pendiente de subir' : x.estado === 'rechazada' ? `No se pudo guardar en el servidor: ${x.motivo}` : 'Sincronizado'}
            {x.conflictos?.length ? ` · ${x.conflictos.length} cambio(s) de otro dispositivo más reciente(s) prevalecieron` : ''}
          </p>
        </li>
      ))}
    </ol>
  )
}
