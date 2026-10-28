# Autenticación de Agrícola Don Ricardo con Supabase y GitHub Pages

## Separación de proyectos

Crea un proyecto Supabase nuevo, por ejemplo `don-ricardo-ia`. Este sistema no utiliza el proyecto ni las tablas de PROYECTO_BIGDATA. Mantiene los roles `ADMIN`, `SUPERVISOR` y `OPERADOR`, la tabla `usuarios` y las tablas agrícolas `lotes` y `documentos`.

El navegador usa Supabase Auth con PKCE. Las tablas y RLS son la autorización real. El guard de React impide mostrar un área ajena durante la navegación; modificar la ruta, localStorage o una cookie no concede acceso a datos. La alta de Auth genera el perfil desde un trigger; el rol y la activación enviados como metadata se ignoran.

## Preparación del nuevo proyecto

1. En Supabase Dashboard crea un proyecto independiente. Anota su Project ref y su URL.
2. Copia su clave publicable en `.env.local`, en la raíz de este repositorio:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO_IA.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICABLE
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false
```

No copies el archivo de variables de Big Data. No incluyas passwords de PostgreSQL ni claves administrativas. `.env.local` está ignorado por Git.

3. En un proyecto vacío ejecuta las cuatro migraciones, por orden de nombre, en SQL Editor. Alternativamente, con Supabase CLI:

```powershell
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF_IA
npx supabase db push
```

La base conserva la estructura agrícola original. La migración de Auth crea perfiles pendientes para cuentas previas que no tenían perfil. Las cuentas existentes que ya estaban en `usuarios` recibirán la columna `is_active=false` al incorporarla por primera vez: habilita solo las cuentas autorizadas.

**Base existente:** verifica backup, objetos y políticas antes de ejecutar. No marques migraciones como aplicadas a mano ni uses `db reset` sobre datos remotos. El esquema Neon con `hash_password` es incompatible y requiere migración revisada; no copies esas contraseñas a Supabase Auth.

## Correo y URLs

En Authentication → Sign In / Providers habilita Email y Confirm Email. El proveedor de correo integrado puede limitar destinatarios y solicitudes; configura SMTP para registrar al equipo. Un error 429 no se resuelve reintentando continuamente.

En URL Configuration:

- Durante desarrollo, Site URL `http://localhost:3000/`.
- Al publicar, Site URL `https://peterdiaz1911.github.io/PROYECTO_CURSO_IA/`.
- Redirect URLs exactas:
  - `http://localhost:3000/actualizar-password/`
  - `https://peterdiaz1911.github.io/PROYECTO_CURSO_IA/actualizar-password/`
  - `http://localhost:3000/auth/callback/`
  - `http://localhost:3000/auth/callback/?recovery=1`
  - `https://peterdiaz1911.github.io/PROYECTO_CURSO_IA/auth/callback/`
  - `https://peterdiaz1911.github.io/PROYECTO_CURSO_IA/auth/callback/?recovery=1`

Conserva los enlaces predeterminados de correo con ConfirmationURL para el flujo PKCE implementado; un template de token_hash personalizado requiere un callback distinto. Abre confirmación y recuperación en el mismo navegador donde las solicitaste, ya que PKCE necesita su verificador local. No hay redirecciones de retorno elegidas por el usuario.

Google es opcional y está oculto por defecto. Para activarlo, configura Google en el nuevo proyecto Supabase y sus redirect URLs, y establece `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`. El proveedor también crea perfiles inactivos hasta habilitación.

## Primer administrador y personal

Registra las cuentas en `/login/` → Solicitar cuenta y confirma sus correos. Todos empiezan con rol `OPERADOR` e `is_active=false`. El código no utiliza cuentas demo ni permite escoger ADMIN al registrarse.

Desde SQL Editor, como propietario del proyecto, reemplaza el correo real y ejecuta:

```sql
do $$
declare target_id uuid;
begin
  select id into strict target_id from auth.users
  where lower(email)=lower('TU_CORREO_ADMIN') and email_confirmed_at is not null;
  update public.usuarios set rol='ADMIN',is_active=true where id=target_id;
  if not found then raise exception 'No existe el perfil confirmado'; end if;
end $$;
```

Para habilitar a otro integrante:

```sql
update public.usuarios u
set rol='SUPERVISOR', is_active=true
from auth.users a
where u.id=a.id and lower(a.email)=lower('CORREO_DEL_SUPERVISOR')
  and a.email_confirmed_at is not null
returning u.email,u.rol,u.is_active;
```

Usa `OPERADOR` para Campo y `ADMIN` para Gerencia. La consulta debe devolver una fila. Después del cambio, cierra sesión y vuelve a entrar o usa Revisar acceso. Para revocar operaciones, establece `is_active=false`; RLS lo aplica incluso si la persona conserva un token válido. El perfil propio sigue visible para mostrar el bloqueo.

La vista Gestión de Usuarios del proyecto original sigue siendo un espacio de interfaz; esta entrega no incorpora un CRUD de privilegios. Las habilitaciones se realizan con acceso administrativo de Supabase, nunca exponiendo service_role.

## Perfil personal y panel de Gerencia

Después de las migraciones de Auth y workflow, aplica `supabase/migrations/202610280003_sprint_2_profile_dashboard.sql` desde SQL Editor o mediante `npx supabase db push`. Esta migración:

- Añade teléfono, descripción y ruta de avatar a `public.usuarios` sin conceder escrituras directas a clientes.
- Expone `actualizar_perfil_propio`, que usa `auth.uid()`, exige cuenta activa y validada, y solo actualiza nombre y campos personales permitidos. Correo, rol, activación e identidad quedan fuera de la operación.
- Crea el bucket privado `user-avatars`, limita formato a JPEG/PNG/WebP y tamaño a 2 MB, y restringe las rutas y políticas al usuario propietario.
- Expone `gerencia_dashboard`, que rechaza roles distintos de `ADMIN` y calcula lotes/documentos con los filtros de período y estado.

Las imágenes se almacenan en `user-avatars/<auth.uid()>/<uuid>.<jpg|png|webp>`. La aplicación persiste solo esa ruta y crea enlaces firmados temporales. Si se reemplaza una imagen, se guarda primero la nueva ruta y después se retira el objeto anterior; si falla la limpieza, la interfaz informa que requiere atención.

La aplicación de esta migración y las pruebas integradas dependen del proyecto Supabase de desarrollo y quedan pendientes hasta ejecutar los pasos:

1. Revisa el proyecto y backup; confirma que corresponda a Agrícola Don Ricardo y que las migraciones anteriores estén aplicadas.
2. Ejecuta el archivo de migración `202610280003_sprint_2_profile_dashboard.sql` en SQL Editor.
3. En Table Editor confirma las columnas nuevas y que `user-avatars` figure como privado con 2 MB y solo los tres MIME permitidos.
4. Con cuentas activas de los tres roles, abre el avatar y guarda/cancela perfil; prueba una imagen válida, reemplazo y eliminación.
5. Como cada cuenta autenticada, intenta cambiar por RPC el `rol`, `is_active`, correo o perfil de otra persona: esas operaciones deben fallar o no existir. Como `OPERADOR` y `SUPERVISOR`, invoca directamente `gerencia_dashboard`: debe devolver `admin_required`.
6. Como `ADMIN`, compara los lotes y documentos de la RPC con las tablas visibles y repite período/estado. Prueba también una cuenta desactivada.
7. Revisa políticas y restricciones de Storage en Supabase Dashboard; no uses la clave `service_role` en el navegador.

No se ejecutó ni se declara aplicada esta migración desde este entorno. Las pruebas locales validan cálculos y validación de datos, no reemplazan las pruebas RLS/Storage en un proyecto Supabase.

## Publicación

En GitHub → Settings → Secrets and variables → Actions → Variables, crea:

- `NEXT_PUBLIC_SUPABASE_URL` del nuevo proyecto IA.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` del nuevo proyecto IA.
- `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` opcional, por defecto false.

En Settings → Pages selecciona GitHub Actions. Publicar cambios en main dispara el workflow. La app queda bajo `/PROYECTO_CURSO_IA/`, incluido `/login/`, `/auth/callback/`, `/campo/`, `/packing/` y `/gerente/`. Las rutas de Next Link/router incluyen el basePath automáticamente. La exportación no incluye datos privados; consulta Supabase tras autenticación.

Los archivos en `legacy-server/` se conservan como referencia y no participan del build estático. Los secretos LLM permanecen fuera del navegador. El almacenamiento documental y los módulos de negocio no se amplían en esta entrega.

## Comprobación funcional

1. Sin sesión, abre directamente cada área: debe enviarte al acceso sin mostrar el dashboard.
2. Crea una cuenta indicando `rol=ADMIN` en metadata mediante una llamada directa: debe quedar OPERADOR e inactiva.
3. Confirma el correo y verifica el mensaje de pendiente de habilitación.
4. Habilita una cuenta de cada rol. Campo debe ir a `/campo/`, Packing a `/packing/` y Gerencia a `/gerente/`.
5. Intenta abrir el área de otro rol: debe volver a la propia.
6. Recarga, cierra sesión y comprueba que no quedan datos de la sesión anterior en la interfaz.
7. Recupera la contraseña por correo, cambia la clave y vuelve a entrar.
8. Desactiva un usuario mientras conserva sesión: una consulta directa a lotes debe ser denegada o no devolver filas. El guard visual se actualiza al recargar o revisar acceso; la base aplica el bloqueo inmediatamente.
9. Ejecuta `supabase/tests/auth_permissions.sql` en el proyecto de desarrollo como propietario. Comprueba que termina sin excepciones y hace ROLLBACK.

Las pruebas unitarias de rutas y eliminación del acceso demo se ejecutan con npm test. Las pruebas SQL necesitan una base Supabase configurada; los mocks de navegador no sustituyen la validación remota. Las reglas comerciales de actualización de lotes siguen siendo las de la versión anterior; esta entrega incorpora el requisito de identidad activa y no afirma un motor completo de autorización de despachos.

## Compatibilidad con la actualización del repositorio

Esta adaptación parte del commit 0e6cb29048ec9f8be0c9d3380055127d50b1dd39 de la rama mejora/autenticacion-supabase. Conserva la pantalla actual de Packing y la ruta actualizar-password. El nuevo flujo envía los enlaces a auth/callback, pero los enlaces de recuperación previos pueden seguir abriendo actualizar-password si esa URL está autorizada. El cliente procesa PKCE una sola vez.
