import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/store/useTraceabilityStore";

const roleHome: Record<UserRole, string> = { ADMIN: "/gerente", SUPERVISOR: "/packing", OPERADOR: "/campo" };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let role = request.cookies.get("nativa-role")?.value as UserRole | undefined;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && (request.nextUrl.pathname.startsWith("/gerente") || request.nextUrl.pathname.startsWith("/packing") || request.nextUrl.pathname.startsWith("/campo"))) return NextResponse.redirect(new URL("/login", request.url));
    role = role ?? (user?.user_metadata?.rol as UserRole | undefined);
  }

  const path = request.nextUrl.pathname;
  const requestedRole: UserRole | null = path.startsWith("/gerente") ? "ADMIN" : path.startsWith("/packing") ? "SUPERVISOR" : path.startsWith("/campo") ? "OPERADOR" : null;
  if (requestedRole && !role) return NextResponse.redirect(new URL("/login", request.url));
  if (requestedRole && role && requestedRole !== role) return NextResponse.redirect(new URL(roleHome[role], request.url));
  if (path === "/login" && role) return NextResponse.redirect(new URL(roleHome[role], request.url));

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = { matcher: ["/login", "/gerente/:path*", "/packing/:path*", "/campo/:path*"] };
