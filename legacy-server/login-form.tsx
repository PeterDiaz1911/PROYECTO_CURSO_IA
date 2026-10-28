"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

const initialState = { error: undefined };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  return <form action={formAction} className="border border-ink/10 bg-white/75 p-6 shadow-sm shadow-ink/5 sm:p-8"><div className="mb-7"><h1 className="font-display text-2xl font-bold tracking-tight">Iniciar sesión</h1><p className="mt-2 text-sm leading-6 text-ink/55">Accede al panel de control y validación de despacho.</p></div><div className="space-y-5"><label className="block text-xs font-bold text-ink">Correo corporativo<input name="correo" type="email" autoComplete="email" required className="mt-2 w-full border border-ink/15 bg-cream/40 px-3 py-3 text-sm font-normal outline-none focus:border-forest" placeholder="nombre@empresa.com" /></label><label className="block text-xs font-bold text-ink">Contraseña<input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full border border-ink/15 bg-cream/40 px-3 py-3 text-sm font-normal outline-none focus:border-forest" placeholder="••••••••••••" /></label></div>{state.error && <p role="alert" className="mt-4 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{state.error}</p>}<button type="submit" disabled={pending} className="mt-6 flex w-full items-center justify-center bg-forest px-4 py-3 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Validando..." : "Ingresar al panel"}</button><p className="mt-5 text-center text-[11px] text-ink/40">Acceso protegido con BCrypt y sesión segura.</p></form>;
}
