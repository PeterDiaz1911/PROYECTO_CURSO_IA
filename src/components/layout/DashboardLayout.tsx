"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, ClipboardCheck, Leaf, Menu, PanelLeft, Settings, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: PanelLeft },
  { href: "/dashboard/lotes", label: "Trazabilidad de Lotes", icon: Leaf },
  { href: "/dashboard/despachos", label: "Órdenes de Despacho", icon: ClipboardCheck },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return <div className="min-h-screen bg-cream text-ink">
    {mobileOpen && <button aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-ink/40 lg:hidden" />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-forest text-white transition-all duration-200 lg:translate-x-0", collapsed && "lg:w-[76px]", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5"><div className={cn("overflow-hidden transition-all", collapsed && "lg:w-0 lg:opacity-0")}><p className="font-display text-2xl font-bold tracking-tight">don ricardo<span className="text-lime">.</span></p><p className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-[.18em] text-white/40">agroexportadora</p></div><button aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="text-white/60 lg:hidden"><X size={20} /></button><button aria-label={collapsed ? "Expandir menú" : "Colapsar menú"} onClick={() => setCollapsed((value) => !value)} className="hidden text-white/50 transition hover:text-white lg:block">{collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}</button></div>
      <nav aria-label="Navegación principal" className="space-y-1 px-3 py-7">{navigation.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href)); return <a key={href} href={href} onClick={() => setMobileOpen(false)} className={cn("group flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white", active && "bg-lime text-forest hover:bg-lime hover:text-forest", collapsed && "lg:justify-center lg:px-0")}><Icon size={18} strokeWidth={1.8} /><span className={cn("whitespace-nowrap transition", collapsed && "lg:hidden")}>{label}</span>{active && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-forest" />}</a>; })}</nav>
      <div className={cn("mt-auto border-t border-white/10 p-4", collapsed && "lg:px-3")}><div className="flex items-center gap-3"><Avatar className="bg-rust"><AvatarFallback>MR</AvatarFallback></Avatar><div className={cn("min-w-0 transition", collapsed && "lg:hidden")}><p className="truncate text-sm font-bold">María Rojas</p><p className="text-xs text-white/45">Operaciones</p></div></div></div>
    </aside>
    <div className={cn("transition-[padding] duration-200 lg:pl-72", collapsed && "lg:pl-[76px]")}><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-ink/10 bg-cream/95 px-5 backdrop-blur md:px-8"><button aria-label="Abrir menú" onClick={() => setMobileOpen(true)} className="text-ink lg:hidden"><Menu size={22} /></button><div className="hidden md:block"><p className="text-xs font-bold uppercase tracking-[.16em] text-rust">Agrícola Don Ricardo</p><p className="mt-1 text-xs text-ink/45">Operación Perú · Temporada 2026</p></div><div className="ml-auto flex items-center gap-4"><button aria-label="Ver notificaciones" className="relative text-ink/55 transition hover:text-forest"><Bell size={19} /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rust" /></button><div className="hidden h-7 w-px bg-ink/10 sm:block" /><div className="flex items-center gap-2"><Avatar className="h-8 w-8 bg-rust"><AvatarFallback>MR</AvatarFallback></Avatar><span className="hidden text-sm font-bold sm:inline">María Rojas</span></div></div></header><main>{children}</main></div>
  </div>;
}
