"use client";

import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck, FileCheck2, LayoutDashboard, Leaf, LogOut, Menu, MessageCircle, PackageCheck, ShieldCheck, Truck, UserCog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/store/useTraceabilityStore";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthGate } from "@/features/auth/AuthGate";
import { roleAreas } from "@/features/auth/roles";
import { ProfileMenu } from "@/features/profile/ProfileMenu";

// Pages serves exported HTML directly. Native navigation avoids exposing an RSC
// index.txt response when the static host redirects a client navigation request.
function pageHref(href: string) {
  const [pathname, query] = href.split("?");
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `${basePath}${pathname.replace(/\/$/, "")}/${query ? `?${query}` : ""}`;
}

const menuGroups: Record<UserRole, { label: string; links: { href: string; label: string; icon: typeof Leaf }[] }[]> = {
  OPERADOR: [
    { label: "Operación", links: [
      { href: "/campo?tab=panel", label: "Resumen de Campo", icon: LayoutDashboard },
      { href: "/campo?tab=registro", label: "Registro de Cosecha", icon: Leaf },
    ] },
    { label: "Seguimiento", links: [
      { href: "/campo?tab=lotes", label: "Mis Lotes Enviados", icon: FileCheck2 },
      { href: "/campo?tab=guias", label: "Guías de Campo", icon: MessageCircle },
    ] },
  ],
  SUPERVISOR: [
    { label: "Packing", links: [
      { href: "/packing?tab=panel", label: "Panel de Empaque", icon: PackageCheck },
      { href: "/packing?tab=recepcion", label: "Recepción de Lotes", icon: ClipboardCheck },
    ] },
    { label: "Despacho", links: [
      { href: "/packing?tab=salida", label: "Control de Salida", icon: Truck },
      { href: "/packing?tab=certificados", label: "Certificados", icon: FileCheck2 },
    ] },
  ],
  ADMIN: [
    { label: "Gerencia", links: [
      { href: "/gerente?tab=panel", label: "Panel General", icon: LayoutDashboard },
      { href: "/gerente?tab=autorizacion", label: "Autorización de Despachos", icon: ShieldCheck },
      { href: "/gerente?tab=auditoria", label: "Auditoría IA", icon: FileCheck2 },
    ] },
    { label: "Administración", links: [
      { href: "/gerente?tab=usuarios", label: "Gestión de Usuarios", icon: UserCog },
    ] },
  ],
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-app" />}><AuthGate><DashboardShell>{children}</DashboardShell></AuthGate></Suspense>;
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
    <div className="fixed inset-0 flex h-dvh w-full min-w-0 overflow-hidden bg-app text-primary">
      {mobileOpen && <button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-10 bg-black/30 lg:hidden" />}
      <aside className={cn("relative z-20 flex h-screen w-64 flex-shrink-0 flex-col overflow-hidden border-r border-default bg-menu text-primary shadow-lg transition-transform", mobileOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full", "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0") }>
        <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-default px-5">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-[#1B4332]">don ricardo<span className="text-[#2D6A4F]">.</span></p>
            <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-[#526157]">{roleAreas[role]} · acceso controlado</p>
          </div>
          <button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="text-[#526157] lg:hidden"><X size={18} /></button>
        </div>
        <nav aria-label="Menú del rol" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {menuGroups[role].map((group) => <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{group.label}</p>
            <div className="space-y-1">{group.links.map(({ href, label, icon: Icon }) => { const [hrefPath, query] = href.split("?"); const active = pathname.replace(/\/$/, "") === hrefPath && (activeTab ?? "panel") === new URLSearchParams(query).get("tab"); return <a key={href} href={pageHref(href)} onClick={() => setMobileOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#526157] transition hover:bg-[#F5F8F4] hover:text-[#1B4332]", active && "bg-[#E8EEE7] text-[#1B4332] hover:bg-[#E8EEE7]")}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></a>; })}</div>
          </div>)}
        </nav>
        <button type="button" onClick={() => void handleLogout()} className="flex h-16 flex-shrink-0 items-center gap-3 border-t border-[#17251D]/10 px-5 text-sm font-semibold text-[#526157] transition hover:bg-[#F5F8F4] hover:text-[#1B4332]"><LogOut size={17} /> Cerrar Sesión</button>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-20 flex-shrink-0 items-center justify-between border-b border-default bg-menu px-3 shadow-sm backdrop-blur-sm sm:px-5 lg:px-7">
          <button type="button" aria-label="Abrir menú" onClick={() => setMobileOpen(true)} className="text-gray-700 lg:hidden"><Menu size={22} /></button>
          <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2D6A4F]">AGRÍCOLA DON RICARDO</p><p className="mt-1 text-xs text-[#526157]">Operación Perú · Temporada 2026</p></div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4"><ProfileMenu /></div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6 lg:p-7">
          <div className="mx-auto w-full max-w-[1600px]">{logoutError && <p role="alert" className="mb-4 text-red-700">{logoutError}</p>}{children}</div>
        </main>
      </div>
    </div>
  );
}
