# Agrícola Don Ricardo — Proyecto del curso de IA

Aplicación de trazabilidad agroexportadora con tres áreas existentes: Campo (`OPERADOR`), Packing (`SUPERVISOR`) y Gerencia (`ADMIN`). Se conserva el tema agrícola y sus vistas. La autenticación usa **un proyecto Supabase independiente de PROYECTO_BIGDATA**.

## Qué incorpora esta entrega

- Acceso real por correo y contraseña, solicitud de cuenta, confirmación, recuperación y cambio de contraseña.
- Sesión restaurada al recargar y cierre de sesión real.
- Perfil en `public.usuarios`, rol obtenido de la base y bloqueo de cuentas no habilitadas.
- Alta pública siempre como `OPERADOR` **inactivo**; Gerencia habilita y asigna roles mediante el procedimiento administrativo documentado.
- RLS para perfiles y tablas agrícolas existentes; los permisos no dependen de cookies editables.
- Exportación estática y workflow para GitHub Pages bajo `/PROYECTO_CURSO_IA/`.

Esta entrega **no completa ni reemplaza las funcionalidades agrícolas existentes**. Las respuestas de los asistentes son locales y no hay un proveedor de IA conectado; las vistas de autorización y auditoría con datos de ejemplo no persisten ni autorizan operaciones reales. Autenticar la interfaz no convierte flujos locales en persistentes. No se copian cuentas ni datos de SERPOST.

## Inicio local

Node.js 22.18 o superior y npm:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

En `.env.local`, completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` del **nuevo** proyecto Supabase. Usa la clave publicable o anon legacy, nunca service_role. Abre `http://localhost:3000/`.

## Base de datos y usuarios

Sigue [la guía de Supabase y Pages](docs/supabase-auth-pages.md). En una base nueva, aplica en orden:

1. `supabase/migrations/202610280000_base_agricola.sql`
2. `supabase/migrations/202610280001_auth_don_ricardo.sql`
3. `supabase/migrations/202610280002_workflow_access.sql`
4. `supabase/migrations/202610280003_sprint_2_profile_dashboard.sql`

No ejecutes también `database/schema.sql` (esquema histórico Neon) ni reinstales el archivo histórico `database/supabase-schema.sql`. Si el proyecto ya tiene datos, respáldalo y revisa la diferencia de esquema y políticas antes de aplicar cambios; no lo reinicies ni borres tablas.

## Validación

```powershell
npm run lint
npm run typecheck
npm test
$env:DEPLOY_TARGET='github-pages'
npm run build
```

Las pruebas de permisos de PostgreSQL están en `supabase/tests/auth_permissions.sql`. Deben ejecutarse contra un Supabase de desarrollo y terminan con `ROLLBACK`. No se consideran aprobadas hasta ejecutarlas en ese entorno.

## GitHub Pages

URL prevista: `https://peterdiaz1911.github.io/PROYECTO_CURSO_IA/`.

En este repositorio, configura Actions Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, luego Settings → Pages → Source → GitHub Actions. No reutilices las variables del otro repositorio. El workflow valida, compila y publica `out/` después de actualizar `main`.

Los endpoints anteriores que requieren servidor Next.js se conservan fuera de la aplicación en `legacy-server/`. Pages no ejecuta `/api/asistente`, `/api/gemini`, Server Actions ni middleware. Los asistentes locales de las pantallas existentes permanecen como estaban; las claves de LLM jamás se exponen al frontend. Restaurar un asistente remoto requiere otro trabajo de backend autenticado.
