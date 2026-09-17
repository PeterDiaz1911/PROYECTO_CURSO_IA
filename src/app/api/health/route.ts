import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "sistema-inteligente-trazabilidad", timestamp: new Date().toISOString() });
}
