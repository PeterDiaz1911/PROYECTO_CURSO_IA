# Sistema Inteligente Integrador de Trazabilidad

SaaS B2B agroexportador para control de lotes, calidad, cumplimiento y despacho.

## Stack

- Next.js App Router, React y TypeScript
- Tailwind CSS
- PostgreSQL BaaS mediante Neon Serverless
- BCrypt coste 12, TOTP y bloqueo de IP después de 5 intentos fallidos
- API Route de asistente contextual con reglas fitosanitarias y LLM opcional

## Desarrollo

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`.

Health check: `GET /api/health`

Configura `DATABASE_URL` con la cadena SSL de tu BaaS PostgreSQL. `LLM_API_KEY` es opcional; sin ella el asistente usa reglas deterministas.

## Vistas RBAC

- `/campo`: operación del Ingeniero Agrónomo.
- `/packing`: recepción y gestión del Supervisor.
- `/gerencia`: supervisión y autorización del Administrador.

Para activar la bandeja realtime de Packing configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. En Supabase habilita Realtime para `public.lotes_cosecha` y agrega la tabla a la publicación `supabase_realtime`.
