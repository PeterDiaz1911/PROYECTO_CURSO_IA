begin;

alter table public.usuarios
  add column if not exists telefono text,
  add column if not exists descripcion text,
  add column if not exists avatar_path text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'usuarios_telefono_format_check'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_telefono_format_check
      check (
        telefono is null
        or (
          char_length(telefono) between 7 and 25
          and telefono ~ '^[+0-9() -]+$'
          and char_length(regexp_replace(telefono, '[^0-9]', '', 'g')) between 7 and 15
        )
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'usuarios_descripcion_length_check'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_descripcion_length_check
      check (descripcion is null or char_length(descripcion) <= 280);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'usuarios_avatar_path_check'
      and conrelid = 'public.usuarios'::regclass
  ) then
    alter table public.usuarios
      add constraint usuarios_avatar_path_check
      check (
        avatar_path is null
        or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
      );
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists user_avatars_read_own on storage.objects;
create policy user_avatars_read_own on storage.objects
for select to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (select public.don_ricardo_role()) is not null
);

drop policy if exists user_avatars_insert_own on storage.objects;
create policy user_avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] is null
  and (select public.don_ricardo_role()) is not null
  and metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
  and (metadata->>'size')::bigint <= 2097152
);

drop policy if exists user_avatars_update_own on storage.objects;
create policy user_avatars_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (select public.don_ricardo_role()) is not null
)
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (select public.don_ricardo_role()) is not null
  and metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
  and (metadata->>'size')::bigint <= 2097152
);

drop policy if exists user_avatars_delete_own on storage.objects;
create policy user_avatars_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (select public.don_ricardo_role()) is not null
);

create or replace function public.actualizar_perfil_propio(
  p_nombre text,
  p_telefono text,
  p_descripcion text,
  p_avatar_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_nombre text := nullif(btrim(p_nombre), '');
  v_telefono text := nullif(btrim(p_telefono), '');
  v_descripcion text := nullif(btrim(p_descripcion), '');
begin
  if v_uid is null or public.don_ricardo_role() is null then
    raise exception 'account_not_active' using errcode = '42501';
  end if;
  if v_nombre is null or char_length(v_nombre) > 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_telefono is not null and (
    char_length(v_telefono) not between 7 and 25
    or v_telefono !~ '^[+0-9() -]+$'
    or char_length(regexp_replace(v_telefono, '[^0-9]', '', 'g')) not between 7 and 15
  ) then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if v_descripcion is not null and char_length(v_descripcion) > 280 then
    raise exception 'invalid_description' using errcode = '22023';
  end if;
  if p_avatar_path is not null and (
    p_avatar_path !~ ('^' || v_uid::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'user-avatars'
        and o.name = p_avatar_path
        and o.owner_id = v_uid::text
        and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
        and (o.metadata->>'size')::bigint <= 2097152
    )
  ) then
    raise exception 'invalid_avatar' using errcode = '22023';
  end if;

  update public.usuarios
  set nombre = v_nombre,
      telefono = v_telefono,
      descripcion = v_descripcion,
      avatar_path = p_avatar_path
  where id = v_uid and is_active;
  if not found then
    raise exception 'account_not_active' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.gerencia_dashboard(
  p_desde date default null,
  p_estado text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.don_ricardo_role() is distinct from 'ADMIN' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_estado is not null and p_estado not in (
    'EN_CAMPO', 'EN_PACKING', 'PENDIENTE_FIRMA', 'APROBADO', 'RECHAZADO'
  ) then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  return (
    with filtrados as (
      select l.id, l.fundo, l.cultivo, l.agroquimico, l.estado::text as estado,
             l.fecha_cosecha, l.created_at
      from public.lotes l
      where (p_desde is null or l.created_at >= p_desde::timestamptz)
        and l.created_at <= now()
        and (p_estado is null or l.estado::text = p_estado)
    )
    select jsonb_build_object(
      'lotes',
      coalesce(
        (select jsonb_agg(to_jsonb(f) order by f.created_at desc) from filtrados f),
        '[]'::jsonb
      ),
      'documentos',
      (select count(*) from public.documentos d
       where exists (select 1 from filtrados f where f.id = d.lote_id))
    )
  );
end;
$$;

revoke all on function public.actualizar_perfil_propio(text, text, text, text) from public, anon;
revoke all on function public.gerencia_dashboard(date, text) from public, anon;
grant execute on function public.actualizar_perfil_propio(text, text, text, text) to authenticated;
grant execute on function public.gerencia_dashboard(date, text) to authenticated;

commit;
