import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/store/useTraceabilityStore";

const roleHome: Record<UserRole, string> = {
  ADMIN: "/gerente",
  SUPERVISOR: "/packing",
  OPERADOR: "/campo",
};

function isUserRole(value: unknown): value is UserRole {
  return value === "ADMIN" || value === "SUPERVISOR" || value === "OPERADOR";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const requestedRole: UserRole | null = path.startsWith("/gerencia") || path.startsWith("/gerente")
    ? "ADMIN"
    : path.startsWith("/packing")
      ? "SUPERVISOR"
      : path.startsWith("/campo")
        ? "OPERADOR"
        : null;

  const redirectWithCookies = (destination: string) => {
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return requestedRole ? redirectWithCookies("/login") : response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return requestedRole ? redirectWithCookies("/login") : response;
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  const role = isUserRole(profile?.rol) ? profile.rol : null;

  if (requestedRole && !role) {
    return redirectWithCookies("/login");
  }

  if (requestedRole && role && requestedRole !== role) {
    return redirectWithCookies(roleHome[role]);
  }

  if (path === "/login" && role) {
    return redirectWithCookies(roleHome[role]);
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/login", "/gerencia(.*)", "/gerente(.*)", "/packing(.*)", "/campo(.*)"],
};
