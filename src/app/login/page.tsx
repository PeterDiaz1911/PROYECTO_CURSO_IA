"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { roleHome } from "@/features/auth/roles";
import { authReturnUrl } from "@/lib/supabase/client";
import { SessionStatus } from "@/features/auth/AuthGate";

type Mode = "login" | "register" | "recover";
export default function LoginPage() { return <Suspense fallback={<SessionStatus><p role="status">Cargando acceso...</p></SessionStatus>}><LoginContent /></Suspense>; }
function LoginContent() {
  const { client, session, profile, loading: restoring, error: profileError, reload, recovery, clearRecovery, signOut } = useAuth();
  const router = useRouter(); const params = useSearchParams(); const reduce = useReducedMotion();
  const reset = recovery || params.get("mode") === "reset";
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState(""); const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false); const submitting = useRef(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!restoring && session && profile?.is_active && !reset) router.replace(roleHome[profile.rol]);
  }, [restoring, session, profile, reset, router]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  function changeMode(next: Mode) { setMode(next); setError(""); setMessage(""); setPassword(""); setConfirmation(""); }
  function showError(cause: unknown) {
    const authError = cause as { status?: number; code?: string; message?: string };
    if (authError.status === 429 || authError.code?.includes("rate_limit")) {
      setCooldown(60); setError("Se alcanzó el límite de solicitudes o correos. Espera antes de reintentar; la cuota de correo puede tardar más en restablecerse.");
    } else if (authError.code === "invalid_credentials") setError("Correo o contraseña incorrectos.");
    else if (authError.code === "email_not_confirmed") setError("Confirma tu correo antes de ingresar.");
    else setError(authError.message ?? "No se pudo completar la solicitud.");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || submitting.current || cooldown) return;
    setError(""); setMessage("");
    if (reset && (!session || password !== confirmation)) { setError(!session ? "Abre el enlace de recuperación en este navegador para continuar." : "Las contraseñas no coinciden."); return; }
    submitting.current = true; setBusy(true);
    try {
      if (reset) {
        const { error: requestError } = await client.auth.updateUser({ password }); if (requestError) throw requestError;
        clearRecovery(); setPassword(""); setConfirmation(""); setMessage("Contraseña actualizada.");
        router.replace("/login");
      } else if (mode === "login") {
        const { error: requestError } = await client.auth.signInWithPassword({ email: email.trim(), password }); if (requestError) throw requestError;
      } else if (mode === "register") {
        const { error: requestError } = await client.auth.signUp({ email: email.trim(), password, options: { data: { nombre: name.trim() }, emailRedirectTo: authReturnUrl() } });
        if (requestError) throw requestError;
        setPassword(""); setMessage("Revisa tu correo para confirmar la cuenta. Gerencia debe habilitar tu acceso y asignarte un área.");
      } else {
        const { error: requestError } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: authReturnUrl(true) });
        if (requestError) throw requestError;
        setMessage("Si existe una cuenta para ese correo, recibirás las instrucciones de recuperación.");
      }
    } catch (cause) { showError(cause); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function googleLogin() {
    if (!client || busy) return;
    setBusy(true); setError("");
    try {
      const { error: requestError } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authReturnUrl() } });
      if (requestError) throw requestError;
    } catch (cause) { showError(cause); setBusy(false); }
  }
  const title = reset ? "Nueva contraseña" : mode === "register" ? "Solicita tu acceso" : mode === "recover" ? "Recupera tu cuenta" : "Bienvenido de vuelta";
  const pending = session && !reset && !restoring && (!profile || !profile.is_active);
  return <main className="grid min-h-screen bg-stone-50 lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-[#1B4332] lg:block"><div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center opacity-70" /><div className="absolute inset-0 bg-[#1B4332]/65" /><div className="relative flex h-full min-h-screen flex-col justify-between p-10 text-white xl:p-16"><div><p className="font-display text-3xl font-bold">don ricardo<span className="text-[#B7D96B]">.</span></p><p className="mt-2 text-[10px] font-bold uppercase tracking-[.25em] text-white/60">Agrícola Don Ricardo</p></div><div className="max-w-lg"><Leaf size={32} className="mb-6 text-[#B7D96B]" /><h1 className="font-display text-5xl font-bold leading-[1.05]">La cosecha que llega más lejos.</h1><p className="mt-5 max-w-md text-sm leading-6 text-white/75">Accede a tu área de Campo, Packing o Gerencia y continúa la trazabilidad de cada lote.</p></div><div className="flex items-center gap-2 text-xs text-white/60"><ShieldCheck size={15} className="text-[#B7D96B]" /> Identidad y permisos con Supabase Auth</div></div></section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-10"><motion.div initial={{ opacity: 0, y: reduce ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : .4 }} className="w-full max-w-md"><Card className="rounded-2xl border-gray-100 bg-white shadow-sm"><CardHeader><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#C9603F]">Portal de operaciones</p><CardTitle className="mt-2 text-3xl">{title}</CardTitle><p className="mt-2 text-sm text-gray-500">{reset ? "Elige una contraseña nueva para tu cuenta." : "Ingresa con el correo de tu cuenta de Agrícola Don Ricardo."}</p></CardHeader><CardContent>
      {!client ? <p role="alert" className="text-sm text-red-700">Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY del proyecto Supabase independiente de IA.</p> : restoring ? <p role="status">Comprobando sesión...</p> : pending ? <div><p role="status" className="text-sm text-gray-600">{profileError || "Tu cuenta está pendiente de habilitación por Gerencia. El registro no concede acceso operativo automáticamente."}</p><div className="mt-5 flex gap-4"><button className="font-bold text-green-900" onClick={reload}>Revisar acceso</button><button onClick={() => void signOut().catch(showError)}>Cerrar sesión</button></div></div> : <>
      {process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" && !reset && mode === "login" && <><Button type="button" onClick={() => void googleLogin()} disabled={busy} className="mb-5 w-full bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50">Continuar con Google</Button><p className="mb-5 text-center text-xs text-gray-400">O utiliza tu correo</p></>}
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}><fieldset disabled={busy} className="space-y-5">
        {mode === "register" && !reset && <label className="block text-xs font-bold">Nombre completo<Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name" className="mt-2" /></label>}
        {!reset && <label className="block text-xs font-bold">Correo electrónico<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} autoComplete="email" className="mt-2" placeholder="nombre@empresa.com" /></label>}
        {(reset || mode !== "recover") && <label className="block text-xs font-bold">Contraseña<div className="relative mt-2"><LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} className="pl-9 pr-10" type={visible ? "text" : "password"} autoComplete={!reset && mode === "login" ? "current-password" : "new-password"} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
        {reset && <label className="block text-xs font-bold">Confirmar contraseña<Input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={8} className="mt-2" /></label>}
      </fieldset><Button type="submit" disabled={busy || cooldown > 0 || (reset && !session)} className="w-full bg-[#1B4332] hover:bg-[#163728]">{cooldown ? `Reintentar en ${cooldown} s` : busy ? "Procesando..." : reset ? "Guardar contraseña" : mode === "register" ? "Crear cuenta" : mode === "recover" ? "Enviar enlace" : "Ingresar al panel"}<ArrowRight size={16} /></Button></form>
      {!reset && <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-green-900"><button disabled={busy} onClick={() => changeMode(mode === "login" ? "recover" : "login")}>{mode === "login" ? "Olvidé mi contraseña" : "Volver al acceso"}</button>{mode === "login" && <button disabled={busy} onClick={() => changeMode("register")}>Solicitar cuenta</button>}</div>}
      </>}{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}{message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-xs text-green-800">{message}</p>}
      <p className="mt-6 text-center text-[11px] text-gray-400">Los roles se asignan desde la base de datos por un administrador autorizado.</p>
    </CardContent></Card></motion.div></section>
  </main>;
}
