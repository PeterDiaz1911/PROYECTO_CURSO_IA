"use client";

import { Beaker, CalendarDays, Droplets, Hash, Leaf, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

export function LotDetails({ readOnly = true }: { readOnly?: boolean }) {
  const lot = useTraceabilityStore((state) => state.activeLote);
  const statusStyles = lot.estado === "Aprobado" || lot.estado === "Óptimo" ? "bg-emerald-100 text-emerald-800" : lot.estado === "Bloqueado" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
  const fields = [[Hash, "ID del lote", lot.id], [Leaf, "Cultivo", lot.cultivo], [Beaker, "Agroquímico", lot.agroquimico], [CalendarDays, "Días transcurridos", `${lot.dias} días`], [Droplets, "PPM residuales", `${lot.ppm} ppm`]] as const;
  return <Card aria-labelledby="lot-details-title"><CardHeader className="border-b border-ink/10"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rust">Lote activo · {lot.fundo}</p><CardTitle id="lot-details-title" className="mt-2 text-xl">Detalles de cosecha</CardTitle><p className="mt-1 text-xs text-ink/50">{readOnly ? "Vista de solo lectura" : "Edición habilitada para administración"}</p></div><ShieldCheck className="text-forest" size={22} /></div></CardHeader><CardContent className="pt-2"><dl className="divide-y divide-ink/10">{fields.map(([Icon, label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-4"><dt className="flex items-center gap-2 text-xs text-ink/55"><Icon size={15} className="text-forest" />{label}</dt><dd className="text-right text-sm font-bold">{value}</dd></div>)}</dl><div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-5"><div><p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Estado fitosanitario</p><p className="mt-1 text-xs text-ink/50">Validación sincronizada</p></div><Badge className={statusStyles}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{lot.estado}</Badge></div></CardContent></Card>;
}
