-- Base agrícola existente adaptada a migraciones de Supabase.
-- Nuevo proyecto independiente de IA; conserva tablas y estados agrícolas.
begin;
-- Supabase schema for the three-role agroexport workflow.
create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('OPERADOR', 'SUPERVISOR', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lote_estado as enum ('EN_CAMPO', 'EN_PACKING', 'PENDIENTE_FIRMA', 'APROBADO', 'RECHAZADO');
exception when duplicate_object then null; end $$;

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  rol public.user_role not null default 'OPERADOR',
  nombre text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  fundo text not null,
  cultivo text not null,
  agroquimico text not null,
  ppm numeric(10, 3) not null check (ppm >= 0),
  dias_transcurridos integer not null default 0 check (dias_transcurridos >= 0),
  dias_carencia integer not null default 0 check (dias_carencia >= 0),
  fecha_cosecha date not null default current_date,
  estado public.lote_estado not null default 'EN_CAMPO',
  destino text,
  creado_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lotes
  add column if not exists dias_transcurridos integer not null default 0 check (dias_transcurridos >= 0),
  add column if not exists fecha_cosecha date not null default current_date;

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('GUIA_REMISION', 'CERTIFICADO_EMPAQUE', 'CERTIFICADO_FITOSANITARIO')),
  url_archivo text not null,
  created_at timestamptz not null default now()
);

alter table public.usuarios enable row level security;
alter table public.lotes enable row level security;
alter table public.documentos enable row level security;


-- No client mutation is granted by the base schema. Apply both following migrations.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lotes') then
    alter publication supabase_realtime add table public.lotes;
  end if;
end $$;

commit;
