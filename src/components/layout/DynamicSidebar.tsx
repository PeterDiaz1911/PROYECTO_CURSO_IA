"use client";

import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, LayoutDashboard, Leaf, MessageCircle, PackageCheck, Settings, ShieldCheck, Truck, UserCog, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/store/useTraceabilityStore";

const links: Record<UserRole, { href: string; label: string; icon: typeof Leaf }[]> = {
  OPERADOR: [
    { href: "/campo", label: "Mis Lotes", icon: Leaf },
    { href: "/campo/aplicaciones", label: "Registro de Aplicaciones Fitosanitarias", icon: FileText },
    { href: "/campo/asistente", label: "Chat IA Consulta Rápida", icon: MessageCircle },
  ],
  SUPERVISOR: [
    { href: "/packing", label: "Recepción de Lotes", icon: PackageCheck },
    { href: "/packing/ordenes", label: "Órdenes de Empaque", icon: ClipboardCheck },
    { href: "/packing/destinos", label: "Asignación de Destinos", icon: Truck },
  ],
  ADMIN: [
    { href: "/gerencia", label: "Panel General", icon: LayoutDashboard },
    { href: "/gerencia/despachos", label: "Autorización de Despachos", icon: ShieldCheck },
    { href: "/gerencia/auditoria-ia", label: "Auditoría IA", icon: FileText },
    { href: "/gerencia/usuarios", label: "Gestión de Usuarios", icon: UserCog },
  ],
};

export function DynamicSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  return <aside className="flex w-72 shrink-0 flex-col bg-forest text-white"><div className="border-b border-white/10 px-6 py-7"><p className="font-display text-2xl font-bold">don ricardo<span className="text-lime">.</span></p><p className="mt-1 text-[10px] uppercase tracking-[.2em] text-white/45">{role} · acceso controlado</p></div><nav aria-label="Navegación RBAC" className="space-y-1 px-3 py-7">{links[role].map(({ href, label, icon: Icon }) => <a key={href} href={href} className={cn("flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white", pathname === href && "bg-lime text-forest hover:bg-lime hover:text-forest")}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></a>)}</nav><div className="mt-auto border-t border-white/10 p-5"><div className="flex items-center gap-3 text-xs text-white/55"><Settings size={15} /> Configuración del entorno</div></div></aside>;
}
