"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { roleHome, routeRole } from "./roles";

export function SessionStatus({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-stone-50 p-6"><section className="w-full max-w-md rounded-2xl border border-green-900/10 bg-white p-8 shadow-sm">{children}</section></main>;
}
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { client, session, profile, loading, error, reload, signOut, recovery } = useAuth();
  const path = usePathname(); const router = useRouter();
  const expected = routeRole(path);
  useEffect(() => {
    if (loading) return;
    if (!session || recovery) router.replace("/login");
    else if (profile?.is_active && expected && profile.rol !== expected) router.replace(roleHome[profile.rol]);
  }, [loading, session, recovery, profile, expected, router]);
  if (!client) return <SessionStatus><h1 className="text-xl font-bold">Configura el Supabase de Agrícola Don Ricardo</h1><p className="mt-3 text-sm text-gray-600">Faltan las variables públicas del proyecto independiente de IA.</p></SessionStatus>;
  if (loading || !session || recovery) return <SessionStatus><p role="status">Comprobando tu acceso...</p></SessionStatus>;
  if (error || !profile || !profile.is_active) return <SessionStatus><h1 className="text-xl font-bold">{profile && !profile.is_active ? "Cuenta pendiente de habilitación" : "Perfil no disponible"}</h1><p className="mt-3 text-sm text-gray-600">{error || "Gerencia debe habilitar tu cuenta y asignarte un área antes de operar."}</p><div className="mt-6 flex gap-4"><button className="font-bold text-green-900" onClick={reload}>Revisar acceso</button><button onClick={() => void signOut().catch(() => alert("No se pudo cerrar sesión. Inténtalo nuevamente."))}>Cerrar sesión</button></div></SessionStatus>;
  if (expected && profile.rol !== expected) return <SessionStatus><p role="status">Abriendo tu área de trabajo...</p></SessionStatus>;
  return children;
}
