# Código anterior que requiere un servidor Next.js

Estos archivos se conservan como referencia. GitHub Pages solo sirve archivos estáticos y no ejecuta middleware, Server Actions ni API Routes.

La autenticación activa está en `src/features/auth` y usa Supabase Auth y `public.usuarios`. El antiguo login BCrypt/Neon y las cookies de rol de demostración no participan en el acceso. No despliegues estos endpoints como autenticación alternativa.

Los handlers anteriores de asistente, Gemini y health se mantienen aquí, fuera del build estático. Las vistas agrícolas existentes y sus asistentes locales se conservan. La integración remota con un LLM necesitará su propio backend autenticado en una fase posterior; no pongas claves LLM en el navegador. Esta entrega se limita a autenticación y publicación.
