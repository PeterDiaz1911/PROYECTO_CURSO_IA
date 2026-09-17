import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Role = "ADMIN" | "SUPERVISOR" | "OPERADOR";

const roleInstructions: Record<Role, string> = {
  ADMIN: "Actúa como Auditor estricto de aduanas. Evalúa riesgos documentales y fitosanitarios para aprobar o rechazar un despacho.",
  SUPERVISOR: "Actúa como Validador de Packing. Cruza el mercado destino con el agroquímico, días de carencia y ppm, y alerta sobre riesgo de retención en aduanas.",
  OPERADOR: "Actúa como Consultor de Campo. Da consejos preventivos sobre agroquímicos, carencias y buenas prácticas sin inventar regulaciones.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { prompt_usuario?: unknown; datos_lote?: unknown; rol_usuario?: unknown };
    const prompt = typeof body.prompt_usuario === "string" ? body.prompt_usuario.trim() : "";
    const role = body.rol_usuario as Role;
    if (!prompt || !roleInstructions[role]) return NextResponse.json({ error: "prompt_usuario y rol_usuario válido son obligatorios." }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY no está configurada." }, { status: 503 });

    const systemPrompt = `Eres el asistente especializado del rol ${role}. ${roleInstructions[role]}\n\nUsa únicamente los datos del lote entregados en JSON. No inventes límites, leyes, certificaciones ni resultados. Si faltan datos, responde que necesitas validación oficial. Responde en español con un veredicto claro y una justificación breve.\n\nDATOS_LOTE:\n${JSON.stringify(body.datos_lote)}\n\nCONSULTA_USUARIO:\n${prompt}`;
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash" });
    const result = await model.generateContent(systemPrompt);
    return NextResponse.json({ respuesta: result.response.text(), rol: role, modelo: process.env.GEMINI_MODEL ?? "gemini-1.5-flash" });
  } catch (error) {
    console.error("Gemini route error", error);
    return NextResponse.json({ error: "No se pudo generar la respuesta del asistente." }, { status: 502 });
  }
}
