import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { UserRole } from "@/store/useTraceabilityStore";

const homes: Record<UserRole, string> = { ADMIN: "/gerente", SUPERVISOR: "/packing", OPERADOR: "/campo" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  const pendingCookies: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !supabaseUrl || !anonKey) return NextResponse.redirect(new URL("/login", origin));

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.headers.get("cookie")?.split("; ").map((entry) => { const [name, ...value] = entry.split("="); return { name, value: value.join("=") }; }) ?? [],
      setAll: (cookies) => { pendingCookies.push(...cookies); },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login", origin));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  const { data: profile } = await supabase.from("usuarios").select("rol, nombre").eq("id", user.id).single();
  const role = profile?.rol as UserRole | undefined;
  if (!role) return NextResponse.redirect(new URL("/login", origin));

  const response = NextResponse.redirect(new URL(homes[role], origin));
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  response.cookies.set("nativa-role", role, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  return response;
}
