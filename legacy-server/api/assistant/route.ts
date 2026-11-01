import { NextResponse } from "next/server";
import { contextualAdvice } from "../../../src/lib/assistant";

type LotMetadata = {
  lotId: string;
  product: string;
  origin: string;
  temperature: string;
  status: string;
};

function isLotMetadata(value: unknown): value is LotMetadata {
  if (!value || typeof value !== "object") return false;
  const lot = value as Record<string, unknown>;
  return typeof lot.lotId === "string"
    && typeof lot.product === "string"
    && typeof lot.origin === "string"
    && typeof lot.temperature === "string"
    && typeof lot.status === "string";
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "query y metadatos del lote son obligatorios" }, { status: 400 });
  }

  const payload = body as { query?: unknown; lot?: unknown };
  if (typeof payload.query !== "string" || !payload.query.trim() || !isLotMetadata(payload.lot)) {
    return NextResponse.json({ error: "query y metadatos del lote son obligatorios" }, { status: 400 });
  }

  const result = await contextualAdvice(payload.query.trim(), payload.lot);
  return NextResponse.json(result);
}
