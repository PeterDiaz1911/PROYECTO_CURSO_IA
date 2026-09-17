import { NextResponse } from "next/server";
import { contextualAdvice } from "@/lib/assistant";

export async function POST(request: Request) {
  const body = await request.json() as { query?: string; lot?: { lotId: string; product: string; origin: string; temperature: string; status: string } };
  if (!body.query?.trim() || !body.lot) return NextResponse.json({ error: "query y metadatos del lote son obligatorios" }, { status: 400 });
  const result = await contextualAdvice(body.query, body.lot);
  return NextResponse.json(result);
}
