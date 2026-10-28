"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

async function prepareRecoverySession(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return "No se pudo conectar con Supabase. Intenta nuevamente más tarde.";
  }

  const callbackUrl = new URL(window.location.href);
  const code = callbackUrl.searchParams.get("code");
  const recoveryType = new URLSearchParams(callbackUrl.hash.slice(1)).get("type") === "recovery";

  // The shared client processes PKCE once through detectSessionInUrl.
  // Do not exchange the same code a second time from this compatibility page.
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return `No se pudo validar el enlace: ${error.message}`;
  if ((!recoveryType && !code) || !session) {
    return "El enlace de recuperación no es válido o ya venció. Solicita uno nuevo desde el inicio de sesión.";
  }

  window.history.replaceState({}, "", callbackUrl.pathname);
  return null;
}

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const { clearRecovery } = useAuth();
  const initialization = useRef<Promise<string | null> | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    initialization.current ??= prepareRecoverySession();
    let active = true;

    void initialization.current.then((sessionError) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError);
        return;
      }
      setReady(true);
    }).catch(() => { if (active) setError("No se pudo validar el enlace. Solicita uno nuevo desde el inicio de sesión."); });

    return () => {
      active = false;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (nuevaPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("No se pudo conectar con Supabase. Intenta nuevamente más tarde.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: nuevaPassword });
    setLoading(false);

    if (updateError) {
      setError(`No se pudo actualizar la contraseña: ${updateError.message}`);
      return;
    }

    clearRecovery();
    setSuccess("Contraseña actualizada. Te estamos llevando al inicio de sesión.");
    redirectTimer.current = setTimeout(() => {
      router.replace("/login?password-updated=1");
    }, 1800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl font-bold text-[#1B4332]">
            don ricardo<span className="text-[#B7D96B]">.</span>
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[.25em] text-gray-500">
            Agrícola Don Ricardo
          </p>
        </div>
        <Card className="border-gray-100 bg-white shadow-sm">
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center bg-[#B7D96B] text-[#1B4332]">
              <KeyRound size={20} />
            </div>
            <CardTitle className="text-2xl">Actualizar Contraseña</CardTitle>
            <p className="mt-2 text-sm text-gray-500">
              Elige una contraseña nueva para proteger tu cuenta.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block text-xs font-bold text-gray-800">
                Nueva Contraseña
                <Input
                  className="mt-2"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={nuevaPassword}
                  onChange={(event) => setNuevaPassword(event.target.value)}
                  disabled={!ready || loading || Boolean(success)}
                />
              </label>
              <label className="block text-xs font-bold text-gray-800">
                Confirmar Contraseña
                <Input
                  className="mt-2"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmarPassword}
                  onChange={(event) => setConfirmarPassword(event.target.value)}
                  disabled={!ready || loading || Boolean(success)}
                />
              </label>
              {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
              {success && <p role="status" className="text-xs font-semibold text-green-700">{success}</p>}
              <Button type="submit" className="w-full" disabled={!ready || loading || Boolean(success)}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </form>
            {!ready && !error && (
              <p role="status" className="mt-4 text-center text-xs text-gray-500">
                Validando el enlace de recuperación...
              </p>
            )}
            {error && (
              <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1B4332] hover:underline">
                <ArrowLeft size={15} /> Volver al inicio de sesión
              </Link>
            )}
          </CardContent>
        </Card>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Leaf size={14} /> Acceso protegido con Supabase Auth
        </div>
      </div>
    </main>
  );
}
