# Resumen operativo del asistente

La función ahora obtiene un resumen de Supabase en cada consulta, además del lote seleccionado si existe. No cambia los secretos, el modelo, el frontend, la autenticación ni la navegación.

## Instalación

1. Aplicar el parche desde la raíz, comprobando primero `git apply --check IA_Contexto_Resumen.patch`. Si hay conflictos, detenerse y adaptar los cambios; no sobrescribir toda la carpeta src ni funciones.
2. En el SQL Editor del proyecto **ckoakjfimdlxouiouuyv**, ejecutar el contenido de `supabase/migrations/202610290002_assistant_summary.sql`. Un archivo SQL no es un comando de PowerShell.
3. Desde la raíz, desplegar el backend actualizado:

   `npx supabase functions deploy asistente-ia --project-ref ckoakjfimdlxouiouuyv --use-api`

4. Instalar la extensión **Deno**, identificador `denoland.vscode-deno`, y disponer del ejecutable Deno. Abrir `Agricola-IA.code-workspace` con Archivo > Abrir área de trabajo desde archivo. Deno queda limitado a `supabase/functions`; el frontend sigue usando TypeScript/Next.js.
5. Si se prefiere abrir la carpeta normal, combinar `"deno.enablePaths": ["./supabase/functions"]` con los ajustes existentes en `.vscode/settings.json`. No reemplazar otras preferencias. Ejecutar Developer: Reload Window después de instalar la extensión.

No declarar Deno como any ni desactivar la comprobación de tipos. El tsconfig de Next.js ya excluye supabase/functions correctamente.

## Alcance

- Totales históricos de lotes y estados; documentos visibles; usuarios totales/habilitados solo para ADMIN.
- Registros de hoy, últimos 7 días, 7 anteriores, últimos 30 días y mes actual, con fechas de Lima.
- Altas diarias de los últimos 30 días y rankings de hasta 20 cultivos/fundos. No se presentan como una lista completa de lotes.
- Marca DEMO por prefijo del fundo, conforme al seed existente. No estar marcado DEMO no certifica datos reales.
- OPERADOR: sus registros según RLS. ADMIN y SUPERVISOR: lo autorizado por sus políticas existentes. La función SQL es SECURITY INVOKER y usa el JWT del usuario, sin service_role.
- No envía correos, teléfonos o perfiles personales al proveedor. No permite que el modelo ejecute SQL ni modifique datos.
- No conoce métricas que no estén en el resumen. El conteo por fecha representa creación de registros, no aprobación, cosecha ni despacho. No incluye precios, producción o rendimiento si esos datos no existen.
- Un error al consultar el resumen se informa; no se sustituye por una respuesta ficticia.

## Comprobación real pendiente

Probar autenticado: «¿Cuántos lotes tengo?», «¿Cuántos están aprobados?», «¿Cuántos se registraron esta semana?», «¿Qué cultivos tienen más lotes?» y contrastar los números en el panel para el mismo alcance y periodo. Para preguntas de semana, aclarar si se desea últimos 7 días; ese es el agregado disponible.

El parche no se ha ejecutado en tu Supabase ni se ha probado contra Gemini real desde este entorno. La configuración del editor tampoco se instala automáticamente en tu equipo.

Las pruebas del handler usan servicios simulados: validan JWT propagado, rol, cuotas y fallo explícito de resumen. No sustituyen una prueba real de RLS en tu base.

## Publicación

La nueva RPC y Edge Function se publican en Supabase, no mediante GitHub Pages. Guardar luego los cambios en Git para que no se pierdan; no hace falta reconstruir el frontend para activar este cambio del backend.

## Clave y modelo de Gemini

- La interfaz llama a `supabase/functions/asistente-ia`; no usa `legacy-server/api/gemini/route.ts`.
- Configura `GEMINI_API_KEY` como secreto de la Edge Function desde **Supabase Dashboard → Project Settings → Edge Functions → Secrets**. Nunca la pongas en `NEXT_PUBLIC_*`, en el código del navegador, en GitHub Pages ni en un commit.
- El nombre del secreto `GEMINI_API_KEY` ya aparece en el proyecto remoto, pero eso no confirma que su valor siga válido. No compartas la clave para diagnosticarlo.
- La función activa respeta el secreto remoto `GEMINI_MODEL` si está definido; este valor prevalece sobre el valor por defecto existente en el handler. No cambies el modelo al investigar un HTTP 502 sin revisar primero los logs de la Edge Function.
- Para que un cambio en el handler o en `GEMINI_MODEL` llegue al entorno remoto, hay que desplegar la Edge Function. Cambiar solo el frontend o publicarlo en GitHub Pages no actualiza la función.
- Un HTTP 502 se origina en la llamada del servidor. Puede deberse a clave/permisos, modelo no disponible, petición rechazada o error transitorio. Comprueba los logs de `asistente-ia` en Supabase antes de cambiar o rotar una clave.
