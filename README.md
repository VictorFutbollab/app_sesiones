# FutbolLab Sesiones

App 1 del ecosistema FutbolLab: biblioteca de ejercicios, pizarra táctica animada, constructor de sesiones y modo entrenamiento para dirigir desde el campo con el móvil. PWA instalable que funciona sin conexión.

Proyecto **independiente** de FutbolLab Jugadores: repositorio, Supabase, Vercel y variables propios. Reutiliza patrones probados de Jugadores (seguridad RLS, sesión viva, offline, PWA, fuentes autoalojadas, pruebas sobre PGlite), no su base de datos.

## Arrancar

Requisitos: Node 20 o superior.

```bash
npm install
npm run dev            # http://127.0.0.1:5173 — sin .env.local arranca en MODO DEMOSTRACIÓN
npm test               # 39 pruebas: sincronización, lógica, asistente, catálogo y RLS sobre PostgreSQL (PGlite)
npm run typecheck
npm run build          # PWA en dist/ (service worker + manifest)
npm run preview        # sirve dist/ en :4173
npm run e2e:criterios  # (con preview en marcha) criterios de aceptación en Chromium tamaño móvil
npm run build:demo     # un único HTML autocontenido para enseñar el prototipo
```

**Modo demostración:** sin `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, todo se guarda en el dispositivo, Pro se puede activar sin pago para probarlo y la app lo indica en pantalla.

## Poner en marcha el servidor (proyecto Supabase NUEVO, región UE)

1. Crea el proyecto en supabase.com (nunca reutilices el de Jugadores/Informes).
2. Aplica `supabase/migrations/` en orden (`npx supabase db push` o SQL Editor).
3. Auth → Email: confirmación activada, mínimo 8 caracteres, protección de contraseñas filtradas. Activa Google y Apple. Configura SMTP propio. Activa MFA (TOTP): el admin solo actúa con 2FA.
4. Regístrate en la app y ejecuta `select public.promover_admin('tu@correo');` en el SQL Editor.
5. Carga el catálogo de demostración: `npm run semilla` y ejecuta `supabase/seed.sql` en el SQL Editor.
6. Edge Functions: `npx supabase functions deploy asistente borrar-cuenta pagos-checkout pagos-webhook` y secretos `ANTHROPIC_API_KEY`, `ASISTENTE_MODELO` (opcional), `ORIGEN_APP`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRECIO_MENSUAL`, `STRIPE_PRECIO_ANUAL`.
7. Programa `select public.mantenimiento();` a diario (pg_cron) como service_role.
8. `.env.local` (y Vercel → Environment Variables): solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
9. Vercel: proyecto nuevo; `vercel.json` ya trae CSP y cabeceras de seguridad.

## Arquitectura en una línea por capa

| Capa | Archivos | Qué hace |
| --- | --- | --- |
| Modelo | `src/model/comun.ts`, `sesiones.ts` | Común FutbolLab (idéntico en las 4 apps) + propio de Sesiones |
| Datos locales | `src/lib/db/idb.ts`, `repo.ts` | IndexedDB; cada cambio se guarda con su operación en la misma transacción |
| Sincronización | `src/lib/sync/*` | Cola idempotente, fusión por campo, bajada incremental; mismo algoritmo en `aplicar_operaciones` (SQL) |
| Servidor | `supabase/migrations/*` | Perfiles, equipos, RLS en todas las tablas, columnas tipadas generadas, límites Gratis/Pro, actividad sin datos personales |
| Asistente | `supabase/functions/_shared/asistente.ts`, `asistente/` | Prefiltra la biblioteca, Claude elige solo entre ids reales, el servidor valida |
| Pizarra | `src/features/pizarra/*` | SVG propio en metros, fases animadas, editor táctil con deshacer |
| Pantallas | `src/features/*` | Cuenta, inicio, biblioteca, ficha, editor, constructor, modo campo, sesiones, perfil, planes, papelera |
| Exportar | `src/lib/exportar/*` | PDF vectorial e imagen generados en el dispositivo; compartir por WhatsApp |

Detalles de estado, pendientes y decisiones: `ESTADO.md`.
