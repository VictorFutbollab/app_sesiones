/**
 * Comprobación automática de los criterios de aceptación del MVP con un navegador real
 * (Chromium, tamaño móvil). Uso: npm run build && npx vite preview --port 4173 & node e2e/criterios.mjs
 * Mide tiempos de máquina: son la cota inferior; con una persona se suma el tiempo de lectura.
 */
import { createRequire } from 'node:module'
const { chromium, devices } = createRequire(import.meta.url)('playwright')
import { mkdirSync } from 'node:fs'

const URL = process.env.URL ?? 'http://127.0.0.1:4173/'
const OUT = 'e2e/capturas'
mkdirSync(OUT, { recursive: true })
const resultados = []
const ok = (criterio, cumple, detalle) => resultados.push({ criterio, cumple, detalle })
const errores = []

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['Pixel 7'], acceptDownloads: true, locale: 'es-ES' })
const page = await ctx.newPage()
page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))
page.on('pageerror', (e) => errores.push(String(e)))
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })

// 1. Registro + equipo en menos de 2 minutos
let t0 = Date.now()
await page.goto(URL)
await page.getByLabel('Tu nombre').fill('Laura Entrenadora')
await page.getByLabel('Correo').fill('laura@club.test')
await page.getByRole('checkbox').check()
await shot('01-registro')
await page.getByRole('button', { name: 'Crear cuenta' }).click()
await page.getByLabel('Categoría').selectOption('alevin')
await page.getByLabel('Nombre del equipo').fill('Alevín B')
await shot('02-equipo')
await page.getByRole('button', { name: 'Crear equipo' }).click()
await page.getByText(/Hola, Laura/).waitFor()
ok('Registro y equipo < 2 min', Date.now() - t0 < 120000, `${((Date.now() - t0) / 1000).toFixed(1)} s (máquina), 9 interacciones`)
await shot('03-inicio-vacio')

// Cargamos además el equipo de ejemplo para tener plantilla de 16 y datos de historial
await page.goto(URL + '#perfil')
await page.getByLabel('Nuevo equipo').waitFor()

// 2. Encontrar un ejercicio con 3 filtros en < 30 s
t0 = Date.now()
await page.goto(URL + '#biblioteca')
await page.getByRole('button', { name: /^Mi edad/ }).click()
await page.getByRole('button', { name: /jugadores$/ }).first().click()
await page.getByRole('button', { name: /^Filtros/ }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Juego reducido' }).click()
await shot('04-filtros')
await page.getByRole('dialog').getByRole('button', { name: /^Ver \d+ ejercicios/ }).click()
const tarjetas = await page.locator('.tarjeta-ej').count()
await page.locator('.tarjeta-ej').first().click()
await page.getByRole('heading', { level: 1 }).waitFor()
ok('Ejercicio con 3 filtros < 30 s', Date.now() - t0 < 30000 && tarjetas > 0, `${((Date.now() - t0) / 1000).toFixed(1)} s, ${tarjetas} resultados, 5 toques`)
await page.waitForTimeout(1600)
await shot('05-ficha')

// 3. Sesión de 4 bloques en < 5 min (manual: un ejercicio por bloque)
t0 = Date.now()
await page.goto(URL + '#sesion--nueva')
await page.getByLabel('Objetivo', { exact: true }).waitFor()
await page.getByLabel('Objetivo', { exact: true }).fill('Presión tras pérdida')
for (const b of ['Activación', 'Principal 1', 'Principal 2', 'Vuelta a la calma']) {
  await page.getByRole('region', { name: b }).getByRole('button', { name: 'Añadir ejercicio' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Añadir' }).first().click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
}
const items = await page.locator('[data-item]').count()
ok('Sesión de 4 bloques < 5 min', items === 4 && Date.now() - t0 < 300000, `${((Date.now() - t0) / 1000).toFixed(1)} s, ${items} ejercicios, 10 toques`)
await shot('06-constructor')
const sesionUrl = page.url()

// Asistente
await page.getByRole('button', { name: 'Proponme una sesión' }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Proponer' }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Usar esta sesión' }).click()
const tras = await page.locator('[data-item]').count()
ok('Asistente propone 4 bloques con ejercicios de la biblioteca', tras === 4, `${tras} bloques`)

// 4. PDF
const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF' }).click()])
const ruta = `${OUT}/sesion.pdf`
await descarga.saveAs(ruta)
ok('La sesión se exporta a PDF', true, descarga.suggestedFilename())

// 5. Pasar lista de 16 jugadores en < 30 s: usamos el equipo de ejemplo (16 jugadores)
await page.goto(URL + '#perfil')
await page.evaluate(() => sessionStorage.clear())
// crea el equipo de ejemplo por la vía de la app: borrar el activo no hace falta; usamos el ejemplo creado desde el alta en otro contexto
const ctx2 = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-ES' })
const p2 = await ctx2.newPage()
p2.on('pageerror', (e) => errores.push(String(e)))
await p2.goto(URL)
await p2.getByLabel('Tu nombre').fill('Marcos')
await p2.getByLabel('Correo').fill('marcos@club.test')
await p2.getByRole('checkbox').check()
await p2.getByRole('button', { name: 'Crear cuenta' }).click()
await p2.getByRole('button', { name: 'Probar con un equipo de ejemplo' }).click()
await p2.getByRole('link', { name: /Empezar entrenamiento/ }).first().waitFor()
await p2.screenshot({ path: `${OUT}/07-inicio-ejemplo.png` })
await p2.getByRole('link', { name: /Empezar entrenamiento/ }).first().click()
await p2.locator('.jug').first().waitFor()
t0 = Date.now()
const jug = p2.locator('.jug')
const n = await jug.count()
await jug.nth(2).click() // falta
await jug.nth(5).click(); await jug.nth(5).click() // justificada
await p2.screenshot({ path: `${OUT}/08-asistencia.png` })
await p2.getByRole('button', { name: 'Lista hecha' }).click()
ok('Pasar lista de 16 jugadores < 30 s', n === 16 && Date.now() - t0 < 30000, `${n} jugadores, ${((Date.now() - t0) / 1000).toFixed(1)} s, 4 toques`)
await p2.locator('.crono').waitFor()
await p2.waitForTimeout(800)
await p2.screenshot({ path: `${OUT}/09-modo-campo.png` })

// 6. Modo avión: todo sigue funcionando (service worker + IndexedDB)
await p2.waitForTimeout(1500)
await ctx2.setOffline(true)
await p2.goto(URL + '#sesiones')
await p2.reload()
await p2.getByRole('heading', { name: 'Sesiones' }).waitFor({ timeout: 10000 })
await p2.goto(URL + '#sesion--nueva')
await p2.getByLabel('Objetivo', { exact: true }).waitFor()
await p2.getByLabel('Objetivo', { exact: true }).fill('Sesión creada en modo avión')
await p2.goto(URL + '#sesiones')
const sinRed = await p2.getByText('Sesión creada en modo avión').waitFor({ timeout: 5000 }).then(() => 1, () => 0)
ok('Todo funciona en modo avión', sinRed > 0, 'recarga sin red, crear sesión y verla en la lista (la sincronización con servidor se prueba en las pruebas unitarias)')
await p2.screenshot({ path: `${OUT}/10-sin-red.png` })
await ctx2.setOffline(false)

// Cierre de sesión
await p2.goto(URL + '#inicio')

// Capturas de tableta y ordenador
const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, locale: 'es-ES' })
const p3 = await ctx3.newPage()
await p3.goto(URL)
await p3.getByLabel('Tu nombre').fill('Ana')
await p3.getByLabel('Correo').fill('ana@club.test')
await p3.getByRole('checkbox').check()
await p3.getByRole('button', { name: 'Crear cuenta' }).click()
await p3.getByRole('button', { name: 'Probar con un equipo de ejemplo' }).click()
await p3.getByText(/Hola, Ana/).waitFor()
await p3.screenshot({ path: `${OUT}/11-escritorio-inicio.png` })
await p3.goto(URL + '#biblioteca')
await p3.locator('.tarjeta-ej').first().waitFor()
await p3.screenshot({ path: `${OUT}/12-escritorio-biblioteca.png` })
await p3.goto(URL + '#sesiones')
await p3.getByRole('button', { name: 'Calendario' }).click()
await p3.screenshot({ path: `${OUT}/13-escritorio-calendario.png` })
await p3.goto(URL + '#editar-ejercicio--nuevo')
await p3.getByLabel('Título').fill('Mi rondo')
await p3.locator('svg.pizarra').click({ position: { x: 120, y: 120 } })
await p3.locator('svg.pizarra').click({ position: { x: 220, y: 160 } })
await p3.getByRole('button', { name: 'Crear ejercicio' }).click()
await p3.waitForTimeout(500)
await p3.screenshot({ path: `${OUT}/14-escritorio-editor.png` })

console.log(JSON.stringify({ resultados, errores }, null, 2))
await browser.close()
