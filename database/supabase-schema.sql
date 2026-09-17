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
  dias_carencia integer not null default 0 check (dias_carencia >= 0),
  estado public.lote_estado not null default 'EN_CAMPO',
  destino text,
  creado_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- El operador crea lotes EN_CAMPO; packing los mueve a EN_PACKING/PENDIENTE_FIRMA;
-- gerencia únicamente cierra el ciclo con APROBADO o RECHAZADO.
create policy "authenticated users can read workflow" on public.lotes for select to authenticated using (true);
create policy "users can read own profile" on public.usuarios for select to authenticated using (id = auth.uid());
create policy "operators create field lots" on public.lotes for insert to authenticated with check (
  exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'OPERADOR')
);
create policy "packing and admin update lots" on public.lotes for update to authenticated using (
  exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('SUPERVISOR', 'ADMIN'))
);
create policy "authenticated users manage documents" on public.documentos for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.lotes;
