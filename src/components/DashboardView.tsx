"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, ChevronDown, CircleAlert, Leaf, LogOut, Send, ShieldCheck, Truck, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "SUPERVISOR" | "OPERADOR";
type Destination = "USA" | "UE" | "China";
type OrderStatus = "Pendiente" | "En revisión" | "Validada";

type Order = {
  id: string;
  type: string;
  boxes: number;
  weight: string;
  status: OrderStatus;
};

const ordersSeed: Order[] = [
  { id: "ORD-7831", type: "Exportación marítima", boxes: 420, weight: "8,400 kg", status: "Pendiente" },
  { id: "ORD-7827", type: "Retail premium", boxes: 180, weight: "3,600 kg", status: "En revisión" },
  { id: "ORD-7819", type: "Consolidado aéreo", boxes: 96, weight: "1,920 kg", status: "Validada" },
];

const destinationRules: Record<Destination, { label: string; rule: string; lmr: string }> = {
  USA: { label: "Estados Unidos", rule: "USDA / FDA", lmr: "0.50 ppm" },
  UE: { label: "Unión Europea", rule: "MRL UE", lmr: "0.30 ppm" },
  China: { label: "China", rule: "GACC", lmr: "0.50 ppm" },
};

export function DashboardView() {
  const [role, setRole] = useState<Role>("ADMIN");
  const [destination, setDestination] = useState<Destination>("USA");
  const [orders, setOrders] = useState<Order[]>(ordersSeed);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(["Contexto cargado: lote LOT-24091 listo para auditoría."]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedAuth = window.localStorage.getItem("nativa-auth");
    if (!storedAuth) return;
    try {
      const auth = JSON.parse(storedAuth) as { rol?: Role };
      if (auth.rol) setRole(auth.rol);
    } catch {
      window.localStorage.removeItem("nativa-auth");
    }
  }, []);

  const canSeeOrders = role !== "OPERADOR";
  const visibleColumns = canSeeOrders ? "lg:grid-cols-12" : "lg:grid-cols-12";
  const selectedRule = destinationRules[destination];
  const pendingOrders = orders.filter((order) => order.status !== "Validada").length;

  function validateOrder(orderId: string) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: "Validada" } : order));
  }

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    setMessages((current) => [...current, `Consulta: ${trimmedMessage}`, `Normativa ${destination}: ${selectedRule.rule}. El lote se mantiene dentro del contexto proporcionado.`]);
    setMessage("");
  }

  function logout() {
    router.push("/login");
    window.setTimeout(() => window.localStorage.removeItem("nativa-auth"), 150);
  }

  return (
    <main className="min-h-screen bg-stone-50 text-gray-900">
      <div className="flex min-h-screen">
        <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#1B4332] text-white transition-transform lg:static lg:translate-x-0", mobileMenu ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-20 items-center justify-between border-b border-green-800 px-6">
            <div>
              <p className="font-display text-2xl font-bold tracking-tight">don ricardo<span className="text-lime-300">.</span></p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-green-200/60">Agroexportadora</p>
            </div>
            <button type="button" aria-label="Cerrar menú" onClick={() => setMobileMenu(false)} className="text-green-100 lg:hidden">×</button>
          </div>
          <div className="border-b border-green-800 px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-200/60">Sesión activa</p>
            <div className="mt-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C9603F] text-xs font-bold">MR</div><div><p className="text-sm font-bold">María Rojas</p><p className="text-xs text-green-100/60">{role}</p></div></div>
          </div>
          <nav className="space-y-1 px-3 py-7" aria-label="Navegación principal">
            <a href="#resumen" className="flex items-center gap-3 rounded-lg bg-[#B7D96B] px-3 py-3 text-sm font-bold text-[#1B4332]"><Leaf size={17} /> Panel de control</a>
            <a href="#lote" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-green-100/70 transition hover:bg-green-800/60 hover:text-white"><ShieldCheck size={17} /> Detalles del lote</a>
            {canSeeOrders && <a href="#ordenes" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-green-100/70 transition hover:bg-green-800/60 hover:text-white"><Truck size={17} /> Órdenes de empaque</a>}
            <a href="#asistente" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-green-100/70 transition hover:bg-green-800/60 hover:text-white"><Bot size={17} /> Asistente IA</a>
          </nav>
          <button type="button" onClick={logout} className="mt-auto flex items-center gap-3 border-t border-green-800 px-6 py-5 text-sm font-semibold text-green-100/70 transition hover:text-white"><LogOut size={17} /> Cerrar sesión</button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-5 lg:px-8">
            <button type="button" aria-label="Abrir menú" onClick={() => setMobileMenu(true)} className="text-gray-700 lg:hidden">☰</button>
            <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9603F]">Agrícola Don Ricardo</p><p className="mt-1 text-xs text-gray-500">Operación Perú · Temporada 2026</p></div>
            <div className="ml-auto flex items-center gap-4"><button type="button" aria-label="Notificaciones" className="relative text-gray-500 transition hover:text-[#1B4332]"><span className="text-lg">●</span><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#C9603F]" /></button><div className="hidden h-7 w-px bg-gray-200 sm:block" /><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9603F] text-xs font-bold text-white">MR</div><span className="hidden text-sm font-bold text-gray-800 sm:inline">María Rojas</span></div></div>
          </header>

          <div id="resumen" className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-[calc(100vh-5rem)]">
            <div className="col-span-1 flex min-w-0 flex-col gap-6 lg:col-span-12">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9603F]">Miércoles · 17 de septiembre, 2026</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Panel de Control de Trazabilidad</h1><p className="mt-2 text-sm text-gray-500">Supervisa la cadena de suministro y valida cada despacho con precisión.</p></div><div className="flex items-center gap-2 text-xs font-bold text-[#1B4332]"><span className="h-2 w-2 rounded-full bg-green-500" /> Sistema operativo · {role}</div></div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <Card id="lote" className="col-span-3 bg-white shadow-sm border border-gray-100 rounded-xl p-6">
                  <div className="mb-5 flex items-start justify-between border-b border-gray-100 pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9603F]">Lote activo</p><h2 className="mt-2 text-xl font-bold text-gray-900">LOT-24091</h2><p className="mt-1 text-xs text-gray-500">Valle Azul · Ica</p></div><ShieldCheck className="text-[#1B4332]" size={22} /></div>
                  <dl className="divide-y divide-gray-100"><Detail label="Cultivo" value="Arándano Biloxi" /><Detail label="Agroquímico" value="Proclaim Opti 5 SG" /><Detail label="Días transcurridos" value="18 días" /><Detail label="PPM residuales" value="0.42 ppm" /></dl><div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-5"><div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Estado fitosanitario</p><p className="mt-1 text-xs text-gray-500">Última validación: hoy</p></div><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium text-xs">● Revisión</span></div>
                </Card>

                {canSeeOrders && <Card id="ordenes" className="col-span-6 bg-white shadow-sm rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9603F]">Control de salida</p><h2 className="mt-2 text-xl font-bold text-gray-900">Órdenes de empaque</h2><p className="mt-1 text-xs text-gray-500">{pendingOrders} órdenes requieren atención.</p></div><button type="button" onClick={() => setOrders(ordersSeed)} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#163728]"><Truck size={15} /> Nueva orden</button></div>
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-gray-500">Mercado destino</p><label className="relative block sm:w-48"><span className="sr-only">Seleccionar destino</span><select value={destination} onChange={(event) => setDestination(event.target.value as Destination)} className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-[#1B4332] outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10"><option value="USA">USA · USDA / FDA</option><option value="UE">UE · MRL UE</option><option value="China">China · GACC</option></select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#1B4332]" /></label></div>
                  <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="border-b border-gray-100 text-[10px] uppercase tracking-[0.14em] text-gray-400"><tr><th className="px-3 py-3 font-bold">Orden</th><th className="px-3 py-3 font-bold">Carga</th><th className="px-3 py-3 font-bold">Estado</th><th className="px-3 py-3 text-right font-bold">Acción</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-3 py-4"><p className="font-bold text-gray-900">{order.id}</p><p className="mt-1 text-xs text-gray-500">{order.type}</p></td><td className="px-3 py-4 text-xs text-gray-600">{order.boxes} cajas · {order.weight}</td><td className="px-3 py-4"><span className={cn("px-2 py-1 rounded-full font-medium text-xs", order.status === "Validada" ? "bg-green-100 text-green-800" : order.status === "En revisión" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700")}>{order.status}</span></td><td className="px-3 py-4 text-right"><button type="button" onClick={() => validateOrder(order.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-[#1B4332] transition hover:bg-green-50"><Check size={14} /> Validar</button></td></tr>)}</tbody></table></div><div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-5"><p className="text-xs text-gray-500"><strong className="text-gray-900">{orders.filter((order) => order.status === "Validada").length} de {orders.length}</strong> validadas</p><button type="button" disabled={role !== "ADMIN"} className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#163728] disabled:cursor-not-allowed disabled:opacity-40"><Truck size={14} /> Preparar despacho</button></div>
                </Card>}

                <div id="asistente" className={cn("col-span-3 bg-[#1B4332] text-white rounded-xl shadow-lg flex flex-col h-full overflow-hidden", !canSeeOrders && "lg:col-span-4")}>
                  <div className="p-4 border-b border-green-800"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#B7D96B] text-[#1B4332]"><Bot size={20} /></div><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-200">● En línea</span></div><h2 className="mt-6 text-2xl font-bold">Asistente IA</h2><p className="mt-2 text-xs leading-5 text-green-100/60">Auditoría contextual para {destination}.</p></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((item, index) => <div key={`${item}-${index}`} className={cn("rounded-lg p-3 text-xs leading-5", index % 2 === 0 ? "bg-[#2D6A4F]/50 text-green-50" : "ml-5 bg-[#B7D96B] text-[#1B4332]")}>{item}</div>)}<div className="flex items-start gap-2 rounded-lg border border-green-800 bg-green-950/20 p-3 text-xs text-green-200"><CircleAlert size={15} className="mt-0.5 shrink-0" /> Normativa activa: {selectedRule.label} · LMR {selectedRule.lmr}</div></div><form onSubmit={sendMessage} className="p-4"><div className="flex items-center gap-2 rounded-lg border border-green-700 bg-green-950/30 p-1"><label className="sr-only" htmlFor="ai-message">Consultar al asistente</label><input id="ai-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe una consulta..." className="min-w-0 flex-1 bg-transparent border-green-700 text-white placeholder-green-300 px-2 py-2 text-xs outline-none" /><button type="submit" aria-label="Enviar consulta" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#B7D96B] text-[#1B4332] transition hover:bg-white"><Send size={15} /></button></div><p className="mt-3 flex items-center gap-1.5 text-[10px] text-green-200/50"><UserRound size={12} /> Respuestas basadas en el contexto del lote</p></form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 py-4"><dt className="text-sm text-gray-500">{label}</dt><dd className="text-right text-sm font-semibold text-gray-900">{value}</dd></div>;
}
