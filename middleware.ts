import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "nativa_session";

function getSessionSecret(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

// Replace this in production with a shared Redis/Upstash rate-limit lookup.
function isIpLocked(_ip: string): boolean {
  return false;
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const ip = getClientIp(request);
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    const secret = getSessionSecret();
    let authenticated = false;
    if (!isIpLocked(ip) && session && secret) {
      try {
        await jwtVerify(session, secret);
        authenticated = true;
      } catch {
        authenticated = false;
      }
    }

    if (isIpLocked(ip)) {
      return NextResponse.json({ error: "IP temporalmente bloqueada" }, { status: 429 });
    }
    if (!authenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
