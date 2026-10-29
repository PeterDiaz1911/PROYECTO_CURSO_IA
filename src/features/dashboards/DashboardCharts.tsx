"use client";

import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TooltipContentProps } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const chartColors = {
  forest: "#1B4332",
  green: "#2D6A4F",
  sage: "#74A57F",
  lime: "#B7D96B",
  pending: "#D79A27",
  rejected: "#C9603F",
  process: "#4E91A3",
  muted: "#829087",
};

export type LegendItem = { label: string; color: string; value?: string | number };

export function DashboardMetric({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  comparison,
}: {
  label: string;
  value: string | number;
  unit?: string;
  detail: string;
  icon: LucideIcon;
  comparison?: string;
}) {
  return <Card className="h-full rounded-2xl">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#526157]">{label}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-1.5 text-3xl font-bold tabular-nums text-[#17251D]"><span>{value}</span>{unit && <span className="text-sm font-semibold text-[#526157]">{unit}</span>}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8EEE7] text-[#1B4332]"><Icon size={18} /></span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#526157]">{detail}</p>
      {comparison && <p className="mt-1 text-xs font-semibold text-[#526157]">{comparison}</p>}
    </CardContent>
  </Card>;
}

export function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card className="min-w-0 rounded-2xl">
    <CardHeader className="pb-3"><CardTitle>{title}</CardTitle><p className="mt-1 text-xs leading-5 text-[#526157]">{description}</p></CardHeader>
    <CardContent className="min-w-0">{children}</CardContent>
  </Card>;
}

export function ChartLoading({ label = "Cargando datos del gráfico…" }: { label?: string }) {
  return <div role="status" className="grid h-[300px] place-items-center text-sm text-[#526157]">{label}</div>;
}

export function ChartEmpty({ label = "No hay datos suficientes para este período." }: { label?: string }) {
  return <div className="grid h-[300px] place-items-center px-5 text-center text-sm text-[#526157]">{label}</div>;
}

export function ChartError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-5 text-center text-sm text-red-900"><AlertCircle size={20} /><p>{message}</p><Button type="button" variant="outline" className="min-h-9" onClick={onRetry}><RefreshCw size={15} /> Reintentar</Button></div>;
}

export function DashboardLegend({ items }: { items: LegendItem[] }) {
  return <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Leyenda del gráfico">
    {items.map((item) => <li key={item.label} className="flex min-w-0 items-center gap-2 text-xs text-[#526157]"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} /><span>{item.label}</span>{item.value !== undefined && <strong className="tabular-nums text-[#17251D]">{item.value}</strong>}</li>)}
  </ul>;
}

export function DashboardTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number | string, string>>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Record<string, unknown> | undefined;
  const rowHeading = row?.fullLabel ?? row?.label ?? row?.name ?? label ?? "";
  const heading = String(rowHeading);
  return <div className="rounded-lg border border-[#17251D]/10 bg-white px-3 py-2 shadow-lg">
    <p className="text-xs font-semibold text-[#526157]">{heading}</p>
    <div className="mt-1 space-y-1">{payload.map((entry, index) => <p key={`${String(entry.dataKey ?? entry.name)}-${index}`} className="flex items-center gap-2 text-sm text-[#17251D]"><span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color ?? chartColors.green }} /><span>{String(entry.name ?? entry.dataKey ?? "Registros")}:</span><strong className="tabular-nums">{Number(entry.value ?? 0).toLocaleString("es-PE")}</strong></p>)}</div>
  </div>;
}
