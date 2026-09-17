"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/db";
import { clearLoginFailures, isIpLocked, registerLoginFailure } from "@/lib/login-attempts";

const SESSION_COOKIE = "nativa_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

type LoginState = { error?: string };

function getClientIp(requestHeaders: Headers): string {
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? requestHeaders.get("x-real-ip")
    ?? "unknown";
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres");
  return new TextEncoder().encode(secret);
}

async function createSession(user: { id: string; correo: string; rol: string }) {
  const token = await new SignJWT({ email: user.correo, role: user.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function login(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  if (isIpLocked(ip)) return { error: "Demasiados intentos. Prueba nuevamente en 15 minutos." };

  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!correo || !password) return { error: "Correo y contraseña son obligatorios." };

  const user = await findUserByEmail(correo);
  const valid = Boolean(user?.enabled) && await bcrypt.compare(password, String(user.hash_password));
  if (!valid) {
    registerLoginFailure(ip);
    return { error: "Correo o contraseña incorrectos." };
  }

  clearLoginFailures(ip);
  await createSession({ id: String(user.id), correo: String(user.correo), rol: String(user.rol) });
  redirect("/dashboard");
}
