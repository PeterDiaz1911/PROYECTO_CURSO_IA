"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarDays, FileText, Package, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { dashboardSinceDate, dashboardStatuses, getStatusCounts, parseGerenciaDashboard, type DashboardPeriod, type DashboardStatus, type GerenciaDashboardData } from "@/features/gerencia/dashboard-data";

const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "all", label: "Todo el período" },
];

const statusLabels: Record<DashboardStatus, string> = {
  EN_CAMPO: "En campo",
  EN_PACKING: "En Packing",
  PENDIENTE_FIRMA: "Pendiente de firma",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export function GerenciaDashboard() {
  const { client } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [status, setStatus] = useState<DashboardStatus | "all">("all");
  const [data, setData] = useState<GerenciaDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setData(null);
    if (!client) {
      setData(null);
      setError("No está disponible la conexión con Supabase.");
      setLoading(false);
      return;
    }
    try {
      const { data: response, error: requestError } = await client.rpc("gerencia_dashboard", {
        p_desde: dashboardSinceDate(period),
        p_estado: status === "all" ? null : status,
      });
      if (currentRequest !== requestId.current) return;
      if (requestError) {
        setData(null);
        setError("No pudimos cargar los datos de Gerencia. Inténtalo nuevamente.");
        return;
      }
      setData(parseGerenciaDashboard(response));
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setData(null);
      setError(cause instanceof Error ? cause.message : "La respuesta del panel no es válida.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [client, period, status]);

  useEffect(() => { void loadData(); }, [loadData, refresh]);

  const statusCounts = data ? getStatusCounts(data.lotes) : [];
  const approvedCount = data?.lotes.filter((lote) => lote.estado === "APROBADO").length ?? 0;
  const selectedPeriod = periodOptions.find((option) => option.value === period)?.label ?? "Período";

  return (
    <section className="space-y-6" aria-labelledby="gerencia-dashboard-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2D6A4F]">Gerencia ejecutiva</p>
          <h1 id="gerencia-dashboard-title" className="mt-2 text-2xl font-bold tracking-tight text-[#17251D] sm:text-3xl">Panel de operaciones</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526157]">Indicadores calculados a partir de lotes y documentos registrados en Supabase.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11 self-start rounded-xl sm:self-auto" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#17251D]/10 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
        <label className="block text-sm font-semibold text-[#17251D]">
          Período
          <span className="relative mt-2 block">
            <CalendarDays aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" />
            <select value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)} className="min-h-11 w-full appearance-none rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3 text-sm text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20">
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </span>
        </label>
        <label className="block text-sm font-semibold text-[#17251D]">
          Estado del lote
          <select value={status} onChange={(event) => setStatus(event.target.value as DashboardStatus | "all")} className="mt-2 min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20">
            <option value="all">Todos los estados</option>
            {dashboardStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
          </select>
        </label>
      </div>

      {error ? (
        <Card className="rounded-2xl border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-5 text-red-950">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-800" />
            <div><p className="font-bold">No pudimos cargar los datos</p><p className="mt-1 text-sm">{error}</p></div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard icon={Package} label="Total de lotes" value={data ? data.lotes.length.toLocaleString("es-PE") : "—"} hint={`${selectedPeriod} · estado elegido`} loading={loading} />
            <MetricCard icon={FileText} label="Documentos asociados" value={data ? data.documentos.toLocaleString("es-PE") : "—"} hint="Adjuntos a los lotes filtrados" loading={loading} />
            <MetricCard icon={ShieldCheck} label="Lotes aprobados" value={data ? approvedCount.toLocaleString("es-PE") : "—"} hint="Dentro de los filtros aplicados" loading={loading} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3"><CardTitle>Distribución por estado</CardTitle><p className="mt-1 text-xs leading-5 text-[#526157]">Las barras comparan cantidades dentro de los lotes filtrados; denominador: {data?.lotes.length ?? 0} lotes.</p></CardHeader>
              <CardContent className="space-y-4 pb-6">
                {loading && !data ? <p role="status" className="text-sm text-[#526157]">Cargando distribución…</p> : data?.lotes.length === 0 ? <p className="rounded-xl bg-[#F5F8F4] px-4 py-5 text-sm font-medium text-[#526157]">Sin registros para los filtros seleccionados.</p> : statusCounts.map((entry) => {
                  const width = data?.lotes.length ? Math.max(entry.total ? 3 : 0, (entry.total / data.lotes.length) * 100) : 0;
                  return <div key={entry.estado}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-[#17251D]">{statusLabels[entry.estado]}</span>
                      <span className="shrink-0 font-bold tabular-nums text-[#17251D]">{entry.total}</span>
                    </div>
                    <div role="img" aria-label={`${statusLabels[entry.estado]}: ${entry.total} lotes de ${data?.lotes.length ?? 0}`} className="h-2.5 overflow-hidden rounded-full bg-[#E8EEE7]">
                      <div className="h-full rounded-full bg-[#2D6A4F] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${width}%` }} />
                    </div>
                  </div>;
                })}
              </CardContent>
            </Card>

            <Card className="min-w-0 rounded-2xl">
              <CardHeader className="pb-3"><CardTitle>Detalle de lotes</CardTitle><p className="mt-1 text-xs leading-5 text-[#526157]">Registros creados durante el período seleccionado y el estado elegido.</p></CardHeader>
              <CardContent className="p-0">
                {loading && !data ? <p role="status" className="px-6 pb-6 text-sm text-[#526157]">Cargando lotes…</p> : data?.lotes.length === 0 ? <p className="mx-5 mb-5 rounded-xl bg-[#F5F8F4] px-4 py-5 text-sm font-medium text-[#526157]">Sin registros para los filtros seleccionados.</p> : (
                  <div className="max-h-[28rem] overflow-auto">
                    <table className="w-full min-w-[690px] border-collapse text-left text-sm">
                      <caption className="sr-only">Lotes registrados y estado actual</caption>
                      <thead className="sticky top-0 bg-[#F5F8F4] text-xs font-bold uppercase tracking-wide text-[#526157]">
                        <tr><th scope="col" className="px-5 py-3">Lote</th><th scope="col" className="px-4 py-3">Fundo / cultivo</th><th scope="col" className="px-4 py-3">Estado</th><th scope="col" className="px-5 py-3 text-right">Registrado</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[#17251D]/10">
                        {data?.lotes.map((lote) => <tr key={lote.id} className="align-top hover:bg-[#F5F8F4]/70">
                          <td className="px-5 py-4 font-semibold text-[#17251D]">{lote.id}</td>
                          <td className="max-w-56 px-4 py-4"><span className="block truncate font-medium text-[#17251D]">{lote.fundo}</span><span className="mt-1 block truncate text-xs text-[#526157]">{lote.cultivo}</span></td>
                          <td className="px-4 py-4"><span className="inline-flex rounded-full bg-[#E8EEE7] px-2.5 py-1 text-xs font-semibold text-[#1B4332]">{statusLabels[lote.estado]}</span></td>
                          <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-[#526157]">{new Date(lote.created_at).toLocaleDateString("es-PE")}</td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, hint, loading }: { icon: typeof Package; label: string; value: string; hint: string; loading: boolean }) {
  return <Card className="rounded-2xl">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#526157]">{label}</p>
          <p aria-live="polite" className="mt-2 text-3xl font-bold tabular-nums text-[#17251D]">{loading && value === "—" ? "…" : value}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8EEE7] text-[#1B4332]"><Icon size={20} /></span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#526157]">{hint}</p>
    </CardContent>
  </Card>;
}
