-- ════════════════════════════════════════════════════════════════════════
-- FutbolLab Sesiones · 0003 · límites Gratis/Pro, asistente, pagos y registro de actividad
-- Los límites se comprueban AQUÍ: la app solo los muestra antes para no frustrar.
-- ════════════════════════════════════════════════════════════════════════

create function public.limite_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int; pro boolean;
begin
  select (p.plan = 'pro' and (p.pro_hasta is null or p.pro_hasta > now())) into pro from public.profiles p where p.id = new.creado_por;
  if coalesce(pro, false) then return new; end if;
  if tg_table_name = 'ejercicios' then
    if (new.datos ->> 'origen') is distinct from 'propio' then return new; end if;
    select count(*) into n from public.ejercicios e where e.creado_por = new.creado_por and e.origen = 'propio' and e.eliminado_en is null and not e.purgada;
    if n >= 10 then raise exception 'Con el plan Gratis puedes tener 10 ejercicios propios. Pásate a Pro para crear sin límite.' using errcode = 'P0001'; end if;
  elsif tg_table_name = 'sesiones' then
    select count(*) into n from public.sesiones s where s.creado_por = new.creado_por and s.eliminado_en is null and not s.purgada;
    if n >= 5 then raise exception 'Con el plan Gratis puedes guardar 5 sesiones. Borra alguna o pásate a Pro.' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
create trigger ejercicios_limite before insert on public.ejercicios for each row execute function public.limite_plan();
create trigger sesiones_limite before insert on public.sesiones for each row execute function public.limite_plan();

-- La animación por fases (más de una fase) es Pro en los ejercicios propios.
create function public.limite_animacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.origen = 'propio' and jsonb_array_length(coalesce(new.datos -> 'pizarra' -> 'fases', '[]')) > 1 and not public.es_pro() then
    raise exception 'La animación por fases de tus ejercicios es una función Pro.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger ejercicios_animacion before insert or update on public.ejercicios for each row execute function public.limite_animacion();

-- ───────────── Asistente: 3 propuestas al mes en Gratis ─────────────
create table public.asistente_usos (
  id bigint generated always as identity primary key,
  usuario uuid not null references public.profiles (id) on delete cascade,
  creado_en timestamptz not null default now()
);
create index asistente_usos_idx on public.asistente_usos (usuario, creado_en);
alter table public.asistente_usos enable row level security;
create policy usos_ver on public.asistente_usos for select to authenticated using (usuario = (select auth.uid()));
grant select on public.asistente_usos to authenticated;

create function public.registrar_uso_asistente() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.sesion_activa() then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select count(*) into n from public.asistente_usos where usuario = auth.uid() and creado_en >= date_trunc('month', now());
  if n >= 3 and not public.es_pro() then raise exception 'Has usado las 3 propuestas de este mes. Con Pro son ilimitadas.' using errcode = 'P0001'; end if;
  insert into public.asistente_usos (usuario) values (auth.uid());
  return n + 1;
end $$;
grant execute on function public.registrar_uso_asistente() to authenticated;

-- ───────────── Suscripciones (solo las escribe el webhook de pagos con service_role) ─────────────
create table public.suscripciones (
  usuario uuid primary key references public.profiles (id) on delete cascade,
  cliente_pago text,
  suscripcion_pago text,
  estado text not null check (estado in ('activa', 'cancelada', 'impagada')),
  periodo text not null check (periodo in ('mensual', 'anual')),
  fin_periodo timestamptz not null,
  actualizado_en timestamptz not null default now()
);
alter table public.suscripciones enable row level security;
create policy suscripcion_ver on public.suscripciones for select to authenticated using (usuario = (select auth.uid()));
grant select on public.suscripciones to authenticated;

-- ───────────── Registro de actividad: SIN valores personales, caduca a 12 meses ─────────────
create table public.registro_actividad (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  actor uuid,
  tabla text not null,
  registro_id text,
  accion text not null,
  campos text[] not null default '{}'
);
alter table public.registro_actividad enable row level security;
create policy actividad_ver on public.registro_actividad for select to authenticated using (public.is_admin());
grant select on public.registro_actividad to authenticated;

create function public.registrar_actividad() returns trigger
language plpgsql security definer set search_path = '' as $$
declare antes jsonb; despues jsonb; campos text[];
begin
  antes := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  despues := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  if tg_op = 'UPDATE' then
    if antes ? 'datos' then antes := antes || (antes -> 'datos'); despues := despues || (despues -> 'datos'); end if;
    select coalesce(array_agg(k order by k), '{}') into campos from (select jsonb_object_keys(despues) k) ks
    where antes -> k is distinct from despues -> k and k not in ('datos', 'campos_ts', 'marca', 'version', 'actualizadoEn', 'nombre');
    if tg_table_name = 'profiles' then campos := array(select unnest(campos) intersect select unnest(array['role', 'plan', 'pro_hasta'])); end if;
    if cardinality(campos) = 0 then return null; end if;
  end if;
  insert into public.registro_actividad (actor, tabla, registro_id, accion, campos)
  values (auth.uid(), tg_table_name, coalesce(despues ->> 'id', antes ->> 'id', (coalesce(despues, antes) ->> 'equipo_id') || '/' || (coalesce(despues, antes) ->> 'usuario_id')), tg_op, coalesce(campos, '{}'));
  return null;
end $$;
create trigger equipos_actividad after insert or update or delete on public.equipos for each row execute function public.registrar_actividad();
create trigger miembros_actividad after insert or update or delete on public.miembros for each row execute function public.registrar_actividad();
create trigger jugadores_actividad after insert or update or delete on public.jugadores for each row execute function public.registrar_actividad();
create trigger profiles_actividad after update on public.profiles for each row execute function public.registrar_actividad();

-- ───────────── Mantenimiento (programar a diario con pg_cron, como service_role) ─────────────
create function public.mantenimiento() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t text; n int; total int := 0;
begin
  foreach t in array array['jugadores', 'ejercicios', 'sesiones', 'asistencias', 'cierres', 'notas', 'carpetas', 'vistas', 'favoritos'] loop
    -- Papelera de 30 días → lápida (para que los dispositivos se enteren) → borrado real a los 90.
    execute format('update public.%I set purgada = true, datos = jsonb_build_object(''id'', id), marca = nextval(''public.marca_seq'') where not purgada and eliminado_en < now() - interval ''30 days''', t);
    execute format('delete from public.%I where purgada and eliminado_en < now() - interval ''90 days''', t);
    get diagnostics n = row_count; total := total + n;
  end loop;
  delete from public.ops_aplicadas where aplicada_en < now() - interval '180 days';
  delete from public.registro_actividad where creado_en < now() - interval '12 months';
  return jsonb_build_object('borradas', total);
end $$;
grant execute on function public.mantenimiento() to service_role;
