"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, ClipboardCheck, FileCheck2, LayoutDashboard, Leaf, LogOut, Menu, MessageCircle, PackageCheck, ShieldCheck, Truck, UserCog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/store/useTraceabilityStore";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthGate } from "@/features/auth/AuthGate";
import { roleAreas } from "@/features/auth/roles";
import { ProfileMenu } from "@/features/profile/ProfileMenu";

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
  return <Suspense fallback={<div className="min-h-screen bg-[#f8f7f5]" />}><AuthGate><DashboardShell>{children}</DashboardShell></AuthGate></Suspense>;
}

function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const role = profile!.rol;
  const [logoutError, setLogoutError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeTab = searchParams.get("tab");

  async function handleLogout() {
    setLogoutError("");
    try { await signOut(); router.replace("/login"); }
    catch { setLogoutError("No se pudo cerrar sesión. Inténtalo nuevamente."); }
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F5F8F4] text-[#17251D]">
      {mobileOpen && <button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-10 bg-black/30 lg:hidden" />}
      <aside className={cn("w-64 flex-shrink-0 bg-[#1B4332] text-white flex flex-col h-full border-r shadow-lg z-20 transition-transform", mobileOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full", "lg:static lg:translate-x-0")}>
        <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-white/10 px-5">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight">don ricardo<span className="text-[#B7D96B]">.</span></p>
            <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-green-100/70">{roleAreas[role]} · acceso controlado</p>
          </div>
          <button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="text-green-100 lg:hidden"><X size={18} /></button>
        </div>
        <nav aria-label="Menú del rol" className="flex-1 space-y-1 overflow-y-auto px-3 py-7">
          {menus[role].map(({ href, label, icon: Icon }) => { const [hrefPath, query] = href.split("?"); const active = pathname === hrefPath && activeTab === new URLSearchParams(query).get("tab"); return <Link key={href} href={href as Route} onClick={() => setMobileOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-green-100/70 transition hover:bg-green-800/70 hover:text-white", active && "bg-[#B7D96B] text-[#1B4332] hover:bg-[#B7D96B] hover:text-[#1B4332]")}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>; })}
        </nav>
        <button type="button" onClick={() => void handleLogout()} className="flex h-16 flex-shrink-0 items-center gap-3 border-t border-green-800 px-5 text-sm font-semibold text-green-100/70 transition hover:bg-green-800/50 hover:text-white"><LogOut size={17} /> Cerrar Sesión</button>
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-20 flex-shrink-0 items-center justify-between border-b border-[#17251D]/10 bg-white px-3 shadow-sm sm:px-5 lg:px-7">
          <button type="button" aria-label="Abrir menú" onClick={() => setMobileOpen(true)} className="text-gray-700 lg:hidden"><Menu size={22} /></button>
          <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2D6A4F]">AGRÍCOLA DON RICARDO</p><p className="mt-1 text-xs text-[#526157]">Operación Perú · Temporada 2026</p></div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4"><button type="button" aria-label="Ver notificaciones" className="relative rounded-lg p-2 text-[#526157] outline-none transition hover:bg-[#F5F8F4] hover:text-[#1B4332] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"><Bell size={19} /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#C9603F]" /></button><div className="hidden h-8 w-px bg-[#17251D]/10 sm:block" /><ProfileMenu /></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">{logoutError && <p role="alert" className="mb-4 text-red-700">{logoutError}</p>}{children}</main>
      </div>
    </div>
  );
}
