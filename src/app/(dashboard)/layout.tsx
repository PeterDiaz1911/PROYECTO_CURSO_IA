"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
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
  const mainRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const main = mainRef.current;
    const menuButton = menuButtonRef.current;
    const previousMainOverflow = main?.style.overflow;
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    closeMenuButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (main) main.style.overflow = previousMainOverflow ?? "";
      menuButton?.focus();
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setLogoutError("");
    try { await signOut(); router.replace("/login"); }
    catch { setLogoutError("No se pudo cerrar sesión. Inténtalo nuevamente."); }
  }

  const navigation = menuGroups[role].map((group) => (
    <div key={group.label}>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#829087]">{group.label}</p>
      <div className="space-y-1">
        {group.links.map(({ href, label, icon: Icon }) => {
          const [hrefPath, query] = href.split("?");
          const active = pathname.replace(/\/$/, "") === hrefPath && (activeTab ?? "panel") === new URLSearchParams(query).get("tab");
          return <a key={href} href={pageHref(href)} onClick={() => setMobileOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#526157] transition hover:bg-[#F5F8F4] hover:text-[#1B4332]", active && "bg-[#E8EEE7] text-[#1B4332] hover:bg-[#E8EEE7]")}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></a>;
        })}
      </div>
    </div>
  ));

  return (
    <div className="fixed inset-0 flex h-dvh w-full min-w-0 overflow-hidden bg-app text-primary">
      <aside className="relative z-20 hidden h-full w-64 flex-shrink-0 flex-col overflow-hidden border-r border-default bg-menu text-primary shadow-lg lg:flex">
        <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-default px-5">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-[#1B4332]">don ricardo<span className="text-[#2D6A4F]">.</span></p>
            <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-[#526157]">{roleAreas[role]} · acceso controlado</p>
          </div>
        </div>
        <nav aria-label="Menú del rol" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {navigation}
        </nav>
        <button type="button" onClick={() => void handleLogout()} className="flex h-16 flex-shrink-0 items-center gap-3 border-t border-[#17251D]/10 px-5 text-sm font-semibold text-[#526157] transition hover:bg-[#F5F8F4] hover:text-[#1B4332]"><LogOut size={17} /> Cerrar Sesión</button>
      </aside>
      <div
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
        className={cn(
          "fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden bg-menu pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl transition-[transform,opacity] duration-300 ease-in-out motion-reduce:transition-none lg:hidden",
          mobileOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-full opacity-0",
        )}
      >
        <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-default px-5">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-[#1B4332]">don ricardo<span className="text-[#2D6A4F]">.</span></p>
            <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-[#526157]">{roleAreas[role]} · acceso controlado</p>
          </div>
          <button ref={closeMenuButtonRef} type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-[#526157] transition hover:bg-[#F5F8F4]"><X size={22} /></button>
        </div>
        <nav aria-label="Menú del rol" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {navigation}
        </nav>
        <button type="button" onClick={() => { setMobileOpen(false); void handleLogout(); }} className="flex h-16 flex-shrink-0 items-center gap-3 border-t border-[#17251D]/10 px-5 text-sm font-semibold text-[#526157] transition hover:bg-[#F5F8F4] hover:text-[#1B4332]"><LogOut size={17} /> Cerrar Sesión</button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-20 flex-shrink-0 items-center justify-between border-b border-default bg-menu px-3 shadow-sm backdrop-blur-sm sm:px-5 lg:px-7">
          <button ref={menuButtonRef} type="button" aria-label="Abrir menú" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(true)} className="text-gray-700 lg:hidden"><Menu size={22} /></button>
          <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2D6A4F]">AGRÍCOLA DON RICARDO</p><p className="mt-1 text-xs text-[#526157]">Operación Perú · Temporada 2026</p></div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4"><ProfileMenu /></div>
        </header>
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6 lg:p-7">
          <div className="mx-auto w-full max-w-[1600px]">{logoutError && <p role="alert" className="mb-4 text-red-700">{logoutError}</p>}{children}</div>
        </main>
      </div>
    </div>
  );
}
