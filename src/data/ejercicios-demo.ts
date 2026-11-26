/**
 * Ejercicios de DEMOSTRACIÓN. Son tareas genéricas de fútbol base escritas para el
 * prototipo; no están atribuidas a ningún entrenador real ni revisadas por el comité
 * técnico. En la app se muestran con la etiqueta "Demostración".
 */
import type { Ejercicio } from '../model/sesiones'
import { pizarra } from './pizarra-dsl'

/** Id UUID estable a partir de un nombre corto (el servidor exige UUID). */
export function idDemo(slug: string) {
  let h = 0x811c9dc5, out = ''
  for (let r = 0; r < 4; r++) {
    for (const c of `${r}:${slug}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0
    out += h.toString(16).padStart(8, '0')
  }
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-4${out.slice(13, 16)}-8${out.slice(17, 20)}-${out.slice(20, 32)}`
}

type Base = Omit<Ejercicio, 'id' | 'creadoEn' | 'actualizadoEn' | 'creadoPor' | 'version' | 'archivado' | 'eliminadoEn' | 'origen' | 'basico' | 'autor' | 'publico' | 'equipoId' | 'video' | 'carpetaIds'>

const AUTOR = 'FutbolLab · demostración'
const FECHA = '2026-11-01T09:00:00.000Z'

const lista: (Base & { id: string })[] = [
  {
    id: 'demo-rondo-4c1', titulo: 'Rondo 4 contra 1', tipo: 'rondo', faseJuego: 'ataque', principio: 'Conservación del balón', tecnica: ['Pase', 'Control orientado'],
    objetivo: 'Activar al grupo con muchos contactos de balón y perfil abierto para recibir.',
    jugadoresMin: 5, jugadoresMax: 20, espacio: { ancho: 10, largo: 10 }, edadMin: 7, edadMax: 45, intensidad: 2, duracion: 3, series: 4, descanso: 45,
    material: ['4 conos por grupo', '1 balón por grupo', 'Petos'],
    organizacion: 'Grupos de 5 en cuadrados de 10 × 10 m. Cuatro jugadores en los lados y uno dentro.',
    desarrollo: 'Los de fuera se pasan el balón sin que lo toque el de dentro. Si lo toca o el balón sale, cambia con quien perdió el balón.',
    reglas: ['Máximo dos toques', 'No se puede pasar al compañero de al lado dos veces seguidas'],
    variantes: { facil: ['Toques libres', 'Cuadrado de 12 × 12 m'], dificil: ['Un toque', 'Dos defensores (4 contra 2) en 12 × 12 m'] },
    consignas: ['Perfil abierto antes de recibir', 'Pasa al pie contrario del defensor', 'Muévete para ofrecer línea de pase'],
    errores: ['Recibir de espaldas', 'Pases flojos que permiten al defensor llegar', 'Quedarse quieto tras pasar'],
    pizarra: pizarra('reducido', 14, 14, [['cono', 2, 2], ['cono', 12, 2], ['cono', 12, 12], ['cono', 2, 12], ['jugador', 7, 2, '1'], ['jugador', 12, 7, '2'], ['jugador', 7, 12, '3'], ['jugador', 2, 7, '4'], ['rival', 7, 7], ['balon', 7.8, 2.6]], [
      { nombre: 'Pase al lado libre', flechas: [['pase', 7, 2, 12, 7]] },
      { nombre: 'Control orientado y pase', mover: { 8: [9, 5], 9: [11.4, 7.6] }, flechas: [['pase', 12, 7, 7, 12]] },
      { nombre: 'Cambio de orientación', mover: { 8: [8, 9], 9: [7.6, 11.4] }, flechas: [['pase', 7, 12, 2, 7]] },
    ]),
  },
  {
    id: 'demo-conduccion-cuadrado', titulo: 'Conducciones y cambios de dirección', tipo: 'activacion', faseJuego: 'global', principio: 'Activación', tecnica: ['Conducción', 'Coordinación'],
    objetivo: 'Calentar con balón trabajando conducción con las dos piernas y cambios de ritmo.',
    jugadoresMin: 6, jugadoresMax: 24, espacio: { ancho: 20, largo: 20 }, edadMin: 6, edadMax: 45, intensidad: 2, duracion: 4, series: 2, descanso: 60,
    material: ['1 balón por jugador', '8 conos'],
    organizacion: 'Cuadrado de 20 × 20 m con un cono en cada esquina y otro a mitad de cada lado. Todos con balón dentro.',
    desarrollo: 'Conducción libre. A la voz del entrenador: "esquina" (conduce a un cono de esquina y vuelve), "pierna mala" (solo pierna no dominante), "suela" (parada con la suela y salida rápida).',
    reglas: ['Nadie puede chocar ni perder el balón fuera del cuadrado'],
    variantes: { facil: ['Sin consignas, solo conducción libre'], dificil: ['Dos entrenadores roban balones: quien lo pierde hace 5 toques de habilidad'] },
    consignas: ['Cabeza arriba', 'Balón cerca del pie', 'Cambia de ritmo al salir del giro'],
    errores: ['Mirar solo el balón', 'Usar siempre la misma pierna'],
    pizarra: pizarra('reducido', 24, 24, [['cono', 2, 2], ['cono', 22, 2], ['cono', 22, 22], ['cono', 2, 22], ['jugador', 8, 8], ['jugador', 15, 10], ['jugador', 10, 16], ['jugador', 17, 17], ['balon', 8.8, 8.6], ['balon', 15.8, 10.6], ['balon', 10.8, 16.6], ['balon', 17.8, 17.6]], [
      { nombre: 'Conducción libre', flechas: [['conduccion', 8, 8, 13, 5], ['conduccion', 10, 16, 6, 12]] },
      { nombre: '"¡Esquina!"', mover: { 4: [3.5, 3.5], 8: [4.2, 4.2], 7: [20.5, 20.5], 11: [21, 21] }, flechas: [['conduccion', 15, 10, 20, 4]] },
    ]),
  },
  {
    id: 'demo-pases-parejas', titulo: 'Pases en parejas con movilidad', tipo: 'activacion', faseJuego: 'global', principio: 'Activación', tecnica: ['Pase', 'Control orientado', 'Coordinación'],
    objetivo: 'Elevar la temperatura y preparar tobillos, cadera y aductores con balón.',
    jugadoresMin: 4, jugadoresMax: 30, espacio: { ancho: 30, largo: 20 }, edadMin: 8, edadMax: 45, intensidad: 1, duracion: 6, series: 1, descanso: 0,
    material: ['1 balón por pareja', 'Conos para marcar la distancia'],
    organizacion: 'Parejas enfrentadas a 8–10 m.',
    desarrollo: 'Se pasan el balón y, entre pase y pase, hacen un ejercicio de movilidad: skipping, talones al glúteo, apertura y cierre de cadera, desplazamiento lateral.',
    reglas: ['Cambio de ejercicio cada 45 segundos'],
    variantes: { facil: ['Más cerca (6 m)'], dificil: ['Control con la pierna lejana y pase en dos toques'] },
    consignas: ['Pase tenso a ras de suelo', 'Control hacia el lado del pase siguiente'],
    errores: ['Movilidad hecha deprisa y sin amplitud'],
    pizarra: pizarra('reducido', 16, 12, [['jugador', 3, 4], ['jugador', 13, 4], ['jugador', 3, 8], ['jugador', 13, 8], ['balon', 3.8, 4]], [
      { nombre: 'Pase', flechas: [['pase', 3.8, 4, 12.5, 4]] },
      { nombre: 'Movilidad lateral y devolución', mover: { 0: [3, 5.5], 4: [12.4, 4] }, flechas: [['pase', 12.4, 4, 3.4, 5.5]] },
    ]),
  },
  {
    id: 'demo-rondo-5c2-transicion', titulo: 'Rondo 5 contra 2 con transición', tipo: 'rondo', faseJuego: 'transicion_defensiva', principio: 'Presión tras pérdida', tecnica: ['Pase', 'Interceptación'],
    objetivo: 'Conservar bajo presión y reaccionar rápido tras perder el balón.',
    jugadoresMin: 7, jugadoresMax: 21, espacio: { ancho: 14, largo: 14 }, edadMin: 10, edadMax: 45, intensidad: 3, duracion: 4, series: 4, descanso: 60,
    material: ['Conos', 'Balones', 'Petos de dos colores'],
    organizacion: 'Grupos de 7: cinco poseedores y dos defensores en 14 × 14 m.',
    desarrollo: 'Si los defensores recuperan, deben sacar el balón del cuadrado. Los poseedores tienen 5 segundos para recuperarlo; si no, el que perdió pasa a defender.',
    reglas: ['Dos toques', '10 pases seguidos = punto para los poseedores'],
    variantes: { facil: ['Sin transición: solo conservar'], dificil: ['Cuadrado de 12 × 12 m', 'Un toque'] },
    consignas: ['Tras perder, el más cercano presiona; los demás cierran pases', 'Ataca al balón de frente, no de lado'],
    errores: ['Lamentarse tras la pérdida', 'Presionar todos al balón y dejar pases libres'],
    pizarra: pizarra('reducido', 18, 18, [['cono', 2, 2], ['cono', 16, 2], ['cono', 16, 16], ['cono', 2, 16], ['jugador', 9, 2], ['jugador', 16, 7], ['jugador', 16, 13], ['jugador', 2, 13], ['jugador', 2, 7], ['rival', 8, 8], ['rival', 11, 10], ['balon', 9.8, 2.6]], [
      { nombre: 'Conservar', flechas: [['pase', 9, 2, 16, 7], ['pase', 16, 7, 16, 13]] },
      { nombre: 'Pérdida', mover: { 10: [15, 12], 11: [14.4, 12.6] }, flechas: [['conduccion', 15, 12, 17, 15]] },
      { nombre: 'Presión inmediata 5 s', mover: { 6: [15.6, 13.6], 5: [16, 10.5], 10: [16.2, 14], 11: [16.8, 14.6] }, flechas: [['desmarque', 16, 13, 15.8, 13.8], ['desmarque', 16, 7, 16, 10.5]] },
    ]),
  },
  {
    id: 'demo-posesion-4c4-3', titulo: 'Posesión 4 contra 4 más 3 comodines', tipo: 'posesion', faseJuego: 'ataque', principio: 'Conservación del balón', tecnica: ['Pase', 'Control orientado'],
    objetivo: 'Mantener el balón con superioridad usando apoyos dentro y fuera.',
    jugadoresMin: 11, jugadoresMax: 13, espacio: { ancho: 25, largo: 30 }, edadMin: 10, edadMax: 45, intensidad: 4, duracion: 5, series: 3, descanso: 90,
    material: ['Petos de 3 colores', 'Balones', '4 conos'],
    organizacion: 'Rectángulo de 25 × 30 m. Dos equipos de 4 y tres comodines: uno dentro y dos en los lados cortos.',
    desarrollo: 'El equipo con balón juega con los comodines (7 contra 4). Cuando el otro equipo recupera, cambian los papeles.',
    reglas: ['Comodines a dos toques', '8 pases seguidos = punto'],
    variantes: { facil: ['Toques libres para todos'], dificil: ['Comodines de fuera a un toque', 'Sin comodín interior'] },
    consignas: ['Amplitud: ocupa los lados cuando tenemos el balón', 'Encuentra al comodín interior para girar'],
    errores: ['Todos cerca del balón', 'Pasar siempre al comodín exterior sin buscar dentro'],
    pizarra: pizarra('reducido', 29, 34, [['cono', 2, 2], ['cono', 27, 2], ['cono', 27, 32], ['cono', 2, 32], ['jugador', 6, 9], ['jugador', 23, 12], ['jugador', 9, 24], ['jugador', 21, 26], ['rival', 11, 12], ['rival', 18, 15], ['rival', 13, 22], ['rival', 19, 21], ['comodin', 14.5, 17], ['comodin', 14.5, 2], ['comodin', 14.5, 32], ['balon', 6.8, 9.5]], [
      { nombre: 'Salida con apoyo exterior', flechas: [['pase', 6, 9, 14.5, 2.5]] },
      { nombre: 'Comodín interior para girar', mover: { 12: [16, 18], 8: [12, 9] }, flechas: [['pase', 14.5, 2.5, 16, 17.5], ['desmarque', 23, 12, 24, 20]] },
      { nombre: 'Cambio de orientación', mover: { 1: [24, 20], 9: [21, 18] }, flechas: [['pase', 16, 18, 24, 20]] },
    ]),
  },
  {
    id: 'demo-posesion-progresar', titulo: 'Posesión para progresar a zona', tipo: 'posesion', faseJuego: 'ataque', principio: 'Progresión', tecnica: ['Pase', 'Conducción', 'Control orientado'],
    objetivo: 'Pasar de conservar a avanzar: buscar el pase o la conducción que supera líneas.',
    jugadoresMin: 10, jugadoresMax: 14, espacio: { ancho: 30, largo: 40 }, edadMin: 11, edadMax: 45, intensidad: 4, duracion: 6, series: 3, descanso: 90,
    material: ['Conos de dos colores', 'Petos', 'Balones'],
    organizacion: 'Campo de 30 × 40 m con una zona de 5 m en cada fondo. 5 contra 5.',
    desarrollo: 'Punto cuando un jugador recibe el pase controlado dentro de la zona rival. Tras el punto, ataca hacia la otra zona el mismo equipo.',
    reglas: ['No se puede esperar dentro de la zona: se entra a recibir', 'Fuera de juego en la línea de zona'],
    variantes: { facil: ['Punto también por entrar conduciendo'], dificil: ['Mínimo 3 pases antes de poder puntuar'] },
    consignas: ['Mira primero lejos, luego cerca', 'Si no hay pase hacia delante, conduce para fijar'],
    errores: ['Pases horizontales sin intención', 'Desmarques en línea con el poseedor'],
    pizarra: pizarra('medio', 34, 44, [['cono', 2, 7], ['cono', 32, 7], ['cono', 2, 37], ['cono', 32, 37], ['jugador', 10, 33], ['jugador', 24, 33], ['jugador', 17, 26], ['jugador', 8, 18], ['jugador', 26, 16], ['rival', 13, 27], ['rival', 21, 27], ['rival', 17, 19], ['rival', 10, 12], ['rival', 24, 11], ['balon', 10.8, 33.4]], [
      { nombre: 'Atraer y fijar', flechas: [['conduccion', 10, 33, 13, 30]] },
      { nombre: 'Pase entre líneas', mover: { 4: [13, 30], 14: [13.6, 30], 9: [14, 28] }, flechas: [['pase', 13, 30, 17, 25], ['desmarque', 26, 16, 25, 5]] },
      { nombre: 'Ruptura a zona', mover: { 6: [17, 24], 8: [25, 5], 14: [25, 5.6] }, flechas: [['pase', 17, 24, 25, 6]] },
    ]),
  },
  {
    id: 'demo-oleadas-2c1', titulo: 'Oleadas 2 contra 1 con finalización', tipo: 'oleadas', faseJuego: 'transicion_ofensiva', principio: 'Finalización', tecnica: ['Pase', 'Conducción', 'Tiro'],
    objetivo: 'Tomar buenas decisiones en superioridad: fijar al defensor y pasar en el momento justo.',
    jugadoresMin: 6, jugadoresMax: 16, espacio: { ancho: 25, largo: 30 }, edadMin: 8, edadMax: 45, intensidad: 4, duracion: 8, series: 2, descanso: 120,
    material: ['Portería grande con portero', 'Balones', 'Conos'],
    organizacion: 'Dos filas de atacantes en el medio campo, un defensor en la frontal y un portero.',
    desarrollo: 'Salen dos atacantes conduciendo; el defensor sale a su encuentro. Deben terminar en menos de 8 segundos. El defensor cambia cada 3 ataques.',
    reglas: ['Máximo 8 segundos para finalizar', 'Gol tras pase de la otra fila vale doble'],
    variantes: { facil: ['Defensor pasivo las primeras repeticiones'], dificil: ['3 contra 2', 'Un defensor más que entra desde atrás a los 3 segundos'] },
    consignas: ['Conduce hacia el defensor para fijarlo', 'El compañero da amplitud y no se adelanta'],
    errores: ['Pasar demasiado pronto, sin fijar', 'Los dos atacantes en el mismo carril'],
    pizarra: pizarra('medio', 34, 30, [['porteria', 17, 0.5], ['portero_rival', 17, 2], ['rival', 17, 11], ['jugador', 11, 26], ['jugador', 23, 26], ['balon', 11.8, 25.4]], [
      { nombre: 'Salida conduciendo', flechas: [['conduccion', 11, 26, 14, 16], ['desmarque', 23, 26, 24, 14]] },
      { nombre: 'Fijar al defensor', mover: { 3: [14, 16], 5: [14.6, 15.4], 4: [24, 14], 2: [15, 13] }, flechas: [['pase', 14, 16, 24, 13]] },
      { nombre: 'Finalizar', mover: { 5: [23.4, 12.6], 2: [19, 10], 4: [23, 10] }, flechas: [['tiro', 23, 10, 18, 1]] },
    ]),
  },
  {
    id: 'demo-finalizacion-pared', titulo: 'Finalización tras pared', tipo: 'finalizacion', faseJuego: 'ataque', principio: 'Finalización', tecnica: ['Pase', 'Tiro', 'Control orientado'],
    objetivo: 'Repetir muchas finalizaciones de calidad tras una combinación corta.',
    jugadoresMin: 6, jugadoresMax: 16, espacio: { ancho: 30, largo: 25 }, edadMin: 8, edadMax: 45, intensidad: 3, duracion: 6, series: 2, descanso: 60,
    material: ['Portería con portero', 'Balones', '2 picas'],
    organizacion: 'Una fila de tiradores a 25 m, un apoyo fijo en la frontal y una pica como defensor.',
    desarrollo: 'El tirador pasa al apoyo, rodea la pica, recibe la devolución y tira a portería. Rotación: tirador → apoyo → fila.',
    reglas: ['Tiro en máximo dos toques tras la devolución'],
    variantes: { facil: ['Tiro tras control libre'], dificil: ['Tiro de primeras', 'Defensor semiactivo en lugar de la pica'] },
    consignas: ['Pase firme al pie del apoyo', 'Ataca el espacio tras pasar', 'Mira al portero antes de tirar'],
    errores: ['Pararse tras el primer pase', 'Tirar sin mirar'],
    pizarra: pizarra('medio', 34, 30, [['porteria', 17, 0.5], ['portero_rival', 17, 2], ['pica', 17, 14], ['jugador', 13, 13, 'A'], ['jugador', 17, 26], ['balon', 17.8, 25.5]], [
      { nombre: 'Pase al apoyo', flechas: [['pase', 17, 26, 13.5, 13.5]] },
      { nombre: 'Pared', mover: { 4: [20, 17], 5: [13.6, 13.6] }, flechas: [['pase', 13.6, 13.6, 20, 11], ['desmarque', 20, 17, 20, 11]] },
      { nombre: 'Tiro', mover: { 4: [20, 11], 5: [20.6, 11] }, flechas: [['tiro', 20, 11, 15, 1]] },
    ]),
  },
  {
    id: 'demo-1c1-porteria', titulo: '1 contra 1 con portería', tipo: 'juego_reducido', faseJuego: 'ataque', principio: 'Finalización', tecnica: ['Regate', 'Conducción', 'Entrada'],
    objetivo: 'Atreverse a encarar y defender el uno contra uno sin tirarse al suelo.',
    jugadoresMin: 4, jugadoresMax: 16, espacio: { ancho: 15, largo: 20 }, edadMin: 7, edadMax: 45, intensidad: 5, duracion: 4, series: 3, descanso: 90,
    material: ['Portería pequeña o grande con portero', 'Balones', 'Conos'],
    organizacion: 'Pasillo de 15 × 20 m. Atacante en un extremo, defensor junto a la portería.',
    desarrollo: 'El defensor pasa al atacante y sale a defender. El atacante intenta marcar; si el defensor roba, puede marcar en una miniportería contraria.',
    reglas: ['5 segundos para finalizar'],
    variantes: { facil: ['Defensor sale desde un lado (más tiempo para el atacante)'], dificil: ['Pasillo más estrecho (10 m)'] },
    consignas: ['Atacante: cambio de ritmo tras el amago', 'Defensor: perfilado, orienta hacia fuera'],
    errores: ['Atacante que conduce sin encarar', 'Defensor que se lanza al balón'],
    pizarra: pizarra('reducido', 19, 24, [['porteria', 9.5, 0.6], ['miniporteria', 9.5, 23.4], ['rival', 9.5, 4], ['jugador', 9.5, 20], ['balon', 9.5, 5]], [
      { nombre: 'Pase de salida', flechas: [['pase', 9.5, 5, 9.5, 19]] },
      { nombre: 'Encarar', mover: { 3: [9.5, 13], 4: [10, 12.4], 2: [9.5, 10] }, flechas: [['conduccion', 9.5, 13, 13, 8]] },
      { nombre: 'Finalizar', mover: { 3: [13, 7], 4: [13.4, 6.4], 2: [11.5, 8] }, flechas: [['tiro', 13, 7, 10, 1]] },
    ]),
  },
  {
    id: 'demo-4c4-miniporterias', titulo: '4 contra 4 con miniporterías', tipo: 'juego_reducido', faseJuego: 'transicion_defensiva', principio: 'Presión tras pérdida', tecnica: ['Pase', 'Conducción', 'Entrada'],
    objetivo: 'Mucha participación con cambios constantes de ataque a defensa.',
    jugadoresMin: 8, jugadoresMax: 16, espacio: { ancho: 20, largo: 30 }, edadMin: 7, edadMax: 45, intensidad: 5, duracion: 4, series: 4, descanso: 90,
    material: ['4 miniporterías', 'Petos', 'Balones de reserva junto al campo'],
    organizacion: 'Campo de 20 × 30 m con dos miniporterías en cada fondo. 4 contra 4 sin porteros.',
    desarrollo: 'Partido libre. Gol tras recuperar en campo rival en menos de 5 segundos vale doble.',
    reglas: ['Saque de banda con el pie', 'Balón fuera: el entrenador mete otro al instante'],
    variantes: { facil: ['Un comodín que juega con el que ataca'], dificil: ['Solo se puede marcar en la miniportería contraria a la del último gol'] },
    consignas: ['Tras perder, presiona el más cercano y cerramos el centro', 'Tras recuperar, mira la portería contraria'],
    errores: ['Retroceder todos tras la pérdida', 'Juego solo por el centro'],
    pizarra: pizarra('reducido', 24, 34, [['miniporteria', 7, 1], ['miniporteria', 17, 1], ['miniporteria', 7, 33], ['miniporteria', 17, 33], ['jugador', 6, 22], ['jugador', 18, 22], ['jugador', 12, 16], ['jugador', 12, 27], ['rival', 8, 14], ['rival', 16, 14], ['rival', 12, 9], ['rival', 12, 20], ['balon', 12.6, 16.5]], [
      { nombre: 'Pérdida en ataque', mover: { 11: [12.4, 16.4], 12: [12.4, 16.9] }, flechas: [['conduccion', 12.4, 16.4, 16, 21]] },
      { nombre: 'Presión inmediata', mover: { 6: [15, 19], 5: [17, 21], 7: [14, 26], 11: [15.4, 20], 12: [15.6, 20.4] }, flechas: [['desmarque', 12, 16, 15, 19]] },
    ]),
  },
  {
    id: 'demo-7c7-tres-toques', titulo: 'Partido 7 contra 7 a tres toques', tipo: 'partido_condicionado', faseJuego: 'global', principio: 'Amplitud y profundidad', tecnica: ['Pase', 'Control orientado'],
    objetivo: 'Llevar al partido lo trabajado: circulación rápida y ocupación de espacios.',
    jugadoresMin: 12, jugadoresMax: 16, espacio: { ancho: 40, largo: 55 }, edadMin: 8, edadMax: 45, intensidad: 4, duracion: 10, series: 2, descanso: 120,
    material: ['2 porterías', 'Petos', 'Balones'],
    organizacion: 'Medio campo de F11 o campo de F7 completo. 6 + portero contra 6 + portero.',
    desarrollo: 'Partido con máximo tres toques por jugador. Gol tras más de 5 pases seguidos vale doble.',
    reglas: ['Tres toques', 'Saque del portero en corto'],
    variantes: { facil: ['Toques libres en campo propio'], dificil: ['Dos toques', 'Gol solo tras centro lateral'] },
    consignas: ['Abre el campo cuando tenemos el balón', 'Juntos cuando defendemos'],
    errores: ['Conducciones largas que rompen la regla', 'Extremos que se meten por dentro'],
    pizarra: pizarra('medio', 44, 55, [['porteria', 22, 0.6], ['porteria', 22, 54.4], ['portero', 22, 52.5], ['portero_rival', 22, 2.5], ['jugador', 10, 44], ['jugador', 34, 44], ['jugador', 22, 38], ['jugador', 6, 28], ['jugador', 38, 28], ['jugador', 22, 20], ['rival', 14, 14], ['rival', 30, 14], ['rival', 22, 24], ['rival', 12, 34], ['rival', 32, 34], ['rival', 22, 42], ['balon', 10.8, 43.5]], [
      { nombre: 'Salida a banda', flechas: [['pase', 10, 44, 6, 29]] },
      { nombre: 'Juego interior', mover: { 16: [6.6, 28.6], 13: [9, 30] }, flechas: [['pase', 6.6, 28.6, 22, 21], ['desmarque', 38, 28, 37, 12]] },
      { nombre: 'Cambio de juego', mover: { 9: [22, 21], 16: [22.6, 21.5], 8: [37, 12] }, flechas: [['pase', 22.6, 21.5, 37, 12]] },
    ]),
  },
  {
    id: 'demo-basculacion-4c4', titulo: 'Basculación defensiva 4 contra 4 en carriles', tipo: 'juego_reducido', faseJuego: 'defensa', principio: 'Basculación', tecnica: ['Entrada', 'Interceptación'],
    objetivo: 'Defender juntos: desplazarse hacia el lado del balón y cerrar el carril interior.',
    jugadoresMin: 10, jugadoresMax: 14, espacio: { ancho: 35, largo: 30 }, edadMin: 11, edadMax: 45, intensidad: 3, duracion: 5, series: 3, descanso: 90,
    material: ['Conos para 3 carriles', '3 miniporterías por fondo', 'Petos'],
    organizacion: 'Campo de 35 × 30 m dividido en tres carriles verticales. Cada equipo defiende 3 miniporterías.',
    desarrollo: '4 contra 4 más dos comodines exteriores. Los defensores no pueden estar en tres carriles a la vez: deben bascular hacia el balón.',
    reglas: ['Defensores: como mucho en dos carriles a la vez', 'Gol en cualquier miniportería'],
    variantes: { facil: ['Sin comodines'], dificil: ['Solo se puede marcar en la miniportería del carril contrario al balón'] },
    consignas: ['Distancias cortas entre nosotros', 'El más cercano presiona, el siguiente cubre'],
    errores: ['Quedarse en el carril propio', 'Presionar dos al mismo jugador'],
    pizarra: pizarra('reducido', 39, 34, [['cono', 13.5, 2], ['cono', 25.5, 2], ['cono', 13.5, 32], ['cono', 25.5, 32], ['miniporteria', 7, 1], ['miniporteria', 19.5, 1], ['miniporteria', 32, 1], ['rival', 8, 10], ['rival', 16, 9], ['rival', 23, 9], ['rival', 31, 10], ['jugador', 7, 22], ['jugador', 17, 21], ['jugador', 31, 22], ['jugador', 22, 25], ['balon', 7.8, 21.5]], [
      { nombre: 'Balón en carril izquierdo', flechas: [['desmarque', 23, 9, 14, 11], ['desmarque', 31, 10, 24, 11]] },
      { nombre: 'Basculación', mover: { 7: [8, 15], 8: [12, 11], 9: [17, 10], 10: [24, 11] }, flechas: [['pase', 7, 22, 31, 22]] },
      { nombre: 'Cambio de orientación: bascular al otro lado', mover: { 15: [31.6, 21.4], 7: [16, 10], 8: [22, 10], 9: [27, 12], 10: [31, 16] } },
    ]),
  },
  {
    id: 'demo-circuito-control', titulo: 'Circuito de control orientado y pase', tipo: 'circuito_tecnico', faseJuego: 'ataque', principio: 'Conservación del balón', tecnica: ['Control orientado', 'Pase'],
    objetivo: 'Mejorar el control orientado hacia el siguiente pase con las dos piernas.',
    jugadoresMin: 4, jugadoresMax: 12, espacio: { ancho: 20, largo: 20 }, edadMin: 8, edadMax: 45, intensidad: 2, duracion: 5, series: 2, descanso: 60,
    material: ['4 conos', 'Balones'],
    organizacion: 'Rombo con un jugador en cada cono separados 12 m; balón en el cono de salida.',
    desarrollo: 'Pase al siguiente cono y sigue al balón. Quien recibe controla orientado hacia el siguiente cono y pasa. Cambio de sentido a mitad de la serie.',
    reglas: ['Dos toques: control y pase'],
    variantes: { facil: ['Control libre'], dificil: ['Pase y desmarque de apoyo antes de recibir', 'Un toque en el segundo cono'] },
    consignas: ['Control con la pierna lejana', 'Primer toque hacia donde vas a pasar'],
    errores: ['Control que deja el balón debajo del cuerpo', 'Pase sin mirar al receptor'],
    pizarra: pizarra('reducido', 20, 20, [['cono', 10, 3], ['cono', 17, 10], ['cono', 10, 17], ['cono', 3, 10], ['jugador', 10, 4.4], ['jugador', 15.6, 10], ['jugador', 10, 15.6], ['jugador', 4.4, 10], ['balon', 10.8, 5]], [
      { nombre: 'Pase y sigue', flechas: [['pase', 10.8, 5, 15.4, 9.6]] },
      { nombre: 'Control orientado', mover: { 4: [15, 8], 8: [15.2, 10.8] }, flechas: [['pase', 15.2, 10.8, 10.6, 15.4]] },
    ]),
  },
  {
    id: 'demo-calma-precision', titulo: 'Precisión de pase a porterías de conos', tipo: 'vuelta_calma', faseJuego: 'global', principio: 'Recuperación', tecnica: ['Pase'],
    objetivo: 'Bajar pulsaciones con una tarea técnica tranquila y competitiva.',
    jugadoresMin: 2, jugadoresMax: 30, espacio: { ancho: 20, largo: 20 }, edadMin: 6, edadMax: 45, intensidad: 1, duracion: 6, series: 1, descanso: 0,
    material: ['Conos para porterías de 1 m', 'Balones'],
    organizacion: 'Parejas a 10 m con una portería de conos de 1 m entre ellos.',
    desarrollo: 'Se pasan el balón a través de la portería. Cada pase que cruza sin tocar conos es un punto.',
    reglas: ['Pase con el interior', 'Alternar piernas'],
    variantes: { facil: ['Portería de 1,5 m'], dificil: ['Distancia de 15 m'] },
    consignas: ['Tobillo firme', 'Mira la portería antes de pasar'],
    errores: ['Pasar con la punta'],
    pizarra: pizarra('reducido', 14, 10, [['jugador', 2, 5], ['jugador', 12, 5], ['cono', 7, 4.4], ['cono', 7, 5.6], ['balon', 2.8, 5]], [
      { nombre: 'Pase por la portería', flechas: [['pase', 2.8, 5, 11.4, 5]] },
    ]),
  },
  {
    id: 'demo-calma-rondo-libre', titulo: 'Rondo libre y movilidad final', tipo: 'vuelta_calma', faseJuego: 'global', principio: 'Recuperación', tecnica: ['Pase', 'Coordinación'],
    objetivo: 'Terminar con un juego suave, movilidad y una charla breve del entrenador.',
    jugadoresMin: 5, jugadoresMax: 30, espacio: { ancho: 15, largo: 15 }, edadMin: 6, edadMax: 45, intensidad: 1, duracion: 8, series: 1, descanso: 0,
    material: ['Balones'],
    organizacion: 'Círculo amplio con todo el grupo; uno o dos en el centro.',
    desarrollo: '4 minutos de rondo sin presión intensa y 4 minutos de movilidad guiada (cadera, isquios, cuádriceps) mientras el entrenador repasa el objetivo del día.',
    reglas: ['Sin carreras: el del medio solo intercepta andando'],
    variantes: { facil: ['Sin defensor'], dificil: ['Pase solo con la pierna no dominante'] },
    consignas: ['Respira y suelta', '¿Qué hemos aprendido hoy?'],
    errores: ['Convertirlo en otra tarea intensa'],
    pizarra: pizarra('reducido', 16, 16, [['jugador', 8, 2], ['jugador', 14, 6], ['jugador', 12, 13], ['jugador', 4, 13], ['jugador', 2, 6], ['rival', 8, 8], ['balon', 8.8, 2.5]], [
      { nombre: 'Rondo suave', flechas: [['pase', 8.8, 2.5, 13.6, 6], ['pase', 14, 6, 4.4, 12.6]] },
    ]),
  },
  {
    id: 'demo-corner-corto', titulo: 'Córner en corto con centro al segundo palo', tipo: 'finalizacion', faseJuego: 'balon_parado', principio: 'Finalización', tecnica: ['Pase', 'Cabeceo', 'Tiro'],
    objetivo: 'Automatizar una jugada de córner sencilla y con roles claros.',
    jugadoresMin: 8, jugadoresMax: 16, espacio: { ancho: 40, largo: 20 }, edadMin: 11, edadMax: 45, intensidad: 2, duracion: 8, series: 1, descanso: 0,
    material: ['Portería con portero', 'Balones', 'Defensores pasivos o picas'],
    organizacion: 'Sacador, apoyo en corto, dos rematadores y uno en la frontal para el rechace.',
    desarrollo: 'Pase corto al apoyo, devolución, centro al segundo palo. Los rematadores cruzan su carrera en el momento del centro.',
    reglas: ['Primero contra picas, luego con defensores pasivos'],
    variantes: { facil: ['Centro desde parado'], dificil: ['Defensores activos'] },
    consignas: ['Carrera tarde y fuerte', 'Frontal atento al rechace'],
    errores: ['Rematadores parados esperando el balón'],
    pizarra: pizarra('medio', 44, 22, [['porteria', 22, 0.6], ['portero_rival', 22, 2], ['jugador', 43, 0.8, 'S'], ['jugador', 38, 4], ['jugador', 26, 12], ['jugador', 18, 13], ['jugador', 22, 19], ['rival', 21, 6], ['rival', 25, 6], ['balon', 42.4, 1.2]], [
      { nombre: 'Pase corto', flechas: [['pase', 42.4, 1.2, 38, 4]] },
      { nombre: 'Devolución y carreras', mover: { 2: [40, 3], 9: [38.4, 4.2] }, flechas: [['pase', 38.4, 4.2, 40, 3], ['desmarque', 26, 12, 18, 5], ['desmarque', 18, 13, 26, 4]] },
      { nombre: 'Centro al segundo palo', mover: { 4: [18, 5], 5: [26, 4], 9: [40.6, 3] }, flechas: [['pase', 40.6, 3, 18, 4.4], ['tiro', 18, 5, 20.5, 0.8]] },
    ]),
  },
]

export const EJERCICIOS_DEMO: Ejercicio[] = lista.map((e) => ({
  ...e,
  id: idDemo(e.id),
  creadoEn: FECHA, actualizadoEn: FECHA, creadoPor: 'futbollab', version: 1, archivado: false, eliminadoEn: null,
  origen: 'demo', basico: true, autor: AUTOR, publico: true, equipoId: null, video: null, carpetaIds: [],
}))
