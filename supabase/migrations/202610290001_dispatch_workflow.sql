begin;

create sequence if not exists public.despacho_codigo_seq start with 6009;

create table if not exists public.despachos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('DSP-' || nextval('public.despacho_codigo_seq'::regclass)::text),
  lote_id uuid not null references public.lotes(id),
  destino text not null check (destino in ('USA', 'UE', 'China')),
  cajas integer not null check (cajas between 1 and 1000000),
  estado text not null default 'PENDIENTE_FIRMA' check (estado in ('PENDIENTE_FIRMA', 'APROBADO', 'RECHAZADO')),
  creado_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  revisado_por uuid references public.usuarios(id),
  revisado_at timestamptz,
  motivo_revision text check (motivo_revision is null or char_length(motivo_revision) <= 500)
);

create unique index if not exists despachos_un_pendiente_por_lote_idx
  on public.despachos(lote_id)
  where estado = 'PENDIENTE_FIRMA';
create index if not exists despachos_created_at_idx on public.despachos(created_at desc);

create table if not exists public.despacho_documentos (
  id uuid primary key default gen_random_uuid(),
  despacho_id uuid not null unique references public.despachos(id) on delete cascade,
  storage_path text not null unique,
  nombre_archivo text not null check (char_length(nombre_archivo) between 1 and 180),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  subido_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now()
);

alter table public.despachos enable row level security;
alter table public.despacho_documentos enable row level security;

drop policy if exists despachos_read_workflow on public.despachos;
create policy despachos_read_workflow on public.despachos
for select to authenticated
using ((select public.don_ricardo_role()) in ('SUPERVISOR', 'ADMIN'));

drop policy if exists despacho_documentos_read_workflow on public.despacho_documentos;
create policy despacho_documentos_read_workflow on public.despacho_documentos
for select to authenticated
using (
  (select public.don_ricardo_role()) in ('SUPERVISOR', 'ADMIN')
  and exists (select 1 from public.despachos d where d.id = despacho_id)
);

revoke all on public.despachos, public.despacho_documentos from public, anon, authenticated;
grant select on public.despachos, public.despacho_documentos to authenticated;
revoke all on sequence public.despacho_codigo_seq from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'despacho-documentos',
  'despacho-documentos',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists despacho_files_insert_supervisor on storage.objects;
create policy despacho_files_insert_supervisor on storage.objects
for insert to authenticated
with check (
  bucket_id = 'despacho-documentos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and (select public.don_ricardo_role()) = 'SUPERVISOR'
);

drop policy if exists despacho_files_read_workflow on storage.objects;
create policy despacho_files_read_workflow on storage.objects
for select to authenticated
using (
  bucket_id = 'despacho-documentos'
  and (select public.don_ricardo_role()) in ('SUPERVISOR', 'ADMIN')
);

drop policy if exists despacho_files_delete_own on storage.objects;
create policy despacho_files_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'despacho-documentos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (select public.don_ricardo_role()) = 'SUPERVISOR'
);

create or replace function public.crear_despacho(
  p_lote_id uuid,
  p_destino text,
  p_cajas integer,
  p_storage_path text,
  p_nombre_archivo text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.despachos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_lote public.lotes%rowtype;
  v_despacho public.despachos%rowtype;
  v_ppm_limit numeric;
begin
  if v_uid is null or (select public.don_ricardo_role()) is distinct from 'SUPERVISOR' then
    raise exception 'supervisor_required' using errcode = '42501';
  end if;
  if p_destino not in ('USA', 'UE', 'China') then
    raise exception 'invalid_destination' using errcode = '22023';
  end if;
  if p_cajas is null or p_cajas not between 1 and 1000000 then
    raise exception 'invalid_box_count' using errcode = '22023';
  end if;
  if p_nombre_archivo is null or char_length(btrim(p_nombre_archivo)) not between 1 and 180
     or p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
     or p_size_bytes is null or p_size_bytes not between 1 and 10485760 then
    raise exception 'invalid_dispatch_document' using errcode = '22023';
  end if;
  if p_storage_path is null or p_storage_path !~ ('^' || v_uid::text || '/[0-9a-f-]{36}/[^/]{1,180}$') then
    raise exception 'invalid_dispatch_document_path' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'despacho-documentos'
      and o.name = p_storage_path
      and o.owner_id = v_uid::text
      and o.metadata->>'mimetype' = p_mime_type
      and (o.metadata->>'size')::bigint = p_size_bytes
  ) then
    raise exception 'dispatch_document_upload_required' using errcode = '23514';
  end if;

  select * into v_lote
  from public.lotes
  where id = p_lote_id
  for update;
  if v_lote.id is null then
    raise exception 'lot_not_found' using errcode = '02000';
  end if;
  if v_lote.estado::text <> 'EN_PACKING' then
    raise exception 'lot_not_received_by_packing' using errcode = '23514';
  end if;
  v_ppm_limit := 0.5;
  if p_destino = 'UE' then
    v_ppm_limit := 0.3;
  end if;
  if v_lote.dias_transcurridos < v_lote.dias_carencia
     or v_lote.ppm > v_ppm_limit then
    raise exception 'lot_fails_destination_requirements' using errcode = '23514';
  end if;

  insert into public.despachos (lote_id, destino, cajas, creado_por)
  values (p_lote_id, p_destino, p_cajas, v_uid)
  returning * into v_despacho;

  insert into public.despacho_documentos (
    despacho_id, storage_path, nombre_archivo, mime_type, size_bytes, subido_por
  ) values (
    v_despacho.id, p_storage_path, btrim(p_nombre_archivo), p_mime_type, p_size_bytes, v_uid
  );

  update public.lotes set estado = 'PENDIENTE_FIRMA' where id = p_lote_id;
  return v_despacho;
end;
$$;

create or replace function public.resolver_despacho(
  p_despacho_id uuid,
  p_aprobar boolean,
  p_motivo text default null
)
returns public.despachos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_despacho public.despachos%rowtype;
  v_lote public.lotes%rowtype;
  v_motivo text := nullif(btrim(p_motivo), '');
  v_ppm_limit numeric;
begin
  if v_uid is null or (select public.don_ricardo_role()) is distinct from 'ADMIN' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_aprobar is null then
    raise exception 'decision_required' using errcode = '22023';
  end if;
  if not p_aprobar and (v_motivo is null or char_length(v_motivo) < 5 or char_length(v_motivo) > 500) then
    raise exception 'rejection_reason_required' using errcode = '22023';
  end if;

  select * into v_despacho
  from public.despachos
  where id = p_despacho_id
  for update;
  if v_despacho.id is null then
    raise exception 'dispatch_not_found' using errcode = '02000';
  end if;
  if v_despacho.estado <> 'PENDIENTE_FIRMA' then
    raise exception 'dispatch_already_reviewed' using errcode = '23514';
  end if;
  if not exists (select 1 from public.despacho_documentos d where d.despacho_id = v_despacho.id) then
    raise exception 'dispatch_document_required' using errcode = '23514';
  end if;

  select * into v_lote from public.lotes where id = v_despacho.lote_id for update;
  v_ppm_limit := 0.5;
  if v_despacho.destino = 'UE' then
    v_ppm_limit := 0.3;
  end if;
  if p_aprobar and (
    v_lote.dias_transcurridos < v_lote.dias_carencia
    or v_lote.ppm > v_ppm_limit
  ) then
    raise exception 'lot_fails_destination_requirements' using errcode = '23514';
  end if;

  update public.despachos
  set estado = case when p_aprobar then 'APROBADO' else 'RECHAZADO' end,
      revisado_por = v_uid,
      revisado_at = now(),
      motivo_revision = v_motivo
  where id = v_despacho.id
  returning * into v_despacho;

  if p_aprobar then
    update public.lotes set estado = 'APROBADO' where id = v_lote.id;
  else
    update public.lotes set estado = 'EN_PACKING' where id = v_lote.id;
  end if;
  return v_despacho;
end;
$$;

revoke all on function public.crear_despacho(uuid, text, integer, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.resolver_despacho(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.crear_despacho(uuid, text, integer, text, text, text, bigint) to authenticated;
grant execute on function public.resolver_despacho(uuid, boolean, text) to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'despachos'
     ) then
    alter publication supabase_realtime add table public.despachos;
  end if;
end $$;

commit;