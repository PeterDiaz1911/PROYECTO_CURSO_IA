type LotMetadata = { lotId: string; product: string; origin: string; temperature: string; status: string };

export async function contextualAdvice(query: string, lot: LotMetadata) {
  const ruleAdvice = query.toLowerCase().includes("temperatura")
    ? "Verifica la cadena de frío y bloquea el despacho si está fuera del rango del producto."
    : query.toLowerCase().includes("plaga")
      ? "Aísla el lote, registra evidencia y valida el protocolo fitosanitario antes del despacho."
      : "Revisa el certificado fitosanitario, el país de destino y la trazabilidad completa del lote.";

  if (!process.env.LLM_API_KEY) return { advice: ruleAdvice, source: "RULE_ENGINE" };
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LLM_API_KEY}` }, body: JSON.stringify({ model: process.env.LLM_MODEL ?? "gpt-4o-mini", temperature: 0.2, messages: [{ role: "system", content: "Eres un asistente fitosanitario. Usa las reglas entregadas como restricciones y no reemplaces la normativa oficial." }, { role: "user", content: JSON.stringify({ query, lot, ruleAdvice }) }] }) });
  if (!response.ok) return { advice: ruleAdvice, source: "RULE_ENGINE_FALLBACK" };
  const data = await response.json() as { choices?: [{ message?: { content?: string } }] };
  return { advice: data.choices?.[0]?.message?.content ?? ruleAdvice, source: "LLM_WITH_RULES" };
}
