"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, LockKeyhole, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Role = "ADMIN" | "SUPERVISOR" | "OPERADOR";
const mockUsers = { gerente: { pass: "admin123", rol: "ADMIN" as const, nombre: "Gerente" }, packing: { pass: "pack123", rol: "SUPERVISOR" as const, nombre: "Jefe de Packing" }, agronomo: { pass: "agro123", rol: "OPERADOR" as const, nombre: "Ingeniero Agrónomo" } };
const roleHome: Record<Role, string> = { ADMIN: "/gerente", SUPERVISOR: "/packing", OPERADOR: "/campo" };

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

  async function handleGoogleLogin() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setToast("Configura Supabase para habilitar Google."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setToast(error.message); setLoading(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setToast("");
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: user, password: pass });
      if (!error && data.user) {
        const { data: profile } = await supabase.from("usuarios").select("rol, nombre").eq("id", data.user.id).single();
        const role = profile?.rol as Role | undefined;
        if (role) { persistRole(role, profile.nombre ?? data.user.email ?? user, user); return; }
      }
      setToast(error?.message ?? "No se encontró un rol asociado a este usuario."); setLoading(false); return;
    }
    const found = mockUsers[user as keyof typeof mockUsers];
    if (!found || found.pass !== pass) { setToast("Usuario o contraseña incorrectos."); setLoading(false); return; }
    persistRole(found.rol, found.nombre, user);
  }

  return <main className="grid min-h-screen bg-stone-50 lg:grid-cols-2"><section className="relative hidden overflow-hidden bg-[#1B4332] lg:block"><div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center opacity-80" /><div className="absolute inset-0 bg-[#1B4332]/65" /><div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-16"><div><p className="font-display text-3xl font-bold">don ricardo<span className="text-[#B7D96B]">.</span></p><p className="mt-2 text-[10px] font-bold uppercase tracking-[.25em] text-white/55">Agrícola Don Ricardo</p></div><div className="max-w-lg"><div className="mb-5 flex h-12 w-12 items-center justify-center bg-[#B7D96B] text-[#1B4332]"><Leaf size={24} /></div><h1 className="font-display text-5xl font-bold leading-[1.05]">La cosecha que llega más lejos.</h1><p className="mt-5 max-w-md text-sm leading-6 text-white/65">Controla la trazabilidad, valida la calidad y coordina cada despacho.</p></div><div className="flex items-center gap-2 text-xs text-white/50"><ShieldCheck size={15} className="text-[#B7D96B]" /> Acceso protegido con Supabase Auth</div></div></section><section className="flex items-center justify-center px-5 py-10 sm:px-10"><motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }} className="w-full max-w-md"><Card className="border-gray-100 bg-white shadow-sm"><CardHeader><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#C9603F]">Portal de operaciones</p><CardTitle className="mt-2 text-3xl">Bienvenido de vuelta</CardTitle><p className="mt-2 text-sm text-gray-500">Ingresa con tu cuenta corporativa.</p></CardHeader><CardContent><Button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"><span className="font-bold text-blue-600">G</span> Continuar con Google</Button><div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-400"><span className="h-px flex-1 bg-gray-200" /> o acceso manual <span className="h-px flex-1 bg-gray-200" /></div><form onSubmit={submit} className="space-y-5"><label className="block text-xs font-bold text-gray-800">Correo o usuario<Input value={user} onChange={(event) => setUser(event.target.value)} className="mt-2" placeholder="correo@empresa.com" autoComplete="username" /></label><label className="block text-xs font-bold text-gray-800">Contraseña<div className="relative mt-2"><LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={pass} onChange={(event) => setPass(event.target.value)} className="pl-9" placeholder="••••••••" type="password" autoComplete="current-password" /></div></label>{toast && <p role="alert" className="text-xs font-semibold text-red-600">{toast}</p>}<Button type="submit" disabled={loading} className="w-full bg-[#1B4332] hover:bg-[#163728]">{loading ? "Validando..." : "Ingresar al panel"}<ArrowRight size={16} /></Button></form><p className="mt-6 text-center text-[11px] text-gray-400">Demo: gerente/admin123 · packing/pack123 · agronomo/agro123</p></CardContent></Card></motion.div></section></main>;
}
