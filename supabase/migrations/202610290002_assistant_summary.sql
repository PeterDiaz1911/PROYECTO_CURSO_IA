-- Read-only assistant context. SECURITY INVOKER preserves the caller's lot RLS.
begin;
create or replace function public.resumen_asistente_ia()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_role text := public.don_ricardo_role();
  today date := (now() at time zone 'America/Lima')::date;
  result jsonb;
begin
  if actor_role is null or actor_role not in ('ADMIN','SUPERVISOR','OPERADOR') then
    raise exception 'Cuenta no habilitada' using errcode = '42501';
  end if;
  with visible as materialized (
    select estado::text as estado, cultivo, fundo,
      (created_at at time zone 'America/Lima')::date as fecha,
      coalesce(fundo like 'DEMO%', false) as demo
    from public.lotes
  ), states as (
    select estado, count(*) as cantidad from visible group by estado
  ), crops as (
    select cultivo, count(*) as cantidad from visible group by cultivo
    order by cantidad desc, cultivo limit 20
  ), farms as (
    select fundo, count(*) as cantidad from visible group by fundo
    order by cantidad desc, fundo limit 20
  ), daily as (
    select d::date as fecha, count(v.fecha) as cantidad
    from generate_series(today - 29, today, interval '1 day') d
    left join visible v on v.fecha = d::date
    group by d order by d
  )
  select jsonb_build_object(
    'consultado_en', now(), 'zona_horaria', 'America/Lima',
    'rol', actor_role,
    'alcance', case when actor_role='OPERADOR' then 'Solo mis lotes autorizados' else 'Lotes visibles según permisos de mi cuenta' end,
    'total_lotes', (select count(*) from visible),
    'documentos_visibles', (select count(*) from public.documentos),
    'usuarios', case when actor_role='ADMIN' then (
      select jsonb_build_object('total',count(*),'habilitados',count(*) filter(where is_active)) from public.usuarios
    ) else null end,
    'lotes_demo', (select count(*) from visible where demo),
    'lotes_no_marcados_demo', (select count(*) from visible where not demo),
    'registros_hoy', (select count(*) from visible where fecha=today),
    'registros_ultimos_7_dias', (select count(*) from visible where fecha between today-6 and today),
    'registros_7_dias_anteriores', (select count(*) from visible where fecha between today-13 and today-7),
    'registros_ultimos_30_dias', (select count(*) from visible where fecha between today-29 and today),
    'registros_mes_actual', (select count(*) from visible where fecha between date_trunc('month',today)::date and today),
    'por_estado', '{"EN_CAMPO":0,"EN_PACKING":0,"PENDIENTE_FIRMA":0,"APROBADO":0,"RECHAZADO":0}'::jsonb || coalesce((select jsonb_object_agg(estado,cantidad) from states),'{}'::jsonb),
    'por_cultivo_top_20', coalesce((select jsonb_agg(to_jsonb(crops)) from crops),'[]'::jsonb),
    'por_fundo_top_20', coalesce((select jsonb_agg(to_jsonb(farms)) from farms),'[]'::jsonb),
    'registros_diarios_30_dias', coalesce((select jsonb_agg(to_jsonb(daily)) from daily),'[]'::jsonb),
    'nota', 'Fechas basadas en creación del lote, no en recepción, aprobación o despacho. Los rankings se limitan a 20 grupos. DEMO se identifica por el prefijo del fundo.'
  ) into result;
  return result;
end;
$$;
revoke all on function public.resumen_asistente_ia() from public, anon;
grant execute on function public.resumen_asistente_ia() to authenticated;
comment on function public.resumen_asistente_ia() is 'Resumen agregado bajo RLS del usuario; no expone perfiles ni permite escritura.';
commit;
