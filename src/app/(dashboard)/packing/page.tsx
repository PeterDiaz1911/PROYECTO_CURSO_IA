"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, PackageCheck } from "lucide-react";
import { IAValidadorPacking } from "@/components/ai/IA_ValidadorPacking";
import { GestorDocumental } from "@/components/documentos/GestorDocumental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtimeLotes } from "@/hooks/useRealtimeLotes";
import { useTraceabilityStore, type Destination } from "@/store/useTraceabilityStore";

function PackingWorkspace() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "recepcion";
  useRealtimeLotes();
  const lotes = useTraceabilityStore((state) => state.lotesCosecha);
  const activeLote = useTraceabilityStore((state) => state.activeLote);
  const documentos = useTraceabilityStore((state) => state.documentos);
  const destination = useTraceabilityStore((state) => state.selectedDestination);
  const setDestination = useTraceabilityStore((state) => state.setDestination);
  const setActiveLote = useTraceabilityStore((state) => state.setActiveLote);
  const [boxes, setBoxes] = useState(420);
  const approved = activeLote.dias >= activeLote.diasRequeridos && activeLote.ppm <= (destination === "UE" ? 0.3 : 0.5);

  function renderTab() {
    switch (tab) {
      case "panel": return <Card><CardHeader><CardTitle>Panel de Empaque</CardTitle><p className="text-xs text-gray-500">Resumen operativo de la planta.</p></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><Metric label="Cajas procesadas" value="1,284" /><Metric label="Lotes recibidos" value={`${lotes.length}`} /><Metric label="Órdenes pendientes" value="06" /></CardContent></Card>;
      case "salida": return <Card><CardHeader><CardTitle>Control de Salida</CardTitle><p className="text-xs text-gray-500">{activeLote.id} · {activeLote.cultivo}</p></CardHeader><CardContent className="space-y-5"><label className="block text-xs font-bold">País de destino<select value={destination} onChange={(event) => setDestination(event.target.value as Destination)} className="mt-2 h-11 w-full border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#1B4332]"><option value="USA">USA</option><option value="UE">Unión Europea</option><option value="China">China</option></select></label><label className="block text-xs font-bold">Cajas a preparar<input type="number" value={boxes} onChange={(event) => setBoxes(Number(event.target.value))} className="mt-2 h-11 w-full border border-gray-200 px-3 text-sm outline-none focus:border-[#1B4332]" /></label><Button disabled={!approved} className="w-full">{approved ? `Emitir orden de ${boxes} cajas` : "Bloqueado por validación fitosanitaria"}</Button></CardContent></Card>;
      case "certificados": return <GestorDocumental readOnly={false} documentos={documentos} />;
      case "recepcion":
      default: return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageCheck size={18} className="text-[#1B4332]" /> Bandeja de Recepción</CardTitle><p className="text-xs text-gray-500">Lotes recién llegados desde campo.</p></CardHeader><CardContent className="space-y-2">{lotes.map((lote) => <button key={lote.id} type="button" onClick={() => setActiveLote(lote)} className={`w-full border p-4 text-left transition ${activeLote.id === lote.id ? "border-[#1B4332] bg-green-50" : "border-gray-100 hover:border-[#1B4332]/40"}`}><div className="flex items-center justify-between"><p className="text-sm font-bold">{lote.id}</p><span className="text-[10px] font-bold text-blue-700">{lote.status}</span></div><p className="mt-2 text-xs text-gray-500">{lote.cultivo} · {lote.fundo}</p></button>)}</CardContent></Card>;
    }
  }

  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-12"><section className="col-span-1 lg:col-span-9"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#C9603F]">Jefe de Packing</p><h1 className="mt-2 text-3xl font-bold">Gestión de empaque</h1><p className="mt-2 text-sm text-gray-500">Vista activa: {tab} · navegación sin recarga.</p></div>{renderTab()}</section><aside className="col-span-1 lg:col-span-3"><IAValidadorPacking /></aside></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border border-gray-100 bg-gray-50 p-5"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#1B4332]">{value}</p></div>; }

export default function PackingPage() { return <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando empaque...</div>}><PackingWorkspace /></Suspense>; }
