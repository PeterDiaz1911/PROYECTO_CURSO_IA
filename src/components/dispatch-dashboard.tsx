"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { AssistantChat } from "@/components/assistant-chat";
import { LotDetails } from "@/components/lot-details";
import { PackingOrders } from "@/components/packing-orders";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { UserRole } from "@/store/useTraceabilityStore";

export function DispatchDashboard() {
  const [role, setRole] = useState<UserRole>("ADMIN");
  const router = useRouter();
  useEffect(() => { const stored = window.localStorage.getItem("nativa-auth"); if (stored) { try { setRole((JSON.parse(stored) as { rol: UserRole }).rol); } catch { window.localStorage.removeItem("nativa-auth"); } } }, []);
  const showOrders = role !== "OPERADOR";
  return <DashboardLayout><main className="grid-paper min-h-[calc(100vh-5rem)] px-5 py-7 md:px-8 md:py-10"><div className="mx-auto max-w-[1500px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rust">Panel de control · {role}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Trazabilidad y despacho</h1><p className="mt-2 text-sm text-ink/55">Agrícola Don Ricardo · operación sincronizada en tiempo real.</p></div><div className="flex items-center gap-3"><div className="flex items-center gap-2 text-xs font-bold text-forest"><span className="h-2 w-2 rounded-full bg-lime" /> Sistema operativo</div><Button variant="outline" className="h-9 min-h-9 px-2" aria-label="Cerrar sesión" onClick={() => { router.push("/login"); window.setTimeout(() => window.localStorage.removeItem("nativa-auth"), 150); }}><LogOut size={15} /></Button></div></div><div className="grid grid-cols-12 gap-6 items-start"><section className={showOrders ? "col-span-12 xl:col-span-3" : "col-span-12 lg:col-span-5"}><LotDetails readOnly={role !== "ADMIN"} /></section>{showOrders && <section className="col-span-12 xl:col-span-6"><PackingOrders canPrepare={role === "ADMIN"} /></section>}<section className={showOrders ? "col-span-12 xl:col-span-3" : "col-span-12 lg:col-span-7"}><AssistantChat /></section></div></div></main></DashboardLayout>;
}
