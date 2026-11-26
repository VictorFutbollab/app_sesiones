/**
 * Genera supabase/seed.sql con el catálogo de DEMOSTRACIÓN para un proyecto nuevo.
 * Uso: node scripts/generar-semilla.mjs  (requiere que exista una cuenta admin en profiles)
 * Se ejecuta en el SQL Editor; los ejercicios quedan con origen 'demo'.
 */
import { createServer } from 'vite'
import { writeFileSync } from 'node:fs'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { EJERCICIOS_DEMO } = await vite.ssrLoadModule('/src/data/ejercicios-demo.ts')
await vite.close()
const q = (s) => `'${s.replace(/'/g, "''")}'`
const filas = EJERCICIOS_DEMO.map((e) => `  (${q(e.id)}::uuid, ${q(JSON.stringify(e))}::jsonb)`).join(',\n')
writeFileSync('supabase/seed.sql', `-- Catálogo de demostración (${EJERCICIOS_DEMO.length} ejercicios). Generado por scripts/generar-semilla.mjs.
-- Ejecutar como postgres en el SQL Editor DESPUÉS de crear el primer admin (promover_admin).
insert into public.ejercicios (id, datos, creado_por)
select v.id, v.datos || jsonb_build_object('creadoPor', a.id), a.id
from (values
${filas}
) as v(id, datos), (select id from public.profiles where role = 'admin' order by creado_en limit 1) a
on conflict (id) do nothing;
`)
console.log(`supabase/seed.sql: ${EJERCICIOS_DEMO.length} ejercicios`)
