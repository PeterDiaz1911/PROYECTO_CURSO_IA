"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, ClipboardCheck, FileCheck2, LayoutDashboard, Leaf, LogOut, Menu, MessageCircle, PackageCheck, ShieldCheck, Truck, UserCog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTraceabilityStore, type UserRole } from "@/store/useTraceabilityStore";

const menus: Record<UserRole, { href: string; label: string; icon: typeof Leaf }[]> = {
  OPERADOR: [
    { href: "/campo?tab=registro", label: "Registro de Cosecha", icon: Leaf },
    { href: "/campo?tab=lotes", label: "Mis Lotes Enviados", icon: FileCheck2 },
    { href: "/campo?tab=guias", label: "Guías de Campo", icon: MessageCircle },
  ],
  SUPERVISOR: [
    { href: "/packing?tab=panel", label: "Panel de Empaque", icon: PackageCheck },
    { href: "/packing?tab=recepcion", label: "Recepción de Lotes", icon: ClipboardCheck },
    { href: "/packing?tab=salida", label: "Control de Salida", icon: Truck },
    { href: "/packing?tab=certificados", label: "Certificados", icon: FileCheck2 },
  ],
  ADMIN: [
    { href: "/gerente?tab=panel", label: "Panel General", icon: LayoutDashboard },
    { href: "/gerente?tab=autorizacion", label: "Autorización de Despachos", icon: ShieldCheck },
    { href: "/gerente?tab=auditoria", label: "Auditoría IA", icon: FileCheck2 },
    { href: "/gerente?tab=usuarios", label: "Gestión de Usuarios", icon: UserCog },
  ],
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#f8f7f5]" />}><DashboardShell>{children}</DashboardShell></Suspense>;
}

function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeTab = searchParams.get("tab");

  useEffect(() => {
    const cookieRole = document.cookie.split("; ").find((cookie) => cookie.startsWith("nativa-role="))?.split("=")[1] as UserRole | undefined;
    if (cookieRole === "ADMIN" || cookieRole === "SUPERVISOR" || cookieRole === "OPERADOR") setRole(cookieRole);
    const stored = window.localStorage.getItem("nativa-auth");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { rol?: UserRole };
      if (parsed.rol) setRole(parsed.rol);
    } catch {
      window.localStorage.removeItem("nativa-auth");
    }
  }, []);

  function handleLogout() {
    router.push("/login");
    window.setTimeout(() => {
      useTraceabilityStore.getState().clearStore();
      window.localStorage.removeItem("nativa-auth");
    }, 150);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f7f5]">
      {mobileOpen && <button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-10 bg-black/30 lg:hidden" />}
      <aside className={cn("w-64 flex-shrink-0 bg-[#1B4332] text-white flex flex-col h-full border-r shadow-lg z-20 transition-transform", mobileOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full", "lg:static lg:translate-x-0")}>
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-green-800 px-5">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight">don ricardo<span className="text-[#B7D96B]">.</span></p>
            <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-green-200/60">{role} · acceso controlado</p>
          </div>
          <button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="text-green-100 lg:hidden"><X size={18} /></button>
        </div>
        <nav aria-label="Menú del rol" className="flex-1 space-y-1 overflow-y-auto px-3 py-7">
          {menus[role].map(({ href, label, icon: Icon }) => { const [hrefPath, query] = href.split("?"); const active = pathname === hrefPath && activeTab === new URLSearchParams(query).get("tab"); return <Link key={href} href={href as Route} onClick={() => setMobileOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-green-100/70 transition hover:bg-green-800/70 hover:text-white", active && "bg-[#B7D96B] text-[#1B4332] hover:bg-[#B7D96B] hover:text-[#1B4332]")}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>; })}
        </nav>
        <button type="button" onClick={handleLogout} className="flex h-16 flex-shrink-0 items-center gap-3 border-t border-green-800 px-5 text-sm font-semibold text-green-100/70 transition hover:bg-green-800/50 hover:text-white"><LogOut size={17} /> Cerrar Sesión</button>
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
          <button type="button" aria-label="Abrir menú" onClick={() => setMobileOpen(true)} className="text-gray-700 lg:hidden"><Menu size={22} /></button>
          <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#C9603F]">AGRÍCOLA DON RICARDO</p><p className="mt-1 text-xs text-gray-500">Operación Perú · Temporada 2026</p></div>
          <div className="ml-auto flex items-center gap-4"><button type="button" aria-label="Ver notificaciones" className="relative text-gray-500 transition hover:text-[#1B4332]"><Bell size={19} /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#C9603F]" /></button><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9603F] text-xs font-bold text-white">MR</div><span className="hidden text-sm font-bold text-gray-800 sm:inline">María Rojas</span></div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
