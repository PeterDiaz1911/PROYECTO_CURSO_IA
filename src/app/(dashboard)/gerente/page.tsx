"use client";

import type { KeyboardEvent } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Users, X } from "lucide-react";
import { IAAuditorGerencia } from "@/components/ai/IA_AuditorGerencia";
import { GestorDocumental } from "@/components/documentos/GestorDocumental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";
import { GerenciaDashboard } from "@/features/gerencia/GerenciaDashboard";

type Dispatch = { id: string; lote: string; destino: string; cajas: number; veredicto: "Aprobado" | "Rechazado"; estado: "Pendiente de firma" | "Liberado para Puerto" };
const initialDispatches: Dispatch[] = [{ id: "DSP-6008", lote: "LOT-24091", destino: "USA", cajas: 420, veredicto: "Aprobado", estado: "Pendiente de firma" }, { id: "DSP-6005", lote: "LOT-24082", destino: "China", cajas: 280, veredicto: "Aprobado", estado: "Pendiente de firma" }, { id: "DSP-5998", lote: "LOT-24074", destino: "UE", cajas: 180, veredicto: "Rechazado", estado: "Pendiente de firma" }];

function GerenteWorkspace() {
  const tab = useSearchParams().get("tab") ?? "panel";
  const router = useRouter();
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [selected, setSelected] = useState<Dispatch | null>(null);
  const documentos = useTraceabilityStore((state) => state.documentos);
  const selectedTrigger = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) dialog.current?.focus();
    else if (restoreFocus.current) {
      selectedTrigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [selected]);
  function openDispatch(item: Dispatch, trigger: HTMLButtonElement) {
    selectedTrigger.current = trigger;
    setSelected(item);
  }
  function closeDispatch() {
    restoreFocus.current = true;
    setSelected(null);
  }
  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDispatch();
      return;
    }
    if (event.key !== "Tab" || !dialog.current) return;
    const items = dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
      event.preventDefault();
      items[0].focus();
    }
  }
  function approve() { if (!selected || selected.veredicto === "Rechazado") return; const approved = { ...selected, estado: "Liberado para Puerto" as const }; setDispatches((items) => items.map((item) => item.id === selected.id ? approved : item)); setSelected(approved); }
  const authorization = <><p role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">Datos de demostración guardados solo en memoria. Esta vista no carga ni autoriza despachos reales.</p><Card><CardHeader><CardTitle>Despachos pendientes de firma</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-[#526157]"><tr><th className="px-5 py-3">Despacho</th><th className="px-3 py-3">Lote</th><th className="px-3 py-3">Destino</th><th className="px-3 py-3">Cajas</th><th className="px-3 py-3">Resultado de muestra</th><th className="px-5 py-3 text-right">Estado de muestra</th></tr></thead><tbody>{dispatches.map((item) => <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-5 py-4"><button type="button" aria-haspopup="dialog" aria-label={`Abrir detalle de despacho de ejemplo ${item.id}`} onClick={(event) => openDispatch(item, event.currentTarget)} className="font-bold text-[#1B4332] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#2D6A4F]">{item.id}</button></td><td className="px-3 py-4 font-semibold">{item.lote}</td><td className="px-3 py-4">{item.destino}</td><td className="px-3 py-4">{item.cajas}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.veredicto === "Aprobado" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{item.veredicto}</span></td><td className="px-5 py-4 text-right text-xs text-[#526157]">{item.estado}</td></tr>)}</tbody></table></CardContent></Card></>;
  let content: React.ReactNode;
  switch (tab) {
    case "autorizacion": content = authorization; break;
    case "auditoria": content = <IAAuditorGerencia />; break;
    case "usuarios": content = <Card><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><Users className="text-[#1B4332]" size={34} /><h2 className="mt-4 text-lg font-bold">Gestión de Usuarios</h2><p className="mt-2 text-sm text-gray-500">Administración de roles y accesos corporativos.</p></CardContent></Card>; break;
    default: content = <GerenciaDashboard />;
  }
  const isDashboard = !["autorizacion", "auditoria", "usuarios"].includes(tab);
  return <div className="space-y-6">{!isDashboard && <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#2D6A4F]">Gerencia ejecutiva</p><h1 className="mt-2 text-3xl font-bold text-[#17251D]">Supervisión de operaciones</h1><p className="mt-2 text-sm text-[#526157]">Vista activa: {tab} · navegación sin recarga.</p></div>}{content}{selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDispatch(); }}><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="dispatch-dialog-title" tabIndex={-1} onKeyDown={handleDialogKeyDown} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl outline-none"><Card className="rounded-2xl"><CardHeader className="flex flex-row items-start justify-between border-b border-gray-100"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#A4472F]">Detalle de demostración local</p><CardTitle id="dispatch-dialog-title" className="mt-2">{selected.id} · {selected.lote}</CardTitle></div><Button variant="ghost" aria-label="Cerrar detalle" className="h-9 min-h-9 px-2" onClick={closeDispatch}><X size={17} /></Button></CardHeader><CardContent className="space-y-5 p-5"><p role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">Esta vista solo modifica datos de ejemplo en memoria y no autoriza un despacho real.</p><div className="grid grid-cols-2 gap-4"><Info label="Destino" value={selected.destino} /><Info label="Cajas de muestra" value={`${selected.cajas}`} /><Info label="Resultado de muestra" value={selected.veredicto} /></div><GestorDocumental readOnly documentos={documentos} /><Button className="w-full" disabled={selected.veredicto === "Rechazado" || selected.estado === "Liberado para Puerto"} onClick={approve}><Check size={16} /> {selected.estado === "Liberado para Puerto" ? "Marcado liberado (demostración)" : "Marcar como liberado (demostración)"}</Button></CardContent></Card></section></div>}</div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-1 text-sm font-semibold text-gray-800">{value}</p></div>; }
export default function GerentePage() { return <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando gerencia...</div>}><GerenteWorkspace /></Suspense>; }
