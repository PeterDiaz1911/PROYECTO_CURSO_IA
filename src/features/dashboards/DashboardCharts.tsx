"use client";

import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TooltipContentProps } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const chartColors = {
  forest: "var(--chart-primary)",
  green: "var(--chart-green)",
  sage: "var(--chart-sage)",
  lime: "var(--accent-soft)",
  pending: "var(--chart-pending)",
  rejected: "var(--chart-rejected)",
  process: "var(--chart-process)",
  muted: "var(--chart-axis)",
};

export type LegendItem = { label: string; color: string; value?: string | number };

export function DashboardMetric({
  label,
  value,
  unit,
  detail,
  icon: Icon,
  comparison,
  onClick,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  detail: string;
  icon: LucideIcon;
  comparison?: string;
  onClick?: () => void;
  tone?: "approved";
}) {
  const content = <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-secondary">{label}</p>
              <p className="mt-2 flex flex-wrap items-baseline gap-1.5 text-3xl font-bold tabular-nums text-primary"><span>{value}</span>{unit && <span className="text-sm font-semibold text-secondary">{unit}</span>}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === "approved" ? "bg-[#1B4332] text-white" : "bg-[#E8EEE7] text-[#1B4332]"}`}><Icon size={18} /></span>
      </div>
      <p className="mt-3 text-xs leading-5 text-secondary">{detail}</p>
      {comparison && <p className="mt-1 text-xs font-semibold text-secondary">{comparison}</p>}
      {onClick && <button type="button" onClick={onClick} className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2D6A4F]" aria-label={`${label}: ${value}. Filtrar lotes relacionados.`} />}
    </CardContent>
  return <Card className={`relative h-full rounded-2xl ${onClick ? "transition hover:border-[#2D6A4F]/40 hover:shadow-md" : ""}`}>
    {content}
  </Card>;
}

export function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card className="min-w-0 rounded-2xl">
  <CardHeader className="pb-3"><CardTitle>{title}</CardTitle><p className="mt-1 text-xs leading-5 text-secondary">{description}</p></CardHeader>
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
  return <div className="rounded-lg border border-default bg-surface-raised px-3 py-2 shadow-lg">
    <p className="text-xs font-semibold text-secondary">{heading}</p>
    <div className="mt-1 space-y-1">{payload.map((entry, index) => <p key={`${String(entry.dataKey ?? entry.name)}-${index}`} className="flex items-center gap-2 text-sm text-primary"><span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color ?? chartColors.green }} /><span>{String(entry.name ?? entry.dataKey ?? "Registros")}:</span><strong className="tabular-nums">{Number(entry.value ?? 0).toLocaleString("es-PE")}</strong></p>)}</div>
  </div>;
}
