-- Development project only, run as database owner after both migrations and the base schema.
-- Fixtures never persist: this file ends with ROLLBACK.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('a0000000-0000-0000-0000-000000000001','admin-auth-test@example.invalid',now(),'{"nombre":"Admin prueba","rol":"ADMIN","is_active":true}'),
('a0000000-0000-0000-0000-000000000002','operator-auth-test@example.invalid',now(),'{"nombre":"Campo prueba"}'),
('a0000000-0000-0000-0000-000000000003','supervisor-auth-test@example.invalid',now(),'{"nombre":"Packing prueba"}'),
('a0000000-0000-0000-0000-000000000004','inactive-auth-test@example.invalid',now(),'{"nombre":"Inactivo prueba"}');
do $$ begin
 if exists(select 1 from public.usuarios where id='a0000000-0000-0000-0000-000000000001' and (rol<>'OPERADOR' or is_active)) then
   raise exception 'FALLO: metadata permitió escalamiento';
 end if;
end $$;
update public.usuarios set rol='ADMIN',is_active=true where id='a0000000-0000-0000-0000-000000000001';
update public.usuarios set is_active=true where id='a0000000-0000-0000-0000-000000000002';
update public.usuarios set rol='SUPERVISOR',is_active=true where id='a0000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000002',true);
do $$ begin
 if public.don_ricardo_role()<>'OPERADOR' then raise exception 'FALLO: rol operador'; end if;
 if (select count(*) from public.usuarios)<>1 then raise exception 'FALLO: perfil ajeno visible'; end if;
 begin
   update public.usuarios set rol='ADMIN' where id=auth.uid();
   raise exception 'FALLO: escalamiento de rol permitido';
 exception when insufficient_privilege then null;
 end;
end $$;
insert into public.lotes(fundo,cultivo,agroquimico,ppm,dias_carencia,creado_por)
values('Fundo de prueba','Cultivo de prueba','Producto de prueba',0,1,auth.uid());
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000004',true);
do $$ begin
 if public.don_ricardo_role() is not null then raise exception 'FALLO: usuario inactivo tiene rol operativo'; end if;
 if exists(select 1 from public.lotes) then raise exception 'FALLO: usuario inactivo lee lotes'; end if;
 begin
   insert into public.lotes(fundo,cultivo,agroquimico,ppm,dias_carencia,creado_por)
   values('Prueba inactiva','Cultivo','Producto',0,1,auth.uid());
   raise exception 'FALLO: usuario inactivo crea lote';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000003',true);
do $$ begin
 if public.don_ricardo_role()<>'SUPERVISOR' then raise exception 'FALLO: supervisor'; end if;
 if not exists(select 1 from public.lotes where fundo='Fundo de prueba') then raise exception 'FALLO: packing no recibe lote'; end if;
 begin
   insert into public.lotes(fundo,cultivo,agroquimico,ppm,dias_carencia,creado_por)
   values('Prueba packing','Cultivo','Producto',0,1,auth.uid());
   raise exception 'FALLO: supervisor crea como operador';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
   perform * from public.usuarios;
   raise exception 'FALLO: anónimo lee usuarios';
 exception when insufficient_privilege then null;
 end;
 begin
   perform * from public.lotes;
   raise exception 'FALLO: anónimo lee lotes';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
