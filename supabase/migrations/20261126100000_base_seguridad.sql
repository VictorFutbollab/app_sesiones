-- ════════════════════════════════════════════════════════════════════════
-- FutbolLab Sesiones · 0001 · perfiles, roles y seguridad base
-- Proyecto de Supabase PROPIO. No depende de ninguna función de Jugadores ni de Informes.
-- Patrón heredado de FutbolLab Jugadores (probado): el rol se lee de public.profiles,
-- nunca del JWT ni de metadatos editables; cada comprobación exige sesión viva.
-- Cambio respecto a Jugadores: el poder de admin exige además sesión con 2FA (aal2)
-- en lugar de un PIN propio.
-- ════════════════════════════════════════════════════════════════════════

create type public.app_role as enum ('player', 'admin');
create type public.plan as enum ('gratis', 'pro');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 120),
  email text not null default '',
  role public.app_role not null default 'player',
  plan public.plan not null default 'gratis',
  pro_hasta timestamptz,
  acepta_privacidad_en timestamptz,
  version_privacidad text,
  creado_en timestamptz not null default now()
);

create function public.sesion_activa() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
  )
$$;

-- Admin: rol en servidor + sesión viva + segundo factor (aal2).
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.sesion_activa()
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
$$;

create function public.es_pro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'pro' and (p.pro_hasta is null or p.pro_hasta > now()))
$$;

-- Alta: siempre player y gratis, aunque los metadatos digan otra cosa.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nombre, email, acepta_privacidad_en, version_privacidad)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'nombre', ''), 120),
    coalesce(new.email, ''),
    case when new.raw_user_meta_data ->> 'acepta_privacidad' = 'true' then now() end,
    left(new.raw_user_meta_data ->> 'version_privacidad', 20)
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- role, plan y pro_hasta no se cambian desde la app (solo funciones de servidor o service_role).
create function public.proteger_perfil() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_setting('app.cambio_autorizado', true) = 'si' or current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  if new.role is distinct from old.role or new.plan is distinct from old.plan or new.pro_hasta is distinct from old.pro_hasta
     or new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'No puedes cambiar el rol ni el plan desde la app' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_proteger before update on public.profiles for each row execute function public.proteger_perfil();

create function public.admin_set_role(objetivo uuid, nuevo public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo un administrador con doble factor puede cambiar roles' using errcode = '42501'; end if;
  if nuevo = 'player' and (select count(*) from public.profiles where role = 'admin' and id <> objetivo) = 0 then
    raise exception 'Tiene que quedar al menos un administrador' using errcode = '42501';
  end if;
  perform set_config('app.cambio_autorizado', 'si', true);
  update public.profiles set role = nuevo where id = objetivo;
end $$;

-- Primer admin: solo SQL Editor o service_role (no se concede a authenticated).
create function public.promover_admin(correo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.cambio_autorizado', 'si', true);
  update public.profiles set role = 'admin' where lower(email) = lower(correo);
  if not found then raise exception 'No existe ninguna cuenta con ese correo'; end if;
end $$;

-- Plan: lo cambia solo el webhook de pagos (service_role).
create function public.fijar_plan(usuario uuid, nuevo public.plan, hasta timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.cambio_autorizado', 'si', true);
  update public.profiles set plan = nuevo, pro_hasta = hasta where id = usuario;
end $$;

-- ───────────── Equipos y miembros ─────────────

create table public.equipos (
  id uuid primary key,
  datos jsonb not null check (pg_column_size(datos) < 60000),
  version int not null default 1,
  campos_ts jsonb not null default '{}',
  marca bigint not null,
  creado_por uuid not null references public.profiles (id) on delete cascade,
  eliminado_en timestamptz,
  purgada boolean not null default false,
  nombre text generated always as (left(datos ->> 'nombre', 80)) stored,
  categoria text generated always as (datos ->> 'categoria') stored,
  modalidad text generated always as (datos ->> 'modalidad') stored,
  check (modalidad in ('F7', 'F8', 'F11'))
);

create table public.miembros (
  equipo_id uuid not null references public.equipos (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  rol text not null check (rol in ('entrenador_principal', 'ayudante', 'preparador_fisico', 'coordinador')),
  primary key (equipo_id, usuario_id)
);
create index miembros_usuario_idx on public.miembros (usuario_id);

create function public.es_miembro(eq uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.sesion_activa() and exists (select 1 from public.miembros m where m.equipo_id = eq and m.usuario_id = auth.uid())
$$;
create function public.es_principal(eq uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.sesion_activa() and exists (select 1 from public.miembros m where m.equipo_id = eq and m.usuario_id = auth.uid() and m.rol = 'entrenador_principal')
$$;

-- Quien crea el equipo queda como entrenador principal.
create function public.alta_principal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.miembros (equipo_id, usuario_id, rol) values (new.id, new.creado_por, 'entrenador_principal') on conflict do nothing;
  return new;
end $$;
create trigger equipos_alta_principal after insert on public.equipos for each row execute function public.alta_principal();

-- Añadir cuerpo técnico: solo el principal y solo en Pro (compartir con cuerpo técnico es Pro).
create function public.invitar_miembro(eq uuid, correo text, rol_nuevo text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if not public.es_principal(eq) then raise exception 'Solo el entrenador principal puede añadir al cuerpo técnico' using errcode = '42501'; end if;
  if not public.es_pro() then raise exception 'Compartir con el cuerpo técnico es una función Pro' using errcode = 'P0001'; end if;
  select id into uid from public.profiles where lower(email) = lower(correo);
  if uid is null then raise exception 'Esa persona aún no tiene cuenta en FutbolLab Sesiones' using errcode = 'P0001'; end if;
  insert into public.miembros values (eq, uid, rol_nuevo) on conflict (equipo_id, usuario_id) do update set rol = excluded.rol;
end $$;

create function public.quitar_miembro(eq uuid, usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_principal(eq) and usuario <> auth.uid() then raise exception 'Solo el entrenador principal puede quitar miembros' using errcode = '42501'; end if;
  if (select count(*) from public.miembros where equipo_id = eq and rol = 'entrenador_principal' and usuario_id <> usuario) = 0
     and exists (select 1 from public.miembros where equipo_id = eq and usuario_id = usuario and rol = 'entrenador_principal') then
    raise exception 'El equipo necesita un entrenador principal' using errcode = 'P0001';
  end if;
  delete from public.miembros where equipo_id = eq and usuario_id = usuario;
end $$;

-- Compañeros: solo nombre (nunca correo) de quien comparte equipo.
create function public.companeros(eq uuid) returns table (id uuid, nombre text, rol text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nombre, m.rol from public.miembros m join public.profiles p on p.id = m.usuario_id
  where m.equipo_id = eq and public.es_miembro(eq)
$$;

alter table public.profiles enable row level security;
alter table public.equipos enable row level security;
alter table public.miembros enable row level security;

create policy perfil_ver on public.profiles for select to authenticated using (id = (select auth.uid()) and public.sesion_activa() or public.is_admin());
create policy perfil_editar on public.profiles for update to authenticated using (id = (select auth.uid()) and public.sesion_activa()) with check (id = (select auth.uid()));
create policy miembro_ver on public.miembros for select to authenticated using (public.es_miembro(equipo_id) or public.is_admin());

-- Privilegios mínimos (los proyectos nuevos de Supabase no conceden nada por defecto).
revoke all on all tables in schema public from anon;
grant select, update (nombre) on public.profiles to authenticated;
grant select on public.miembros to authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.sesion_activa(), public.is_admin(), public.es_pro(), public.es_miembro(uuid), public.es_principal(uuid),
  public.admin_set_role(uuid, public.app_role), public.invitar_miembro(uuid, text, text), public.quitar_miembro(uuid, uuid), public.companeros(uuid) to authenticated;
grant execute on function public.promover_admin(text), public.fijar_plan(uuid, public.plan, timestamptz) to service_role;
