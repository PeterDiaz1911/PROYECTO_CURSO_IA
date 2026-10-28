-- Apply after database/supabase-schema.sql and the auth migration.
-- These policies preserve Campo/Packing/Gerencia and require active, confirmed accounts.
begin;
drop policy if exists "authenticated users can read workflow" on public.lotes;
drop policy if exists "operators create field lots" on public.lotes;
drop policy if exists "packing and admin update lots" on public.lotes;
drop policy if exists "authenticated users manage documents" on public.documentos;

create policy lotes_read_active on public.lotes for select to authenticated using (
  (select public.don_ricardo_role()) in ('SUPERVISOR','ADMIN')
  or ((select public.don_ricardo_role())='OPERADOR' and creado_por=(select auth.uid()))
);
create policy lotes_insert_operator on public.lotes for insert to authenticated with check (
  (select public.don_ricardo_role())='OPERADOR' and creado_por=(select auth.uid()) and estado='EN_CAMPO'
);
create policy lotes_update_packing_management on public.lotes for update to authenticated
using ((select public.don_ricardo_role()) in ('SUPERVISOR','ADMIN'))
with check ((select public.don_ricardo_role()) in ('SUPERVISOR','ADMIN'));
create policy documentos_read_visible on public.documentos for select to authenticated using (
  exists(select 1 from public.lotes l where l.id=lote_id)
);
create policy documentos_insert_active on public.documentos for insert to authenticated with check (
  (select public.don_ricardo_role()) in ('OPERADOR','SUPERVISOR','ADMIN')
  and exists(select 1 from public.lotes l where l.id=lote_id)
);
create policy documentos_delete_active on public.documentos for delete to authenticated using (
  (select public.don_ricardo_role()) in ('OPERADOR','SUPERVISOR','ADMIN')
  and exists(select 1 from public.lotes l where l.id=lote_id)
);
revoke all on public.lotes,public.documentos from public,anon,authenticated;
grant select,insert,update on public.lotes to authenticated;
grant select,insert,delete on public.documentos to authenticated;
commit;
