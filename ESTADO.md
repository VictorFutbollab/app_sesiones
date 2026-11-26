# Estado de FutbolLab Sesiones · 26 nov 2026

Leyenda: **D** diseñada · **I** implementada · **P** probada (automático) · **LP** lista para producción.
"Probada" = pruebas unitarias/RLS (39) y/o recorrido en Chromium móvil (`e2e/criterios.mjs`, 7/7). Nada está **LP** hasta conectar el Supabase real y probar con entrenadores.

| Función | Estado | Notas |
| --- | --- | --- |
| Registro correo (demo y Supabase) | I · P (demo) | Supabase: código escrito, sin probar contra servidor real |
| Google / Apple | I | Requiere configurar proveedores en Supabase |
| Alta de equipo (+ pegar plantilla, equipo de ejemplo) | I · P | 0,7 s de máquina, 9 interacciones |
| Inicio: próxima sesión, empezar, 3 sugeridos, favoritos, búsqueda global | I · P | |
| Biblioteca: texto sin tildes + 9 filtros + vistas guardadas + orden + carpetas | I · P | Miniaturas animan al pasar/enfocar (no todas a la vez, por batería) |
| Ficha completa, valorar, favorito, variante, duplicar, carpeta, notas, historial, papelera, archivar | I · P (parcial) | |
| Editor de pizarra: 3 tipos de campo, 11 elementos, 4 flechas, fases, deshacer/rehacer, girar, etiquetas | I · P (colocar) | Arrastrar con el dedo probado a mano en escritorio, no en móvil real |
| Constructor 4 bloques, arrastrar (táctil/ratón) y flechas accesibles, duración y carga automáticas | I · P | |
| Asistente "proponme una sesión" | I · P (reglas) | Edge Function con Claude escrita, sin probar: falta clave |
| Modo entrenamiento: asistencia en un toque, pizarra, cronómetro por series con pitido/vibración, pantalla encendida, notas de voz | I · P (asistencia) | Pitidos y Wake Lock dependen del navegador |
| Cierre (objetivo, RPE, nota) e historial | I | |
| Mis sesiones: lista, calendario, búsqueda | I · P | |
| Equipo y perfil, cuerpo técnico (Pro), exportar mis datos, borrar cuenta | I | Borrar cuenta = Edge Function sin probar |
| Sin conexión (IndexedDB + service worker) | I · P | Recarga y creación en modo avión |
| Sincronización (cola, idempotencia, fusión por campo, conflictos, rechazos) | I · P | 9 pruebas con dos dispositivos simulados y cortes de red |
| Seguridad servidor (RLS, sesión viva, admin con 2FA, menores, límites, actividad sin valores) | I · P | 20 pruebas sobre PostgreSQL real (PGlite) |
| PDF (vectorial, marca de agua / escudo) e imagen, WhatsApp | I · P (PDF) | |
| Gratis / Pro (límites en cliente y servidor) | I · P | |
| Pagos Stripe (checkout + webhook) | I | Sin probar: faltan cuentas Stripe |
| Transcripción de notas de voz (Pro) | I | Usa el reconocimiento del navegador (Chrome/Edge); en Safari no transcribe |

## Decisiones tomadas (sin preguntar, según tu instrucción)

1. Proyecto, repo, Supabase y Vercel nuevos; nada compartido con Jugadores/Informes.
2. `datos jsonb` + **columnas tipadas generadas** para filtrar, validar y proteger: una sola función de fusión genérica e índices reales.
3. Sincronización propia (no PowerSync/ElectricSQL).
4. "Lesionado" → **"No disponible" sin causa** (RGPD art. 9). El servidor rechaza fechas de nacimiento, contactos y causas médicas.
5. Admin = rol en servidor + **2FA (aal2)** en vez del PIN de Jugadores.
6. Pago web con Stripe mientras sea PWA.
7. 16 ejercicios de **demostración** marcados como tales (no 60 oficiales: deben escribirlos/revisarlos entrenadores reales).
8. Asistencia por defecto "Está" y se toca a quien falta (patrón Spond): 16 jugadores en 1–3 toques.
9. **Diseño "Césped" de FutbolLab Jugadores** (26 nov): tema claro por defecto, logo oficial, barra y navegación en verde casi negro (píldora flotante en móvil, menú lateral en ordenador), portada de césped a franjas en Inicio, acción estrella en amarillo, títulos en Bricolage Grotesque y entrada con la foto nocturna (CC0). Estilos en `src/ui/estilos.css` (tokens y estructura) y `src/ui/cesped.css` (aspecto). "Noche" sigue disponible en Perfil; el modo campo conserva su alto contraste oscuro.

## Pendiente (no se puede hacer desde aquí)

- Rotar la clave `service_role`, el PIN y el token de Vercel de **Jugadores** (estaban en el RAR).
- Crear las cuentas (Supabase UE, Vercel, GitHub, Stripe, Anthropic) y repetir `npm test` + `scripts` contra el servidor real.
- Contenido: 60 ejercicios oficiales básicos y 300 Pro revisados por entrenadores.
- Revisión legal de `public/privacidad.html` (borrador) y del encargo de tratamiento con Supabase/Anthropic/Stripe.
- Pruebas con 5–10 entrenadores y en iPhone/Android reales (Safari: almacenamiento, audio, Wake Lock).
- Benchmark visual con capturas reales de la competencia (la búsqueda web está desactivada en la organización).
- Limitación conocida de la bajada incremental: se re-piden las últimas 200 marcas para cubrir transacciones concurrentes; a gran escala conviene una marca por transacción confirmada.
- 13 avisos de lint de estilo (fast-refresh/refs), sin errores.
