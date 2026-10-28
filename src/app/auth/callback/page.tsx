"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SessionStatus } from "@/features/auth/AuthGate";
export default function AuthCallbackPage() {
  const router = useRouter(); const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const client = getSupabaseBrowserClient();
    if (!client) { setError("Falta configurar Supabase."); return; }
    if (params.has("error") || hash.has("error")) { setError("El enlace no es válido o ha vencido. Solicita uno nuevo desde el acceso."); return; }
    // detectSessionInUrl processes the PKCE code once in the singleton client.
    void client.auth.getSession().then(({ data, error: requestError }) => {
      if (!active) return;
      if (requestError || !data.session) { setError("No se pudo completar el acceso. Abre el enlace en el mismo navegador donde lo solicitaste o pide uno nuevo."); return; }
      router.replace(params.get("recovery") === "1" || hash.get("type") === "recovery" ? "/login?mode=reset" : "/dashboard");
    }).catch(() => { if (active) setError("No se pudo verificar la sesión. Inténtalo nuevamente."); });
    return () => { active = false; };
  }, [router]);
  return <SessionStatus><h1 className="text-xl font-bold">Confirmación de acceso</h1>{error ? <><p role="alert" className="mt-4 text-sm text-red-700">{error}</p><Link href="/login" className="mt-5 block text-green-900">Volver al acceso</Link></> : <p className="mt-4" role="status">Procesando tu enlace seguro...</p>}</SessionStatus>;
}
