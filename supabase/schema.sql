-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  EduCore — Esquema de base de datos (Supabase / Postgres)             ║
-- ║  Ejecuta este archivo completo en: Supabase → SQL Editor → New query  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Tabla de perfiles: 1 fila por usuario de auth.users
create table if not exists public.profiles (
  id     uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email  text,
  rol    text not null default 'alumno'  check (rol    in ('superadmin','admin','profesor','alumno')),
  estado text not null default 'activo'  check (estado in ('activo','pendiente','suspendido')),
  curso  text default '—',
  fecha  date not null default current_date
);

alter table public.profiles enable row level security;

-- Lectura: cualquier usuario autenticado puede ver los perfiles
-- (necesario para la pantalla de usuarios y los dashboards).
drop policy if exists "perfiles_legibles_autenticados" on public.profiles;
create policy "perfiles_legibles_autenticados"
  on public.profiles for select
  to authenticated
  using (true);

-- NO se crean políticas de insert/update/delete a propósito:
-- la escritura sólo ocurre desde la Edge Function "admin-users"
-- (usa la service_role key, que omite RLS). Así el frontend nunca
-- puede crear/borrar usuarios directamente.
