"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

type DispatchOption = { id: string; lote: string; destino: string; cajas: number; veredicto: "APROBADO" | "RECHAZADO" };
const dispatches: DispatchOption[] = [
  { id: "DSP-6008", lote: "LOT-24091", destino: "USA", cajas: 420, veredicto: "APROBADO" },
  { id: "DSP-6005", lote: "LOT-24082", destino: "China", cajas: 280, veredicto: "APROBADO" },
  { id: "DSP-5998", lote: "LOT-24074", destino: "UE", cajas: 180, veredicto: "RECHAZADO" },
];

export function IAAuditorGerencia() {
  const activeLote = useTraceabilityStore((state) => state.activeLote);
  const [selectedId, setSelectedId] = useState(dispatches[0].id);
  const selected = useMemo(() => dispatches.find((item) => item.id === selectedId) ?? dispatches[0], [selectedId]);
  const approved = selected.veredicto === "APROBADO";
  const systemPrompt = `Eres un auditor estricto. Revisa si ${activeLote.agroquimico} y ${activeLote.dias} días de carencia cumplen con el LMR de ${selected.destino}. Responde con 3 viñetas y un veredicto APROBADO o RECHAZADO.`;

  return <Card className="border-gray-100 shadow-sm"><CardHeader className="border-b border-gray-100"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1B4332] text-[#B7D96B]"><ShieldCheck size={20} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C9603F]">IA exclusiva de gerencia</p><CardTitle className="mt-1">Auditoría final</CardTitle></div></div></CardHeader><CardContent className="grid gap-6 p-6 lg:grid-cols-[240px_1fr]"><label className="text-xs font-bold text-gray-700">Despacho pendiente<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-11 w-full border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#1B4332]">{dispatches.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.destino}</option>)}</select></label><div className={`rounded-xl border p-5 ${approved ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}><div className="flex items-center gap-3">{approved ? <CheckCircle2 className="text-green-600" size={22} /> : <AlertTriangle className="text-red-600" size={22} />}<div><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Dictamen fitosanitario automático</p><p className={`mt-1 text-lg font-bold ${approved ? "text-green-800" : "text-red-800"}`}>{selected.veredicto}</p></div></div><ul className="mt-5 space-y-2 text-sm text-gray-700"><li>• Lote: {selected.lote} · {activeLote.cultivo}</li><li>• Destino: {selected.destino} · {selected.cajas} cajas</li><li>• {approved ? "No se identifican alertas rojas en el expediente." : "Existe riesgo de retención; requiere revisión antes de firmar."}</li></ul><p className="mt-5 border-t border-black/10 pt-4 text-[10px] text-gray-500">System Prompt activo: {systemPrompt}</p></div></CardContent></Card>;
}
