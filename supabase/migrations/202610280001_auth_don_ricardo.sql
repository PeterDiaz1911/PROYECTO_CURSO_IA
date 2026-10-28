-- Apply ONLY to the independent Supabase project for Agrícola Don Ricardo.
-- Existing business tables and data are not deleted or copied from Big Data.
begin;
create extension if not exists pgcrypto;
do $$ begin
  create type public.user_role as enum ('OPERADOR', 'SUPERVISOR', 'ADMIN');
exception when duplicate_object then null; end $$;

-- Stop instead of attempting to overwrite the incompatible historical Neon schema.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='usuarios' and column_name='hash_password') then
    raise exception 'Esquema Neon detectado. Use un proyecto Supabase independiente o prepare una migración revisada; no mezcle credenciales.';
  end if;
end $$;
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  rol public.user_role not null default 'OPERADOR',
  nombre text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.usuarios add column if not exists is_active boolean not null default false;
create unique index if not exists usuarios_email_lower_idx on public.usuarios(lower(email));

create or replace function public.handle_don_ricardo_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null then raise exception 'email_required'; end if;
  insert into public.usuarios(id, email, nombre, rol, is_active)
  values(new.id, lower(new.email), left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'),''), nullif(trim(new.raw_user_meta_data->>'full_name'),''), split_part(new.email,'@',1)),120), 'OPERADOR', false);
  return new;
end $$;
drop trigger if exists on_don_ricardo_user_created on auth.users;
create trigger on_don_ricardo_user_created after insert on auth.users
for each row execute function public.handle_don_ricardo_signup();

-- Accounts created before the trigger get a pending profile, never an elevated role.
insert into public.usuarios(id,email,nombre,rol,is_active)
select id,lower(email),left(coalesce(nullif(trim(raw_user_meta_data->>'nombre'),''),nullif(trim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1)),120),'OPERADOR',false
from auth.users where email is not null
on conflict(id) do nothing;

create or replace function public.sync_don_ricardo_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.usuarios set email=lower(new.email) where id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_don_ricardo_email_changed on auth.users;
create trigger on_don_ricardo_email_changed after update of email on auth.users
for each row execute function public.sync_don_ricardo_email();

create or replace function public.don_ricardo_role()
returns text language sql stable security definer set search_path = '' as $$
  select u.rol::text from public.usuarios u join auth.users a on a.id=u.id
  where u.id=(select auth.uid()) and u.is_active and a.email_confirmed_at is not null
$$;

alter table public.usuarios enable row level security;
-- Replace only this project's documented profile policies. No self-service role updates.
drop policy if exists "users can read own profile" on public.usuarios;
drop policy if exists usuarios_read_authorized on public.usuarios;
create policy usuarios_read_authorized on public.usuarios for select to authenticated
using(id=(select auth.uid()) or (select public.don_ricardo_role())='ADMIN');
revoke all on public.usuarios from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.usuarios to authenticated;
revoke all on function public.handle_don_ricardo_signup() from public,anon,authenticated;
revoke all on function public.sync_don_ricardo_email() from public,anon,authenticated;
revoke all on function public.don_ricardo_role() from public,anon,authenticated;
grant execute on function public.don_ricardo_role() to authenticated;
commit;
