import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db";
import { isIpLocked, passwordMatches, registerFailure, registerSuccess, verifyTotp } from "@/lib/security";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isIpLocked(ip)) return NextResponse.json({ error: "IP temporalmente bloqueada" }, { status: 429 });
  const body = await request.json() as { email?: string; password?: string; totpCode?: string };
  if (!body.email || !body.password || !body.totpCode) return NextResponse.json({ error: "Credenciales incompletas" }, { status: 400 });
  const user = await findUserByEmail(body.email);
  const valid = Boolean(user?.enabled) && await passwordMatches(body.password, String(user.password_hash)) && await verifyTotp(body.totpCode, String(user.totp_secret));
  if (!valid) { registerFailure(ip); return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 }); }
  registerSuccess(ip);
  return NextResponse.json({ status: "AUTHENTICATED" });
}
