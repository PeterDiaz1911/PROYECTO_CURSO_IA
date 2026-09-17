"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTraceabilityStore, type Destination } from "@/store/useTraceabilityStore";

export function PackingOrders({ canPrepare = false }: { canPrepare?: boolean }) {
  const orders = useTraceabilityStore((state) => state.orders);
  const destination = useTraceabilityStore((state) => state.selectedDestination);
  const setDestination = useTraceabilityStore((state) => state.setDestination);
  const validateOrders = useTraceabilityStore((state) => state.validateOrders);
  const [query, setQuery] = useState("");
  const visibleOrders = useMemo(() => orders.filter((order) => `${order.id} ${order.tipo}`.toLowerCase().includes(query.toLowerCase())), [orders, query]);
  return <Card aria-labelledby="packing-title"><CardHeader className="border-b border-ink/10"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rust">Control de salida</p><CardTitle id="packing-title" className="mt-2 text-xl">Órdenes de empaque</CardTitle><p className="mt-1 text-xs text-ink/50">Destino sincronizado con el asistente IA.</p></div><Button variant="outline" onClick={validateOrders}><Check size={15} /> Validar lote</Button></div><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_190px]"><label className="relative"><span className="sr-only">Buscar orden</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar orden" className="pl-9" /></label><label className="relative"><span className="sr-only">Destino</span><select value={destination} onChange={(event) => setDestination(event.target.value as Destination)} className="h-10 w-full appearance-none border border-forest/20 bg-lime/15 px-3 text-xs font-bold text-forest outline-none focus:border-forest"><option value="USA">Destino: USA</option><option value="UE">Destino: UE</option><option value="China">Destino: China</option></select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-forest" /></label></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-ink/[.025] text-[10px] uppercase tracking-[.14em] text-ink/45"><tr><th className="px-5 py-3">Orden</th><th className="px-4 py-3">Carga</th><th className="px-4 py-3">Estado</th><th className="px-5 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y divide-ink/10">{visibleOrders.map((order) => <tr key={order.id} className="text-sm hover:bg-lime/10"><td className="px-5 py-4"><p className="font-bold">{order.id}</p><p className="mt-1 text-xs text-ink/50">{order.tipo}</p></td><td className="px-4 py-4 text-xs">{order.cajas} cajas · {order.peso}</td><td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-current" />{order.estado}</span></td><td className="px-5 py-4 text-right">{canPrepare && <Button variant="ghost" className="h-9 min-h-9 px-2 text-xs"><Truck size={14} /> Preparar</Button>}</td></tr>)}</tbody></table></div></CardContent></Card>;
}
