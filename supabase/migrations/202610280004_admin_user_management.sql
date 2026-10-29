begin;

create or replace function public.admin_set_usuario_rol(
  p_user_id uuid,
  p_rol text
)
returns public.usuarios
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_target public.usuarios%rowtype;
  v_admin_count integer;
begin
  if v_admin_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if (select public.don_ricardo_role()) is distinct from 'ADMIN' then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_rol not in ('OPERADOR', 'SUPERVISOR', 'ADMIN') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  select *
    into v_target
    from public.usuarios
    where id = p_user_id
    for update;

  if v_target.id is null then
    raise exception 'user_not_found' using errcode = '02000';
  end if;

  if p_user_id = v_admin_id and p_rol <> 'ADMIN' then
    raise exception 'cannot_change_own_admin_role' using errcode = '23514';
  end if;

  select count(*)
    into v_admin_count
    from public.usuarios
    where rol = 'ADMIN'::public.user_role
      and is_active
      and id <> p_user_id;

  if v_target.rol = 'ADMIN'::public.user_role and p_rol <> 'ADMIN' and v_admin_count = 0 then
    raise exception 'last_admin_required' using errcode = '23514';
  end if;

  update public.usuarios
  set rol = p_rol::public.user_role
  where id = p_user_id
  returning * into v_target;

  return v_target;
end;
$$;

create or replace function public.admin_set_usuario_estado(
  p_user_id uuid,
  p_is_active boolean
)
returns public.usuarios
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_target public.usuarios%rowtype;
  v_admin_count integer;
begin
  if v_admin_id is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  if (select public.don_ricardo_role()) is distinct from 'ADMIN' then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select *
    into v_target
    from public.usuarios
    where id = p_user_id
    for update;

  if v_target.id is null then
    raise exception 'user_not_found' using errcode = '02000';
  end if;

  if p_user_id = v_admin_id and not p_is_active then
    raise exception 'cannot_disable_self' using errcode = '23514';
  end if;

  if v_target.rol = 'ADMIN'::public.user_role and not p_is_active then
    select count(*)
      into v_admin_count
      from public.usuarios
      where rol = 'ADMIN'::public.user_role
        and is_active
        and id <> p_user_id;

    if v_admin_count = 0 then
      raise exception 'last_admin_required' using errcode = '23514';
    end if;
  end if;

  update public.usuarios
  set is_active = p_is_active
  where id = p_user_id
  returning * into v_target;

  return v_target;
end;
$$;

revoke all on function public.admin_set_usuario_rol(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_set_usuario_estado(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_usuario_rol(uuid, text) to authenticated;
grant execute on function public.admin_set_usuario_estado(uuid, boolean) to authenticated;

commit;
