/**
 * PDF de una sesión o un ejercicio, generado EN EL DISPOSITIVO (funciona sin conexión).
 * La pizarra se dibuja en vectorial: se lee nítida impresa o ampliada en el móvil.
 * Gratis: marca de agua. Pro: sin marca y con el escudo del club.
 */
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Ejercicio, Pizarra, Sesion } from '../../model/sesiones'
import type { Equipo } from '../../model/comun'
import { COLOR, radio } from '../../features/pizarra/dibujo'
import { duracionTotal, cargaEstimada, nivelCarga } from '../../logic/carga'
import { nombreBloque, TIPOS } from '../../data/taxonomia'

const A4: [number, number] = [595.28, 841.89]
const M = 40
const VERDE = rgb(0.12, 0.62, 0.33)
const TINTA = rgb(0.06, 0.1, 0.08)
const GRIS = rgb(0.38, 0.45, 0.4)

/** Las fuentes estándar de PDF solo tienen WinAnsi: se sustituye lo que no cabe. */
const limpio = (s: string) => s.replace(/[′’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E -ÿ–—•…€]/g, '-')

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function lineas(texto: string, f: PDFFont, t: number, ancho: number): string[] {
  const out: string[] = []
  for (const parrafo of limpio(texto).split('\n')) {
    let l = ''
    for (const w of parrafo.split(' ')) {
      const prueba = l ? `${l} ${w}` : w
      if (f.widthOfTextAtSize(prueba, t) > ancho && l) {
        out.push(l)
        l = w
      } else l = prueba
    }
    out.push(l)
  }
  return out
}

export function dibujarPizarra(page: PDFPage, p: Pizarra, x: number, yArriba: number, ancho: number, fase = 0) {
  const s = ancho / p.ancho
  const alto = p.largo * s
  const X = (m: number) => x + m * s
  const Y = (m: number) => yArriba - m * s
  page.drawRectangle({ x, y: yArriba - alto, width: ancho, height: alto, color: hex('#1C5A34') })
  const franjas = Math.max(4, Math.round(p.largo / 6))
  for (let i = 1; i < franjas; i += 2) page.drawRectangle({ x, y: Y(((i + 1) * p.largo) / franjas), width: ancho, height: (p.largo / franjas) * s, color: hex('#1F6239') })
  const blanco = rgb(1, 1, 1)
  const gl = Math.max(0.6, ancho / 300)
  page.drawRectangle({ x, y: yArriba - alto, width: ancho, height: alto, borderColor: blanco, borderWidth: gl })
  if (p.campo === 'completo') page.drawLine({ start: { x, y: Y(p.largo / 2) }, end: { x: x + ancho, y: Y(p.largo / 2) }, thickness: gl, color: blanco })
  if (p.campo !== 'reducido') {
    const aw = Math.min(40.3, p.ancho * 0.6), ah = Math.min(16.5, p.largo * 0.3)
    page.drawRectangle({ x: X((p.ancho - aw) / 2), y: Y(ah), width: aw * s, height: ah * s, borderColor: blanco, borderWidth: gl })
  }
  const r = radio(p) * s
  const f = p.fases[Math.min(fase, p.fases.length - 1)]
  for (const fl of f?.flechas ?? []) {
    const c = fl.tipo === 'tiro' ? hex('#FFD23F') : blanco
    page.drawLine({ start: { x: X(fl.desde.x), y: Y(fl.desde.y) }, end: { x: X(fl.hasta.x), y: Y(fl.hasta.y) }, thickness: r * 0.22, color: c, dashArray: fl.tipo === 'desmarque' ? [r * 0.6, r * 0.45] : fl.tipo === 'conduccion' ? [r * 0.25, r * 0.25] : undefined })
    const ang = Math.atan2(Y(fl.hasta.y) - Y(fl.desde.y), X(fl.hasta.x) - X(fl.desde.x))
    const px = X(fl.hasta.x), py = Y(fl.hasta.y), k = r * 0.8
    page.drawSvgPath(`M ${px} ${-py} L ${px - k * Math.cos(ang - 0.45)} ${-(py - k * Math.sin(ang - 0.45))} L ${px - k * Math.cos(ang + 0.45)} ${-(py - k * Math.sin(ang + 0.45))} Z`, { x: 0, y: 0, color: c })
  }
  for (const e of p.elementos) {
    const pos = f?.posiciones[e.id] ?? e
    const cx = X(pos.x), cy = Y(pos.y)
    const c = hex(COLOR[e.tipo])
    if (e.tipo === 'porteria' || e.tipo === 'miniporteria') {
      const w = (e.tipo === 'porteria' ? 7.32 : 2.4) * s
      page.drawRectangle({ x: cx - w / 2, y: cy - r * 0.35, width: w, height: r * 0.7, borderColor: blanco, borderWidth: r * 0.14 })
    } else if (e.tipo === 'cono') {
      page.drawSvgPath(`M ${cx - r * 0.55} ${-(cy - r * 0.45)} L ${cx} ${-(cy + r * 0.6)} L ${cx + r * 0.55} ${-(cy - r * 0.45)} Z`, { x: 0, y: 0, color: c })
    } else if (e.tipo === 'pica' || e.tipo === 'valla') {
      const v = e.tipo === 'pica'
      page.drawRectangle({ x: cx - (v ? r * 0.12 : r * 0.9), y: cy - (v ? r * 0.9 : r * 0.18), width: v ? r * 0.24 : r * 1.8, height: v ? r * 1.8 : r * 0.36, color: c })
    } else if (e.tipo === 'balon') {
      page.drawCircle({ x: cx, y: cy, size: r * 0.42, color: blanco, borderColor: TINTA, borderWidth: r * 0.08 })
    } else {
      page.drawCircle({ x: cx, y: cy, size: r, color: c, borderColor: rgb(0, 0, 0), borderWidth: r * 0.08, borderOpacity: 0.5 })
    }
  }
  return alto
}

interface Contexto { equipo: Equipo; pro: boolean; autor: string }

async function nuevoDoc(ctx: Contexto, titulo: string) {
  const doc = await PDFDocument.create()
  doc.setTitle(limpio(titulo))
  doc.setAuthor(limpio(ctx.autor))
  doc.setCreator('FutbolLab Sesiones')
  const reg = await doc.embedFont(StandardFonts.Helvetica)
  const neg = await doc.embedFont(StandardFonts.HelveticaBold)
  let escudo: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null
  if (ctx.pro && ctx.equipo.escudo?.startsWith('data:image/png')) escudo = await doc.embedPng(ctx.equipo.escudo)
  else if (ctx.pro && ctx.equipo.escudo?.startsWith('data:image/jp')) escudo = await doc.embedJpg(ctx.equipo.escudo)
  const pagina = () => {
    const p = doc.addPage(A4)
    if (!ctx.pro) {
      p.drawText('FutbolLab Sesiones · plan Gratis', { x: 110, y: 300, size: 34, font: neg, color: VERDE, opacity: 0.09, rotate: degrees(35) })
    }
    p.drawText(limpio(`FutbolLab Sesiones${ctx.pro ? '' : ' · futbollab.com'}`), { x: M, y: 22, size: 8, font: reg, color: GRIS })
    return p
  }
  return { doc, reg, neg, escudo, pagina }
}

function texto(p: PDFPage, s: string, x: number, y: number, f: PDFFont, t: number, ancho: number, color = TINTA, interlineado = 1.3) {
  const ls = lineas(s, f, t, ancho)
  ls.forEach((l, i) => p.drawText(l, { x, y: y - i * t * interlineado, size: t, font: f, color }))
  return ls.length * t * interlineado
}

function fichaCorta(p: PDFPage, e: Ejercicio, f: { reg: PDFFont; neg: PDFFont }, x: number, y: number, ancho: number) {
  let dy = 0
  const sec = (tit: string, cuerpo: string) => {
    if (!cuerpo.trim()) return
    p.drawText(limpio(tit.toUpperCase()), { x, y: y - dy, size: 7.5, font: f.neg, color: GRIS })
    dy += 11
    dy += texto(p, cuerpo, x, y - dy, f.reg, 9, ancho) + 6
  }
  sec('Objetivo', e.objetivo)
  sec('Organización', e.organizacion)
  sec('Desarrollo', e.desarrollo)
  sec('Consignas', e.consignas.map((c) => `• ${c}`).join('\n'))
  sec('Material', e.material.join(', '))
  return dy
}

export async function pdfSesion(s: Sesion, ejercicios: Map<string, Ejercicio>, ctx: Contexto & { presentes?: number }): Promise<Blob> {
  const { doc, reg, neg, escudo, pagina } = await nuevoDoc(ctx, `Sesión ${s.fecha}`)
  let p = pagina()
  let y = A4[1] - M
  if (escudo) {
    const d = escudo.scaleToFit(48, 48)
    p.drawImage(escudo, { x: A4[0] - M - d.width, y: y - d.height, width: d.width, height: d.height })
  }
  p.drawText(limpio(ctx.equipo.nombre), { x: M, y: y - 12, size: 11, font: neg, color: VERDE })
  p.drawText(limpio(`${s.fecha}${s.hora ? ` · ${s.hora}` : ''}`), { x: M, y: y - 26, size: 10, font: reg, color: GRIS })
  y -= 40
  y -= texto(p, s.objetivo || 'Sesión de entrenamiento', M, y - 18, neg, 22, A4[0] - 2 * M - 60) + 8
  const carga = cargaEstimada(s.bloques, ejercicios)
  p.drawText(limpio(`${duracionTotal(s.bloques)} min  ·  ${s.bloques.length} ejercicios  ·  carga estimada ${carga} UA (${nivelCarga(carga)})${ctx.presentes != null ? `  ·  ${ctx.presentes} presentes` : ''}`), { x: M, y: y - 6, size: 10, font: reg, color: TINTA })
  y -= 26
  const bloques = [...s.bloques].sort((a, b) => ['activacion', 'principal1', 'principal2', 'calma'].indexOf(a.tipo) - ['activacion', 'principal1', 'principal2', 'calma'].indexOf(b.tipo) || a.orden - b.orden)
  for (const b of bloques) {
    const e = ejercicios.get(b.ejercicioId)
    if (!e) continue
    const anchoPiz = 200
    const altoPiz = (e.pizarra.largo / e.pizarra.ancho) * anchoPiz
    const alto = Math.max(Math.min(altoPiz, 260), 150) + 40
    if (y - alto < M + 20) {
      p = pagina()
      y = A4[1] - M
    }
    p.drawRectangle({ x: M, y: y - 20, width: A4[0] - 2 * M, height: 20, color: rgb(0.93, 0.96, 0.93) })
    p.drawText(limpio(`${nombreBloque(b.tipo).toUpperCase()}  ·  ${b.minutos} min`), { x: M + 8, y: y - 14, size: 9, font: neg, color: VERDE })
    p.drawText(limpio(`${e.series} × ${e.duracion}' · descanso ${e.descanso}"`), { x: A4[0] - M - 120, y: y - 14, size: 9, font: reg, color: GRIS })
    y -= 30
    p.drawText(limpio(e.titulo), { x: M, y: y - 12, size: 13, font: neg, color: TINTA })
    const escala = Math.min(1, 260 / altoPiz)
    dibujarPizarra(p, e.pizarra, M, y - 20, anchoPiz * escala, e.pizarra.fases.length - 1)
    fichaCorta(p, e, { reg, neg }, M + anchoPiz + 16, y - 26, A4[0] - 2 * M - anchoPiz - 16)
    y -= alto
  }
  return new Blob([new Uint8Array(await doc.save())], { type: 'application/pdf' })
}

export async function pdfEjercicio(e: Ejercicio, ctx: Contexto): Promise<Blob> {
  const { doc, reg, neg, pagina } = await nuevoDoc(ctx, e.titulo)
  const p = pagina()
  let y = A4[1] - M
  p.drawText(limpio(`${TIPOS[e.tipo]} · ${e.jugadoresMin}-${e.jugadoresMax} jugadores · ${e.espacio.ancho}×${e.espacio.largo} m · ${e.series} × ${e.duracion}'`), { x: M, y: y - 10, size: 9, font: reg, color: GRIS })
  y -= 16
  y -= texto(p, e.titulo, M, y - 20, neg, 22, A4[0] - 2 * M) + 10
  const ancho = 250
  const fases = e.pizarra.fases.slice(0, 2)
  fases.forEach((_, i) => {
    const a = dibujarPizarra(p, e.pizarra, M + i * (ancho + 15), y, ancho * Math.min(1, 300 / ((e.pizarra.largo / e.pizarra.ancho) * ancho)), i)
    p.drawText(limpio(`Fase ${i + 1}: ${e.pizarra.fases[i].nombre}`), { x: M + i * (ancho + 15), y: y - a - 12, size: 8, font: reg, color: GRIS })
  })
  y -= Math.min(300, (e.pizarra.largo / e.pizarra.ancho) * ancho) + 30
  const col = A4[0] - 2 * M
  const sec = (t: string, c: string) => {
    if (!c.trim()) return
    p.drawText(limpio(t.toUpperCase()), { x: M, y, size: 8, font: neg, color: GRIS })
    y -= 12
    y -= texto(p, c, M, y, reg, 10, col) + 6
  }
  sec('Objetivo', e.objetivo)
  sec('Organización', e.organizacion)
  sec('Desarrollo', e.desarrollo)
  sec('Reglas', e.reglas.map((x) => `• ${x}`).join('\n'))
  sec('Variantes', [...e.variantes.facil.map((x) => `• Más fácil: ${x}`), ...e.variantes.dificil.map((x) => `• Más difícil: ${x}`)].join('\n'))
  sec('Consignas', e.consignas.map((x) => `• ${x}`).join('\n'))
  sec('Errores típicos', e.errores.map((x) => `• ${x}`).join('\n'))
  sec('Material', e.material.join(', '))
  if (e.origen === 'demo') p.drawText('Ejercicio de demostración de FutbolLab', { x: M, y: M, size: 8, font: reg, color: GRIS })
  return new Blob([new Uint8Array(await doc.save())], { type: 'application/pdf' })
}
