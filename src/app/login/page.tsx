"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, ShieldCheck } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Role = "ADMIN" | "SUPERVISOR" | "OPERADOR";

const mockUsers = {
  gerente: { email: "gerente@empresa.com", pass: "admin123", rol: "ADMIN" as const, nombre: "Gerente" },
  packing: { email: "packing@empresa.com", pass: "pack123", rol: "SUPERVISOR" as const, nombre: "Jefe de Packing" },
  agronomo: { email: "agronomo@empresa.com", pass: "agro123", rol: "OPERADOR" as const, nombre: "Ingeniero Agrónomo" },
};

const roleHome: Record<Role, string> = {
  ADMIN: "/gerente",
  SUPERVISOR: "/packing",
  OPERADOR: "/campo",
};

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  function persistRole(role: Role, nombre: string, usuario: string) {
    document.cookie = `nativa-role=${role}; Path=/; Max-Age=28800; SameSite=Lax`;
    localStorage.setItem("nativa-auth", JSON.stringify({ usuario, nombre, rol: role }));
    router.push(roleHome[role] as Route);
  }

  function handleGoogleLogin() {
    setToast("Google no está habilitado en esta versión local. Usa tu usuario y contraseña.");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setToast("");

    const loginKey = user.trim().toLowerCase();
    const found = Object.entries(mockUsers).find(
      ([_, data]) => data.email === loginKey || _ === loginKey
    )?.[1];

    if (!found || found.pass !== pass) {
      setToast("Usuario o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    persistRole(found.rol, found.nombre, found.email);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e8efe8] px-4 py-8 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/nativa-bg.svg')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#f3f7ee]/80 via-[#edf4eb]/50 to-[#f3f7ee]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(209,240,143,0.35),transparent_38%)]" />

      <div className="relative z-10 w-full max-w-6xl">
        <div className="mb-6 text-center text-slate-800 md:mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#2e5c42]">Nativa</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#183b2d] sm:text-4xl md:text-5xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Sistema de trazabilidad y despacho
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto w-full max-w-5xl"
        >
          <Card className="overflow-hidden border border-[#dfe9d9] bg-white/82 shadow-[0_24px_80px_rgba(15,23,42,0.2)] backdrop-blur-sm">
            <div className="flex flex-col md:flex-row">
              <div
                className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden p-8 md:w-[42%]"
                style={{
                  backgroundImage: "linear-gradient(135deg, rgba(23,57,43,0.66), rgba(14,33,24,0.36)), url('/nativa-bg.svg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(189,239,125,0.22),transparent_38%)]" />
                <div className="relative z-10 flex flex-col items-center text-center text-white">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/12 shadow-lg ring-8 ring-white/20 backdrop-blur-sm">
                    <Leaf className="h-10 w-10 text-[#edf7c4]" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#edf7c4]">Nativa</p>
                  <h2 className="mt-3 max-w-[220px] text-2xl font-bold tracking-tight text-white sm:text-3xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    Agrícola Don Ricardo
                  </h2>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 md:p-10">
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#b96339]">Portal de operaciones</p>
                  <CardTitle
                    className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    Bienvenido de vuelta
                  </CardTitle>
                </div>

                <p className="mb-6 text-sm leading-6 text-slate-600">Accede con tu cuenta corporativa para continuar con la operación.</p>

                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="h-[88px] w-full rounded-2xl border border-[#d7e4ff] bg-[#4b7be8] px-0 text-left text-white shadow-[0_20px_35px_rgba(75,123,232,0.28)] transition hover:bg-[#4473df] disabled:opacity-70"
                >
                  <span className="flex w-full items-center gap-0 overflow-hidden rounded-2xl">
                    <span className="flex h-[88px] w-[120px] items-center justify-center bg-white/92 text-[#1f1f1f]">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl font-black shadow-sm">
                        <span style={{ color: "#ea4335" }}>G</span>
                      </span>
                    </span>
                    <span className="flex-1 px-6 text-2xl font-medium tracking-tight sm:text-4xl">Sign in with Google</span>
                  </span>
                </Button>

                <div className="relative my-6 flex items-center">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">o inicia sesión</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={submit} className="space-y-5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Usuario o correo
                    <Input
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      type="text"
                      autoComplete="username"
                      required
                      placeholder="nombre@empresa.com"
                      className="mt-2 h-12 rounded-2xl border border-slate-200 bg-[#f8f7f4] px-3 text-sm text-slate-700 shadow-inner placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#9fcf6d]"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Contraseña
                    <Input
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      type="password"
                      autoComplete="current-password"
                      required
                      placeholder="••••••••••••"
                      className="mt-2 h-12 rounded-2xl border border-slate-200 bg-[#f8f7f4] px-3 text-sm text-slate-700 shadow-inner placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#9fcf6d]"
                    />
                  </label>

                  {toast ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{toast}</div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="mt-2 h-12 w-full rounded-2xl bg-[#234d41] text-base font-semibold text-white shadow-[0_18px_30px_rgba(35,77,65,0.25)] transition hover:bg-[#1b4139] disabled:opacity-70"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {loading ? "Validando..." : "Ingresar al panel"}
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </span>
                  </Button>
                </form>

                <div className="mt-6 flex items-center justify-center rounded-2xl border border-[#edf1de] bg-[#f7faed] px-3 py-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-2 font-medium text-[#2b5c48]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#557957]" />
                    Acceso local de sesión
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
