-- ════════════════════════════════════════════════════════════════════════
-- FutbolLab Sesiones · 0002 · tablas de datos y sincronización sin conexión
--
-- Cada tabla guarda el objeto de la app en `datos` (jsonb) y saca a COLUMNAS TIPADAS
-- GENERADAS todo lo que se filtra, ordena, valida o protege (RLS). Así:
--   · la fusión por campo es una sola función genérica (aplicar_operaciones), idéntica
--     al algoritmo de la app (src/lib/sync/fusion.ts);
--   · los filtros de la biblioteca usan índices sobre columnas reales;
--   · las restricciones CHECK validan los datos en el servidor.
-- ════════════════════════════════════════════════════════════════════════

create sequence public.marca_seq;
alter table public.equipos alter column marca set default nextval('public.marca_seq');

do $$
declare t text;
begin
  foreach t in array array['jugadores', 'ejercicios', 'sesiones', 'asistencias', 'cierres', 'notas', 'carpetas', 'vistas', 'favoritos'] loop
    execute format($f$
      create table public.%I (
        id uuid primary key,
        datos jsonb not null check (pg_column_size(datos) < 200000),
        version int not null default 1,
        campos_ts jsonb not null default '{}',
        marca bigint not null default nextval('public.marca_seq'),
        creado_por uuid not null references public.profiles (id) on delete cascade,
        equipo_id uuid references public.equipos (id) on delete cascade,
        eliminado_en timestamptz,
        purgada boolean not null default false
      )$f$, t);
    execute format('create index %I on public.%I (marca)', t || '_marca_idx', t);
    execute format('create index %I on public.%I (equipo_id)', t || '_equipo_idx', t);
    execute format('create index %I on public.%I (creado_por)', t || '_autor_idx', t);
  end loop;
end $$;
create index equipos_marca_idx on public.equipos (marca);

-- Columnas tipadas (generadas a partir de `datos`) con validación en el servidor.
alter table public.jugadores
  add column nombre text generated always as (left(datos ->> 'nombre', 80)) stored,
  add column dorsal int generated always as ((datos ->> 'dorsal')::int) stored,
  add column estado text generated always as (datos ->> 'estado') stored,
  add check (dorsal is null or dorsal between 0 and 99),
  add check (estado is null or estado in ('disponible', 'no_disponible')),
  -- Minimización (menores): Sesiones solo guarda nombre, dorsal, posición y disponibilidad.
  add check (purgada or not (datos ?| array['fechaNacimiento', 'contactos', 'foto', 'lesion', 'diagnostico', 'telefono', 'email']));

alter table public.ejercicios
  add column titulo text generated always as (left(datos ->> 'titulo', 140)) stored,
  add column origen text generated always as (datos ->> 'origen') stored,
  add column basico boolean generated always as (coalesce((datos ->> 'basico')::boolean, false)) stored,
  add column fase text generated always as (datos ->> 'faseJuego') stored,
  add column principio text generated always as (datos ->> 'principio') stored,
  add column tipo text generated always as (datos ->> 'tipo') stored,
  add column jugadores_min int generated always as ((datos ->> 'jugadoresMin')::int) stored,
  add column jugadores_max int generated always as ((datos ->> 'jugadoresMax')::int) stored,
  add column edad_min int generated always as ((datos ->> 'edadMin')::int) stored,
  add column edad_max int generated always as ((datos ->> 'edadMax')::int) stored,
  add column intensidad int generated always as ((datos ->> 'intensidad')::int) stored,
  add column busqueda tsvector generated always as (
    to_tsvector('simple', coalesce(datos ->> 'titulo', '') || ' ' || coalesce(datos ->> 'objetivo', '') || ' ' || coalesce(datos ->> 'principio', ''))
  ) stored,
  add check (origen is null or origen in ('oficial', 'demo', 'propio')),
  add check (intensidad is null or intensidad between 1 and 5),
  add check (jugadores_min is null or jugadores_min between 1 and 40),
  add check (jugadores_max is null or jugadores_max >= jugadores_min),
  add check (purgada or char_length(coalesce(datos ->> 'titulo', '')) between 1 and 140);
create index ejercicios_filtros_idx on public.ejercicios (origen, fase, tipo, intensidad);
create index ejercicios_busqueda_idx on public.ejercicios using gin (busqueda);

alter table public.sesiones
  add column fecha text generated always as (datos ->> 'fecha') stored,
  add column estado text generated always as (datos ->> 'estado') stored,
  add check (fecha is null or fecha ~ '^\d{4}-\d{2}-\d{2}$'),
  add check (estado is null or estado in ('planificada', 'hecha')),
  add check (purgada or jsonb_typeof(coalesce(datos -> 'bloques', '[]')) = 'array');
create index sesiones_fecha_idx on public.sesiones (equipo_id, fecha);

alter table public.asistencias
  add column sesion_id text generated always as (datos ->> 'sesionId') stored,
  add column jugador_id text generated always as (datos ->> 'jugadorId') stored,
  add column estado text generated always as (datos ->> 'estado') stored,
  -- Sin causa médica: "no_disponible" sustituye a "lesionado" (art. 9 RGPD).
  add check (estado is null or estado in ('presente', 'justificado', 'ausente', 'no_disponible'));
create index asistencias_sesion_idx on public.asistencias (sesion_id);

alter table public.cierres
  add column sesion_id text generated always as (datos ->> 'sesionId') stored,
  add column rpe int generated always as ((datos ->> 'rpe')::int) stored,
  add column objetivo text generated always as (datos ->> 'objetivoCumplido') stored,
  add check (rpe is null or rpe between 1 and 10),
  add check (objetivo is null or objetivo in ('si', 'en_parte', 'no'));

alter table public.notas
  add check (char_length(coalesce(datos ->> 'texto', '')) <= 4000);

-- ───────────── Operaciones ya aplicadas (idempotencia) ─────────────
create table public.ops_aplicadas (
  id uuid primary key,
  usuario uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  aplicada_en timestamptz not null default now()
);

-- ───────────── Políticas RLS ─────────────
do $$
declare t text;
begin
  foreach t in array array['jugadores', 'sesiones', 'asistencias', 'cierres', 'notas', 'carpetas', 'vistas', 'favoritos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %I on public.%I for select to authenticated using (
      (creado_por = (select auth.uid()) and public.sesion_activa()) or (equipo_id is not null and public.es_miembro(equipo_id)) or public.is_admin())$p$, t || '_ver', t);
    execute format($p$create policy %I on public.%I for insert to authenticated with check (
      creado_por = (select auth.uid()) and public.sesion_activa() and (equipo_id is null or public.es_miembro(equipo_id)))$p$, t || '_crear', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using ((creado_por = (select auth.uid()) and public.sesion_activa()) or (equipo_id is not null and public.es_miembro(equipo_id)))
      with check (equipo_id is null or public.es_miembro(equipo_id))$p$, t || '_editar', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;
-- Datos personales: carpetas, vistas y favoritos nunca se comparten aunque lleven equipo.
alter policy carpetas_ver on public.carpetas using (creado_por = (select auth.uid()) and public.sesion_activa());
alter policy vistas_ver on public.vistas using (creado_por = (select auth.uid()) and public.sesion_activa());
alter policy favoritos_ver on public.favoritos using (creado_por = (select auth.uid()) and public.sesion_activa());

alter table public.ejercicios enable row level security;
create policy ejercicios_ver on public.ejercicios for select to authenticated using (
  public.sesion_activa() and (
    creado_por = (select auth.uid())
    or (origen in ('oficial', 'demo') and (basico or public.es_pro()))
    or (equipo_id is not null and coalesce((datos ->> 'publico')::boolean, false) and public.es_miembro(equipo_id))
  ) or public.is_admin());
create policy ejercicios_crear on public.ejercicios for insert to authenticated with check (
  creado_por = (select auth.uid()) and public.sesion_activa() and (origen = 'propio' or public.is_admin())
  and (equipo_id is null or public.es_miembro(equipo_id)));
create policy ejercicios_editar on public.ejercicios for update to authenticated
  using ((creado_por = (select auth.uid()) and origen = 'propio' and public.sesion_activa()) or public.is_admin())
  with check ((origen = 'propio' or public.is_admin()) and (equipo_id is null or public.es_miembro(equipo_id)));
grant select, insert, update on public.ejercicios to authenticated;

create policy equipos_ver on public.equipos for select to authenticated using ((creado_por = (select auth.uid()) and public.sesion_activa()) or public.es_miembro(id) or public.is_admin());
create policy equipos_crear on public.equipos for insert to authenticated with check (creado_por = (select auth.uid()) and public.sesion_activa());
create policy equipos_editar on public.equipos for update to authenticated using (public.es_principal(id) or (creado_por = (select auth.uid()) and public.sesion_activa())) with check (true);
alter table public.equipos enable row level security;
grant select, insert, update on public.equipos to authenticated;

alter table public.ops_aplicadas enable row level security;
create policy ops_ver on public.ops_aplicadas for select to authenticated using (usuario = (select auth.uid()));
create policy ops_crear on public.ops_aplicadas for insert to authenticated with check (usuario = (select auth.uid()));
grant select, insert on public.ops_aplicadas to authenticated;
grant usage on sequence public.marca_seq to authenticated;

-- ───────────── Equipo de una fila (asistencias, cierres y notas lo heredan de su sesión) ─────────────
create function public.equipo_de(tabla text, d jsonb, fila uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare eq uuid;
begin
  if tabla = 'equipos' then return fila; end if;
  if d ? 'equipoId' and nullif(d ->> 'equipoId', '') is not null then return (d ->> 'equipoId')::uuid; end if;
  if d ? 'sesionId' and nullif(d ->> 'sesionId', '') is not null then
    select s.equipo_id into eq from public.sesiones s where s.id = (d ->> 'sesionId')::uuid;
    return eq;
  end if;
  return null;
end $$;

-- ───────────── aplicar_operaciones: el corazón de la sincronización ─────────────
-- SECURITY INVOKER: cada operación pasa las mismas políticas RLS que una escritura directa.
-- Cada operación va en su propia subtransacción: una rechazada no tumba el lote.
create function public.aplicar_operaciones(ops jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  op jsonb; res jsonb := '[]'::jsonb; tabla text; fila uuid; ts text; tipo text;
  d jsonb; cts jsonb; ver int; purg boolean; existe boolean;
  k text; v jsonb; aplicados int; confl jsonb; eq uuid; elim timestamptz; motivo text; estado_sql text;
  permitidas constant text[] := array['equipos', 'jugadores', 'ejercicios', 'sesiones', 'asistencias', 'cierres', 'notas', 'carpetas', 'vistas', 'favoritos'];
  inmutables constant text[] := array['id', 'creadoPor', 'creadoEn', 'version'];
begin
  if not public.sesion_activa() then raise exception 'Tu sesión ha caducado. Vuelve a entrar.' using errcode = '42501'; end if;
  if jsonb_typeof(ops) <> 'array' or jsonb_array_length(ops) > 200 then raise exception 'Lote no válido'; end if;

  for op in select value from jsonb_array_elements(ops) loop
    begin
      tabla := op ->> 'tabla';
      tipo := op ->> 'tipo';
      if not (tabla = any (permitidas)) then raise exception 'Tabla no permitida' using errcode = '42501'; end if;
      if tipo not in ('crear', 'editar', 'borrar', 'restaurar', 'purgar') then raise exception 'Operación no válida'; end if;
      if exists (select 1 from public.ops_aplicadas a where a.id = (op ->> 'id')::uuid) then
        res := res || jsonb_build_array(jsonb_build_object('opId', op ->> 'id', 'estado', 'duplicada'));
        continue;
      end if;
      fila := (op ->> 'filaId')::uuid;
      ts := op ->> 'ts';
      -- Un reloj de dispositivo adelantado no puede "ganar" todos los conflictos futuros.
      if ts is null or ts::timestamptz > now() + interval '5 minutes' then
        ts := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
      end if;

      execute format('select datos, version, campos_ts, purgada from public.%I where id = $1 for update', tabla)
        into d, ver, cts, purg using fila;
      existe := d is not null;
      confl := '[]'::jsonb;

      if tipo = 'purgar' then
        if existe then
          execute format('update public.%I set purgada = true, datos = jsonb_build_object(''id'', id), marca = nextval(''public.marca_seq'') where id = $1', tabla) using fila;
        end if;
      elsif not existe then
        d := ((op -> 'campos') - 'version') || jsonb_build_object('id', fila, 'version', 1, 'creadoPor', auth.uid());
        select coalesce(jsonb_object_agg(key, ts), '{}'::jsonb) into cts from jsonb_object_keys(op -> 'campos') key where key <> 'version';
        eq := public.equipo_de(tabla, d, fila);
        elim := nullif(d ->> 'eliminadoEn', '')::timestamptz;
        if tabla = 'equipos' then
          insert into public.equipos (id, datos, version, campos_ts, creado_por, eliminado_en) values (fila, d, 1, cts, auth.uid(), elim);
        else
          execute format('insert into public.%I (id, datos, version, campos_ts, creado_por, equipo_id, eliminado_en) values ($1, $2, 1, $3, $4, $5, $6)', tabla)
            using fila, d, cts, auth.uid(), eq, elim;
        end if;
      elsif not purg then
        aplicados := 0;
        for k, v in select key, value from jsonb_each(op -> 'campos') loop
          continue when k = any (inmutables);
          if cts ? k and ts < (cts ->> k) then
            if (d -> k) is distinct from v then
              confl := confl || jsonb_build_array(jsonb_build_object('campo', k, 'descartado', v, 'vigente', d -> k));
            end if;
            continue;
          end if;
          cts := jsonb_set(cts, array[k], to_jsonb(ts));
          if (d -> k) is not distinct from v then continue; end if;
          d := jsonb_set(d, array[k], v);
          aplicados := aplicados + 1;
        end loop;
        if aplicados > 0 then
          ver := ver + 1;
          d := jsonb_set(d, '{version}', to_jsonb(ver));
          eq := public.equipo_de(tabla, d, fila);
          elim := nullif(d ->> 'eliminadoEn', '')::timestamptz;
          if tabla = 'equipos' then
            update public.equipos set datos = d, version = ver, campos_ts = cts, eliminado_en = elim, marca = nextval('public.marca_seq') where id = fila;
          else
            execute format('update public.%I set datos = $2, version = $3, campos_ts = $4, equipo_id = $5, eliminado_en = $6, marca = nextval(''public.marca_seq'') where id = $1', tabla)
              using fila, d, ver, cts, eq, elim;
          end if;
        else
          execute format('update public.%I set campos_ts = $2 where id = $1', tabla) using fila, cts;
        end if;
      end if;

      insert into public.ops_aplicadas (id) values ((op ->> 'id')::uuid);
      res := res || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('opId', op ->> 'id', 'estado', 'aplicada',
        'conflictos', case when jsonb_array_length(confl) > 0 then confl end)));
    exception when others then
      get stacked diagnostics motivo = message_text, estado_sql = returned_sqlstate;
      motivo := case
        when estado_sql = '42501' or motivo ~* 'row-level security' then coalesce(nullif(case when motivo ~ '^(No |Solo |Tu sesión)' then motivo end, ''), 'No tienes permiso para cambiar esto.')
        when estado_sql = 'P0001' then motivo
        when estado_sql like '23%' then 'Datos no válidos: ' || motivo
        else 'Error del servidor: ' || motivo end;
      res := res || jsonb_build_array(jsonb_build_object('opId', op ->> 'id', 'estado', 'rechazada', 'motivo', motivo));
    end;
  end loop;
  return res;
end $$;

-- ───────────── cambios_desde: bajada incremental (RLS decide qué ve cada uno) ─────────────
create function public.cambios_desde(desde bigint) returns table (tabla text, id uuid, datos jsonb, version int, marca bigint, purgada boolean)
language sql stable security invoker set search_path = '' as $$
  select * from (
    select 'equipos', e.id, e.datos, e.version, e.marca, e.purgada from public.equipos e where e.marca > desde
    union all select 'jugadores', x.id, x.datos, x.version, x.marca, x.purgada from public.jugadores x where x.marca > desde
    union all select 'ejercicios', x.id, x.datos, x.version, x.marca, x.purgada from public.ejercicios x where x.marca > desde
    union all select 'sesiones', x.id, x.datos, x.version, x.marca, x.purgada from public.sesiones x where x.marca > desde
    union all select 'asistencias', x.id, x.datos, x.version, x.marca, x.purgada from public.asistencias x where x.marca > desde
    union all select 'cierres', x.id, x.datos, x.version, x.marca, x.purgada from public.cierres x where x.marca > desde
    union all select 'notas', x.id, x.datos, x.version, x.marca, x.purgada from public.notas x where x.marca > desde
    union all select 'carpetas', x.id, x.datos, x.version, x.marca, x.purgada from public.carpetas x where x.marca > desde
    union all select 'vistas', x.id, x.datos, x.version, x.marca, x.purgada from public.vistas x where x.marca > desde
    union all select 'favoritos', x.id, x.datos, x.version, x.marca, x.purgada from public.favoritos x where x.marca > desde
  ) c order by 5 limit 5000
$$;

grant execute on function public.aplicar_operaciones(jsonb), public.cambios_desde(bigint) to authenticated;
