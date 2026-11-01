import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AssistantFailureKind = "session" | "quota" | "configuration" | "request" | "unavailable";

export class AssistantRequestError extends Error {
  constructor(message: string, readonly kind: AssistantFailureKind) {
    super(message);
    this.name = "AssistantRequestError";
  }
}

export function savedLotId(value?: string | null): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export async function askGemini(question: string, lotId: string | null, signal?: AbortSignal) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new AssistantRequestError("Supabase no está configurado en esta aplicación.", "configuration");
  const { data, error } = await client.functions.invoke("asistente-ia", {
    body: { question, lotId },
    signal,
  });
  if (error) {
    let message = "No se recibió una respuesta del asistente. Revisa tu conexión e intenta de nuevo.";
    let kind: AssistantFailureKind = "unavailable";
    // Function HTTP errors expose a Response in context. Never render a raw stack or token.
    const context: unknown = error.context;
    if (context instanceof Response) {
      if (context.status === 401 || context.status === 403) kind = "session";
      else if (context.status === 429) kind = "quota";
      else if (context.status >= 400 && context.status < 500) kind = "request";
      try {
        const body = await context.clone().json();
        if (body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error.length <= 300) {
          message = body.error;
          if (/configur|migraci[oó]n|cuota del asistente|modelo configurado|permisos/i.test(message)) kind = "configuration";
        }
      } catch { /* Keep the friendly network error. */ }
    }
    throw new AssistantRequestError(message, kind);
  }
  if (!data || data.provider !== "gemini" || typeof data.answer !== "string") {
    throw new AssistantRequestError("El asistente devolvió una respuesta inválida.", "unavailable");
  }
  return data.answer;
}
