/**
 * Seguridad y sincronización del servidor sobre PostgreSQL REAL (PGlite) con un entorno
 * que imita Supabase (roles anon/authenticated/service_role, auth.uid(), auth.jwt(),
 * auth.sessions). Mismo enfoque que FutbolLab Jugadores. Sin servicios externos.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const ENTORNO = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema auth;
grant usage on schema public, auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, not_after timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;
`
const U = {
  ana: '00000000-0000-4000-8000-0000000000a1', // Gratis, entrenadora del equipo A
  bea: '00000000-0000-4000-8000-0000000000b1', // Gratis, otro club
  pro: '00000000-0000-4000-8000-0000000000c1', // Pro
  ayu: '00000000-0000-4000-8000-0000000000d1', // ayudante (lo invita el Pro)
  admin: '00000000-0000-4000-8000-0000000000e1',
}
const SESION = Object.fromEntries(Object.values(U).map((id) => [id, id.replace(/^0000/, '5e55')]))
const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let db: PGlite
let reloj = 0
const T0 = Date.now() - 864e5
const ts = () => new Date(T0 + reloj++ * 1000).toISOString()

type Res = { rows: Record<string, unknown>[]; error?: undefined } | { rows?: undefined; error: string }
async function como(uid: string | null, sql: string, params: unknown[] = [], aal = 'aal1'): Promise<Res> {
  try {
    return await db.transaction(async (tx) => {
      const claims = uid ? { sub: uid, role: 'authenticated', session_id: SESION[uid], aal } : { role: 'anon' }
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)])
      await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`)
      return { rows: (await tx.query<Record<string, unknown>>(sql, params)).rows }
    })
  } catch (e) {
    return { error: (e as Error).message }
  }
}
const filas = async (uid: string | null, sql: string, p: unknown[] = []) => {
  const r = await como(uid, sql, p)
  if (r.error) throw new Error(`${r.error}\n${sql}`)
  return r.rows!
}
let opN = 0
const op = (tabla: string, filaId: string, campos: Record<string, unknown>, tipo = 'crear', t = ts()) => ({ id: uuid(9000 + opN++), tabla, filaId, tipo, campos, ts: t, usuario: 'x', versionBase: 0 })
async function aplicar(uid: string, ops: unknown[]) {
  const r = await filas(uid, `select public.aplicar_operaciones($1::jsonb) as r`, [JSON.stringify(ops)])
  return r[0].r as { opId: string; estado: string; motivo?: string; conflictos?: unknown[] }[]
}
const EQ_A = uuid(1), EQ_P = uuid(2)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(ENTORNO)
  const dir = fileURLToPath(new URL('../proyecto-propio', import.meta.url))
  // 0004 usa el esquema storage de Supabase, que no existe en PGlite.
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql') && !x.includes('storage') && !x.includes('seed')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'))
  for (const [k, id] of Object.entries(U)) {
    await db.query(`insert into auth.users values ($1, $2, $3)`, [id, `${k}@club.test`, JSON.stringify({ nombre: k, role: 'admin', plan: 'pro' })])
    await db.query(`insert into auth.sessions (id, user_id) values ($1, $2)`, [SESION[id], id])
  }
  await db.query(`select public.fijar_plan($1, 'pro', null)`, [U.pro])
  await db.query(`select public.promover_admin('admin@club.test')`)
  // Catálogo: lo publica FutbolLab con service_role (aquí, como postgres).
  await db.query(`insert into public.ejercicios (id, datos, creado_por) values ($1, $2, $3), ($4, $5, $3)`, [
    uuid(500), JSON.stringify({ titulo: 'Rondo básico', origen: 'oficial', basico: true, intensidad: 2, jugadoresMin: 5, jugadoresMax: 20 }), U.admin,
    uuid(501), JSON.stringify({ titulo: 'Rondo avanzado', origen: 'oficial', basico: false, intensidad: 4, jugadoresMin: 5, jugadoresMax: 20 }),
  ])
})

describe('alta y perfil', () => {
  it('un registro que pide admin y Pro en los metadatos queda como player y gratis', async () => {
    const [p] = await filas(U.ana, `select role, plan from public.profiles where id = $1`, [U.ana])
    expect(p).toEqual({ role: 'player', plan: 'gratis' })
  })
  it('nadie se cambia el plan ni el rol desde la app', async () => {
    expect((await como(U.ana, `update public.profiles set plan = 'pro' where id = $1`, [U.ana])).error).toBeTruthy()
    expect((await como(U.ana, `update public.profiles set role = 'admin' where id = $1`, [U.ana])).error).toBeTruthy()
    expect((await como(U.ana, `select public.fijar_plan($1, 'pro', null)`, [U.ana])).error).toMatch(/permission denied/)
    expect((await filas(U.ana, `update public.profiles set nombre = 'Ana G.' where id = $1 returning nombre`, [U.ana]))[0].nombre).toBe('Ana G.')
  })
  it('no se ve el perfil (ni el correo) de otros', async () => {
    expect(await filas(U.ana, `select * from public.profiles`)).toHaveLength(1)
  })
})

describe('sincronización en el servidor', () => {
  it('crear equipo, jugadores, sesión y asistencia en un lote', async () => {
    const S = uuid(10)
    const r = await aplicar(U.ana, [
      op('equipos', EQ_A, { nombre: 'Alevín A', categoria: 'alevin', modalidad: 'F7', creadoPor: U.bea }),
      op('jugadores', uuid(11), { equipoId: EQ_A, nombre: 'Leo', dorsal: 7, posicion: 'DEL', estado: 'disponible' }),
      op('sesiones', S, { equipoId: EQ_A, fecha: '2026-11-27', objetivo: 'Presión', bloques: [], estado: 'planificada' }),
      op('asistencias', uuid(12), { sesionId: S, jugadorId: uuid(11), estado: 'presente' }),
    ])
    expect(r.map((x) => x.estado + (x.motivo ?? ""))).toEqual(["aplicada", "aplicada", "aplicada", "aplicada"])
    const [eq] = await filas(U.ana, `select creado_por, datos ->> 'creadoPor' as autor from public.equipos where id = $1`, [EQ_A])
    expect(eq).toEqual({ creado_por: U.ana, autor: U.ana }) // no se puede suplantar al autor
    expect((await filas(U.ana, `select rol from public.miembros where equipo_id = $1`, [EQ_A]))[0].rol).toBe('entrenador_principal')
    expect((await filas(U.ana, `select equipo_id from public.asistencias where id = $1`, [uuid(12)]))[0].equipo_id).toBe(EQ_A)
  })
  it('reenviar la misma operación no duplica', async () => {
    const o = op('notas', uuid(20), { texto: 'una' })
    expect((await aplicar(U.ana, [o]))[0].estado).toBe('aplicada')
    expect((await aplicar(U.ana, [o]))[0].estado).toBe('duplicada')
    expect(await filas(U.ana, `select id from public.notas where id = $1`, [uuid(20)])).toHaveLength(1)
  })
  it('fusiona por campo y deja constancia del conflicto', async () => {
    const id = uuid(21)
    await aplicar(U.ana, [op('notas', id, { texto: 'a', fecha: '2026-11-01' })])
    const tarde = ts(), pronto = ts()
    await aplicar(U.ana, [op('notas', id, { texto: 'desde la tableta' }, 'editar', pronto)])
    const r = await aplicar(U.ana, [op('notas', id, { fecha: '2026-11-02' }, 'editar', tarde), op('notas', id, { texto: 'viejo del móvil' }, 'editar', tarde)])
    expect(r[1].conflictos, JSON.stringify(r)).toHaveLength(1)
    const [n] = await filas(U.ana, `select datos, version from public.notas where id = $1`, [id])
    expect(n.datos).toMatchObject({ texto: 'desde la tableta', fecha: '2026-11-02' })
    expect(n.version).toBe(3)
  })
  it('un reloj adelantado no gana para siempre', async () => {
    const id = uuid(22)
    await aplicar(U.ana, [op('notas', id, { texto: 'x' }, 'crear', '2099-01-01T00:00:00.000Z')])
    const [n] = await filas(U.ana, `select campos_ts ->> 'texto' as t from public.notas where id = $1`, [id])
    expect((n.t as string) < '2030').toBe(true)
  })
  it('cambios_desde solo devuelve lo nuevo y lo que el usuario puede ver', async () => {
    const todo = await filas(U.ana, `select * from public.cambios_desde(0)`)
    expect(todo.some((f) => f.tabla === 'jugadores')).toBe(true)
    const marca = Math.max(...todo.map((f) => Number(f.marca)))
    expect(await filas(U.ana, `select * from public.cambios_desde($1)`, [marca])).toHaveLength(0)
    const deBea = await filas(U.bea, `select * from public.cambios_desde(0)`)
    expect(deBea.filter((f) => f.tabla !== 'ejercicios')).toHaveLength(0)
  })
})

describe('aislamiento entre usuarios y equipos', () => {
  it('Bea no ve ni cambia nada de Ana', async () => {
    for (const t of ['equipos', 'jugadores', 'sesiones', 'asistencias', 'notas']) expect(await filas(U.bea, `select id from public.${t}`)).toHaveLength(0)
    const r = await aplicar(U.bea, [op('notas', uuid(20), { texto: 'pirateada' }, 'editar'), op('jugadores', uuid(30), { equipoId: EQ_A, nombre: 'Intruso', dorsal: 1, estado: 'disponible' })])
    expect(r.map((x) => x.estado)).toEqual(['rechazada', 'rechazada'])
    expect((await filas(U.ana, `select datos ->> 'texto' as t from public.notas where id = $1`, [uuid(20)]))[0].t).toBe('una')
  })
  it('sin sesión (anon) no hay acceso; al cerrar sesión el token deja de valer', async () => {
    expect((await como(null, `select * from public.sesiones`)).error).toBeTruthy()
    expect((await como(null, `select public.aplicar_operaciones('[]')`)).error).toBeTruthy()
    await db.query(`delete from auth.sessions where id = $1`, [SESION[U.ana]])
    expect(await filas(U.ana, `select * from public.sesiones`)).toHaveLength(0)
    expect((await como(U.ana, `select public.aplicar_operaciones('[]')`)).error).toMatch(/sesión/)
    await db.query(`insert into auth.sessions (id, user_id) values ($1, $2)`, [SESION[U.ana], U.ana])
  })
  it('protección de menores: no se guardan fecha de nacimiento, contactos ni causas médicas', async () => {
    const r = await aplicar(U.ana, [
      op('jugadores', uuid(31), { equipoId: EQ_A, nombre: 'Mía', dorsal: 9, estado: 'disponible', fechaNacimiento: '2015-01-01' }),
      op('asistencias', uuid(32), { sesionId: uuid(10), jugadorId: uuid(11), estado: 'lesionado' }),
    ])
    expect(r.map((x) => x.estado)).toEqual(['rechazada', 'rechazada'])
    expect(r[0].motivo).toMatch(/Datos no válidos/)
  })
})

describe('biblioteca y planes', () => {
  it('Gratis ve solo los oficiales básicos; Pro, todos', async () => {
    expect((await filas(U.ana, `select titulo from public.ejercicios where origen = 'oficial'`)).map((x) => x.titulo)).toEqual(['Rondo básico'])
    expect(await filas(U.pro, `select titulo from public.ejercicios where origen = 'oficial'`)).toHaveLength(2)
  })
  it('nadie publica ni edita ejercicios oficiales desde la app', async () => {
    const r = await aplicar(U.pro, [op('ejercicios', uuid(40), { titulo: 'Falso oficial', origen: 'oficial', basico: true, intensidad: 3, jugadoresMin: 4, jugadoresMax: 8 }),
      op('ejercicios', uuid(500), { titulo: 'Cambiado' }, 'editar')])
    expect(r.map((x) => x.estado)).toEqual(['rechazada', 'rechazada'])
  })
  it('Gratis: máximo 5 sesiones y 10 ejercicios propios; Pro sin límite', async () => {
    const ses = Array.from({ length: 5 }, (_, i) => op('sesiones', uuid(100 + i), { equipoId: EQ_A, fecha: '2026-12-01', bloques: [], estado: 'planificada' }))
    const r = await aplicar(U.ana, ses)
    expect(r.filter((x) => x.estado === 'aplicada')).toHaveLength(4) // ya tenía 1
    expect(r.at(-1)!.motivo).toMatch(/5 sesiones/)
    const ej = (u: string, i: number, fases = 1) => op('ejercicios', uuid(200 + i), { titulo: `Propio ${i}`, origen: 'propio', intensidad: 3, jugadoresMin: 4, jugadoresMax: 8, pizarra: { fases: Array(fases).fill({}) } })
    const r2 = await aplicar(U.ana, Array.from({ length: 11 }, (_, i) => ej(U.ana, i)))
    expect(r2.filter((x) => x.estado === 'aplicada')).toHaveLength(10)
    expect(r2[10].motivo).toMatch(/10 ejercicios propios/)
    expect((await aplicar(U.ana, [op('ejercicios', uuid(260), { titulo: 'Animado', origen: 'propio', intensidad: 3, jugadoresMin: 4, jugadoresMax: 8, pizarra: { fases: [{}, {}] } })]))[0].motivo).toMatch(/Pro/)
    const r3 = await aplicar(U.pro, [op('equipos', EQ_P, { nombre: 'Infantil Pro', modalidad: 'F11' }), ...Array.from({ length: 7 }, (_, i) => op('sesiones', uuid(300 + i), { equipoId: EQ_P, fecha: '2026-12-01', bloques: [], estado: 'planificada' }))])
    expect(r3.every((x) => x.estado === 'aplicada')).toBe(true)
  })
  it('asistente: 3 propuestas al mes en Gratis', async () => {
    for (let i = 1; i <= 3; i++) expect((await filas(U.bea, `select public.registrar_uso_asistente() as n`))[0].n).toBe(i)
    expect((await como(U.bea, `select public.registrar_uso_asistente()`)).error).toMatch(/3 propuestas/)
    for (let i = 0; i < 5; i++) await filas(U.pro, `select public.registrar_uso_asistente()`)
  })
})

describe('cuerpo técnico (Pro) y administración', () => {
  it('compartir con el cuerpo técnico exige Pro y ser principal', async () => {
    expect((await como(U.ana, `select public.invitar_miembro($1, 'ayu@club.test', 'ayudante')`, [EQ_A])).error).toMatch(/Pro/)
    expect((await como(U.bea, `select public.invitar_miembro($1, 'ayu@club.test', 'ayudante')`, [EQ_P])).error).toMatch(/principal/)
    await filas(U.pro, `select public.invitar_miembro($1, 'ayu@club.test', 'ayudante')`, [EQ_P])
    expect(await filas(U.ayu, `select id from public.sesiones`)).toHaveLength(7)
    const nombres = await filas(U.ayu, `select nombre from public.companeros($1)`, [EQ_P])
    expect(nombres.map((x) => x.nombre).sort()).toEqual(['ayu', 'pro'])
    expect(Object.keys((await filas(U.ayu, `select * from public.companeros($1)`, [EQ_P]))[0])).not.toContain('email')
  })
  it('el admin solo actúa con doble factor (aal2)', async () => {
    expect((await como(U.admin, `select public.admin_set_role($1, 'admin')`, [U.ana])).error).toMatch(/doble factor/)
    expect((await como(U.admin, `select count(*)::int as n from public.registro_actividad`, [], 'aal1')).rows![0].n).toBe(0)
    const act = (await como(U.admin, `select * from public.registro_actividad`, [], 'aal2')).rows!
    expect(act.length).toBeGreaterThan(0)
  })
  it('el registro de actividad no guarda valores personales', async () => {
    const act = (await db.query<{ campos: string[]; registro_id: string }>(`select * from public.registro_actividad`)).rows
    const texto = JSON.stringify(act)
    expect(texto).not.toMatch(/Leo|Alevín A|ana@club/)
  })
  it('mantenimiento: la papelera caduca a los 30 días como lápida', async () => {
    await aplicar(U.ana, [op('notas', uuid(20), { eliminadoEn: new Date(Date.now() - 40 * 864e5).toISOString() }, 'borrar')])
    await db.query(`select public.mantenimiento()`)
    const [n] = await filas(U.ana, `select purgada, datos from public.notas where id = $1`, [uuid(20)])
    expect(n).toEqual({ purgada: true, datos: { id: uuid(20) } })
  })
})

describe('semilla de demostración', () => {
  it('seed.sql carga el catálogo y un usuario Gratis lo ve', async () => {
    await db.exec(readFileSync(fileURLToPath(new URL('../proyecto-propio/seed.sql', import.meta.url)), 'utf8'))
    const n = await filas(U.bea, `select count(*)::int as n from public.ejercicios where origen = 'demo'`)
    expect(n[0].n).toBe(16)
  })
})
