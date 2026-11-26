"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Leaf, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { roleHome } from "@/features/auth/roles";
import { authReturnUrl } from "@/lib/supabase/client";
import { SessionStatus } from "@/features/auth/AuthGate";
import { ThemeSelect } from "@/features/theme/ThemeSelect";

type Mode = "login" | "register" | "recover";

export default function LoginPage() {
  return (
    <Suspense fallback={<SessionStatus><p role="status">Cargando acceso...</p></SessionStatus>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { client, session, profile, loading: restoring, reload, recovery, clearRecovery, signOut } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const reset = recovery || params.get("mode") === "reset";

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!restoring && session && profile?.is_active && !reset) {
      router.replace(roleHome[profile.rol]);
    }
  }, [restoring, session, profile, reset, router]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmation("");
  }

  function showError(cause: unknown) {
    const authError = cause as { status?: number; code?: string; message?: string };
    if (authError.status === 429 || authError.code?.includes("rate_limit")) {
      setCooldown(60);
      setError("Se alcanzó el límite de solicitudes o correos. Espera antes de reintentar; la cuota de correo puede tardar más en restablecerse.");
    } else if (authError.code === "invalid_credentials") {
      setError("Correo o contraseña incorrectos.");
    } else if (authError.code === "email_not_confirmed") {
      setError("Confirma tu correo antes de ingresar.");
    } else {
      setError(authError.message ?? "No se pudo completar la solicitud.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || submitting.current || cooldown) return;
    setError("");
    setMessage("");

    if (reset && (!session || password !== confirmation)) {
      setError(!session ? "Abre el enlace de recuperación en este navegador para continuar." : "Las contraseñas no coinciden.");
      return;
    }

    submitting.current = true;
    setBusy(true);

    try {
      if (reset) {
        const { error: requestError } = await client.auth.updateUser({ password });
        if (requestError) throw requestError;
        clearRecovery();
        setPassword("");
        setConfirmation("");
        setMessage("Contraseña actualizada.");
        router.replace("/login");
      } else if (mode === "login") {
        const { error: requestError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (requestError) throw requestError;
      } else if (mode === "register") {
        const { error: requestError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nombre: name.trim() }, emailRedirectTo: authReturnUrl() }
        });
        if (requestError) throw requestError;
        setPassword("");
        setMessage("Revisa tu correo para confirmar la cuenta. Gerencia debe habilitar tu acceso y asignarte un área.");
      } else {
        const { error: requestError } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: authReturnUrl(true) });
        if (requestError) throw requestError;
        setMessage("Si existe una cuenta para ese correo, recibirás las instrucciones de recuperación.");
      }
    } catch (cause) {
      showError(cause);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const title = reset ? "Nueva contraseña" : mode === "register" ? "Solicita tu acceso" : mode === "recover" ? "Recupera tu cuenta" : "Bienvenido de vuelta";
  const pending = session && !reset && !restoring && (!profile || !profile.is_active);

  return (
    <main className="relative grid min-h-screen w-full grid-cols-1 overflow-hidden bg-background text-foreground lg:grid-cols-2">
      {/* MITAD IZQUIERDA (ESCRITORIO): Fotografía con movimiento orgánico tipo brisa + destellos de luz */}
      <section className="relative hidden h-full w-full overflow-hidden bg-[#1B4332] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <motion.div
          animate={
            reduce
              ? {}
              : {
                  scale: [1.04, 1.13, 1.08, 1.04],
                  x: ["0%", "-2%", "1.5%", "0%"],
                  y: ["0%", "-1.5%", "1%", "0%"],
                  rotate: [0, 0.6, -0.5, 0],
                }
          }
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-4 bg-[url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center opacity-75"
        />

        <motion.div
          animate={
            reduce
              ? {}
              : {
                  opacity: [0.15, 0.4, 0.2, 0.15],
                  scale: [0.95, 1.15, 1, 0.95],
                }
          }
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-20 right-0 h-[420px] w-[420px] rounded-full bg-emerald-300/25 blur-3xl"
        />
        <motion.div
          animate={
            reduce
              ? {}
              : {
                  opacity: [0.1, 0.3, 0.15, 0.1],
                  x: [0, 25, -10, 0],
                  y: [0, -20, 10, 0],
                }
          }
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-10 left-10 h-72 w-72 rounded-full bg-amber-200/15 blur-3xl"
        />

        <div
          className="absolute inset-0 bg-gradient-to-t from-[#081C15]/90 via-[#1B4332]/55 to-[#1B4332]/35"
          style={{ backgroundColor: "var(--login-overlay)" }}
        />

        <motion.div
          initial={reduce ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-white backdrop-blur-md">
            Agrícola Don Ricardo
          </span>
        </motion.div>

        <motion.div
          initial={reduce ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1 }}
          className="relative z-10 my-auto max-w-lg space-y-4"
        >
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
            La cosecha que llega más lejos.
          </h1>
          <p className="text-sm leading-relaxed text-emerald-50/90">
            Accede a tu área de Campo, Packing o Gerencia y continúa la trazabilidad de cada lote en tiempo real.
          </p>
        </motion.div>

        <motion.div
          initial={reduce ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="relative z-10 flex items-center gap-2 text-xs font-medium text-emerald-100/80"
        >
          <ShieldCheck size={16} className="text-emerald-300" />
          <span>Identidad y permisos seguros con Supabase Auth</span>
        </motion.div>
      </section>

      {/* COLUMNA DERECHA (Y VISTA COMPLETA EN MÓVIL CON FONDO ANIMADO) */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12 text-foreground transition-colors duration-300 sm:px-8 lg:px-12 lg:py-16">
        {/* FONDO ANIMADO SOLO PARA CELULAR / TABLET (< lg) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden="true">
          <motion.div
            animate={
              reduce
                ? {}
                : {
                    scale: [1.05, 1.14, 1.09, 1.05],
                    x: ["0%", "-2.5%", "1.5%", "0%"],
                    y: ["0%", "-1.5%", "1%", "0%"],
                    rotate: [0, 0.7, -0.5, 0],
                  }
            }
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-6 bg-[url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-55 dark:opacity-45 [[data-theme=dark]_&]:opacity-45"
          />
          <motion.div
            animate={
              reduce
                ? {}
                : {
                    opacity: [0.2, 0.45, 0.25, 0.2],
                    scale: [0.95, 1.15, 1, 0.95],
                  }
            }
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-16 right-0 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl"
          />
          {/* Velo adaptable para garantizar contraste perfecto en modo claro y oscuro */}
          <div
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--background, #f6f8f6) 68%, transparent) 0%, color-mix(in srgb, var(--background, #f6f8f6) 84%, transparent) 55%, color-mix(in srgb, var(--background, #f6f8f6) 94%, transparent) 100%)",
            }}
            className="absolute inset-0 backdrop-blur-[2px]"
          />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-6">
          {/* Cabecera con marca y selector de tema */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B4332] text-white shadow-md">
                <Leaf size={19} />
              </span>
              <div className="leading-tight">
                <span className="block font-bold text-foreground">Agrícola Don Ricardo</span>
                <span className="text-[11px] font-medium text-muted-foreground lg:hidden">Trazabilidad y Operaciones</span>
              </div>
            </div>
            <ThemeSelect />
          </div>

          {/* Título y bajada */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {reset
                ? "Introduce tu nueva contraseña segura."
                : pending
                ? "Tu cuenta está pendiente de activación por Gerencia."
                : mode === "register"
                ? "Completa tus datos para registrarte."
                : mode === "recover"
                ? "Te enviaremos un enlace para restablecer tu contraseña."
                : "Ingresa tus credenciales para continuar."}
            </p>
          </div>

          {pending ? (
            <Card className="border-amber-200 bg-amber-50/95 backdrop-blur-md">
              <CardContent className="space-y-4 p-7 text-sm text-amber-900">
                <p>Tu sesión está activa, pero tu perfil aún no ha sido aprobado o asignado a un área por la administración.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => void reload()} className="flex-1">
                    Verificar de nuevo
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-border/80 bg-card/90 shadow-[0_20px_50px_-15px_rgba(23,37,29,0.18)] backdrop-blur-md lg:rounded-2xl lg:border-border lg:bg-card lg:shadow-sm lg:backdrop-blur-none">
              <CardContent className="p-7 sm:p-8">
                <form onSubmit={submit} className="space-y-5 pt-1">
                  {error && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                      {error}
                    </div>
                  )}
                  {message && (
                    <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                      {message}
                    </div>
                  )}

                  {mode === "register" && !reset && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-foreground">Nombre completo</label>
                      <Input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        className="h-11 rounded-xl"
                      />
                    </div>
                  )}

                  {!reset && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-foreground">Correo electrónico</label>
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@agricoladonricardo.pe"
                        className="h-11 rounded-xl"
                      />
                    </div>
                  )}

                  {(mode !== "recover" || reset) && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-foreground">
                        {reset ? "Nueva contraseña" : "Contraseña"}
                      </label>
                      <div className="relative">
                        <Input
                          type={visible ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-11 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setVisible(!visible)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {reset && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-foreground">Confirma la contraseña</label>
                      <Input
                        type="password"
                        required
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 rounded-xl"
                      />
                    </div>
                  )}

                  <Button type="submit" disabled={busy || cooldown > 0} className="h-11 w-full rounded-xl bg-[#1B4332] font-bold text-white hover:bg-[#1B4332]/90">
                    {busy ? "Procesando..." : reset ? "Actualizar contraseña" : mode === "register" ? "Registrarse" : mode === "recover" ? "Enviar instrucciones" : "Iniciar sesión"}
                  </Button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    {mode === "login" && !reset && (
                      <>
                        <button type="button" onClick={() => changeMode("recover")} className="font-medium text-[#2D6A4F] hover:underline dark:text-emerald-400 [[data-theme=dark]_&]:text-emerald-400">
                          ¿Olvidaste tu contraseña?
                        </button>
                        <button type="button" onClick={() => changeMode("register")} className="font-medium text-[#2D6A4F] hover:underline dark:text-emerald-400 [[data-theme=dark]_&]:text-emerald-400">
                          Solicitar acceso
                        </button>
                      </>
                    )}
                    {(mode === "register" || mode === "recover") && !reset && (
                      <button type="button" onClick={() => changeMode("login")} className="font-medium text-[#2D6A4F] hover:underline dark:text-emerald-400 [[data-theme=dark]_&]:text-emerald-400">
                        ← Volver al inicio de sesión
                      </button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Pie de seguridad visible también en móvil */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground lg:hidden">
            <ShieldCheck size={15} className="text-[#2D6A4F] dark:text-emerald-400 [[data-theme=dark]_&]:text-emerald-400" />
            <span>Identidad y permisos seguros con Supabase Auth</span>
          </div>
        </div>
      </section>
    </main>
  );
}