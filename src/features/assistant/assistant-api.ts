import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function savedLotId(value?: string | null): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export async function askGemini(question: string, lotId: string | null) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("No se pudo conectar con el servicio.");
  const { data, error } = await client.functions.invoke("asistente-ia", {
    body: { question, lotId },
  });
  if (error) {
    let message = "No se pudo conectar con el asistente. Verifica tu sesión y vuelve a intentar.";
    // Function HTTP errors expose a Response in context. Never render a raw stack or token.
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body.error === "string" && body.error.length <= 300) message = body.error;
      } catch { /* Keep the friendly network error. */ }
    }
    throw new Error(message);
  }
  if (!data || data.provider !== "gemini" || typeof data.answer !== "string") {
    throw new Error("El asistente devolvió una respuesta inválida.");
  }
  return data.answer as string;
}
