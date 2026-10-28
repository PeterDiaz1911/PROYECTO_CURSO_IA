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

type SupabaseCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function redirectWithCookies(url: URL, cookies: SupabaseCookie[]) {
  const response = NextResponse.redirect(url);
  cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export async function GET(request: NextRequest) {
  const callbackUrl = new URL(request.url);
  const loginUrl = new URL("/login", callbackUrl);
  loginUrl.searchParams.set("error", "auth-failed");

  const code = callbackUrl.searchParams.get("code");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !supabaseUrl || !anonKey) {
    return NextResponse.redirect(loginUrl);
  }

  const pendingCookies: SupabaseCookie[] = [];
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return redirectWithCookies(loginUrl, pendingCookies);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return redirectWithCookies(loginUrl, pendingCookies);
  }

  const { data: profile, error: profileError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profileError || !isUserRole(profile?.rol)) {
    return redirectWithCookies(loginUrl, pendingCookies);
  }

  const dashboardUrl = new URL(roleHome[profile.rol], callbackUrl);
  const response = redirectWithCookies(dashboardUrl, pendingCookies);
  response.cookies.set("nativa-role", profile.rol, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
