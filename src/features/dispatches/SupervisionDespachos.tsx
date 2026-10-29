"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownWideNarrow, Check, ChevronLeft, ChevronRight, Clock3, FileCheck2, FileText, Package, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";

type DispatchState = "PENDIENTE_FIRMA" | "APROBADO" | "RECHAZADO";
type OperationStatus = "EN_CAMPO" | "EN_PACKING" | "PENDIENTE_FIRMA" | "APROBADO" | "RECHAZADO";
type OperationLot = { id: string; fundo: string; cultivo: string; estado: OperationStatus; created_at: string };
type DispatchDocument = { storage_path: string; nombre_archivo: string; mime_type: string; size_bytes: number };
type DispatchRow = {
  id: string;
  codigo: string;
  lote_id: string;
  destino: string;
  cajas: number;
  estado: DispatchState;
  created_at: string;
  revisado_at: string | null;
  motivo_revision: string | null;
  lot?: { fundo: string; cultivo: string };
  document?: DispatchDocument;
};

const stateLabels: Record<DispatchState, string> = {
  PENDIENTE_FIRMA: "Pendiente de revisión",
  APROBADO: "Aprobado y liberado",
  RECHAZADO: "Requiere corrección",
};
const operationStatusLabels: Record<OperationStatus, string> = {
  EN_CAMPO: "En campo",
  EN_PACKING: "En Packing",
  PENDIENTE_FIRMA: "Pendiente de firma",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};
const operationStatusColors: Record<OperationStatus, string> = {
  EN_CAMPO: "#2D6A4F",
  EN_PACKING: "#4E91A3",
  PENDIENTE_FIRMA: "#D79A27",
  APROBADO: "#6E9F46",
  RECHAZADO: "#C9603F",
};
const operationStates = Object.keys(operationStatusLabels) as OperationStatus[];

export function SupervisionDespachos() {
  const { client } = useAuth();
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [operationLots, setOperationLots] = useState<OperationLot[]>([]);
  const [operationError, setOperationError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [signedUrl, setSignedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DispatchState | "ALL">("ALL");
  const [dateOrder, setDateOrder] = useState<"newest" | "oldest">("newest");
  const [operationQuery, setOperationQuery] = useState("");
  const [operationStatus, setOperationStatus] = useState<OperationStatus | "ALL">("ALL");
  const [operationDateOrder, setOperationDateOrder] = useState<"newest" | "oldest">("newest");
  const [operationPage, setOperationPage] = useState(1);
  const selected = dispatches.find((item) => item.id === selectedId) ?? null;

  const loadDispatches = useCallback(async () => {
    if (!client) {
      setError("No está disponible la conexión con Supabase.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setOperationError("");
    const [dispatchResult, operationResult] = await Promise.all([
      client.from("despachos")
        .select("id,codigo,lote_id,destino,cajas,estado,created_at,revisado_at,motivo_revision")
        .order("created_at", { ascending: false }),
      client.from("lotes")
        .select("id,fundo,cultivo,estado,created_at")
        .order("created_at", { ascending: false }),
    ]);
    const { data, error: dispatchError } = dispatchResult;
    if (operationResult.error) {
      setOperationLots([]);
      setOperationError(`No se pudieron cargar los lotes de operación: ${operationResult.error.message}`);
    } else {
      setOperationLots((operationResult.data ?? []) as OperationLot[]);
    }
    if (dispatchError) {
      setError(`No se pudieron cargar los despachos: ${dispatchError.message}`);
      setDispatches([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Omit<DispatchRow, "lot" | "document">[];
    const ids = [...new Set(rows.map((item) => item.lote_id))];
    const dispatchIds = rows.map((item) => item.id);
    const [lotResult, documentResult] = ids.length ? await Promise.all([
      client.from("lotes").select("id,fundo,cultivo").in("id", ids),
      client.from("despacho_documentos").select("despacho_id,storage_path,nombre_archivo,mime_type,size_bytes").in("despacho_id", dispatchIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];

    if (lotResult.error || documentResult.error) {
      setError(`Se cargó la lista, pero faltan datos relacionados: ${lotResult.error?.message ?? documentResult.error?.message}`);
      setDispatches(rows);
      setLoading(false);
      return;
    }
    const lots = new Map((lotResult.data ?? []).map((lot) => [lot.id, lot]));
    const documents = new Map((documentResult.data ?? []).map((document) => [document.despacho_id, document]));
    setDispatches(rows.map((item) => ({
      ...item,
      lot: lots.get(item.lote_id),
      document: documents.get(item.id),
    })));
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void loadDispatches();
    if (!client) return;
    const channel = client.channel("despachos-supervision")
      .on("postgres_changes", { event: "*", schema: "public", table: "despachos" }, () => { void loadDispatches(); })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, loadDispatches]);

  const counts = useMemo(() => ({
    total: dispatches.length,
    pending: dispatches.filter((item) => item.estado === "PENDIENTE_FIRMA").length,
    approved: dispatches.filter((item) => item.estado === "APROBADO").length,
    rejected: dispatches.filter((item) => item.estado === "RECHAZADO").length,
  }), [dispatches]);
  const operationCounts = useMemo(() => operationStates.map((estado) => ({
    estado,
    total: operationLots.filter((lot) => lot.estado === estado).length,
  })), [operationLots]);
  const operationTotal = operationLots.length;
  let chartAngle = 0;
  const pieSegments = operationCounts.map(({ estado, total }) => {
    const start = chartAngle;
    chartAngle += operationTotal ? (total / operationTotal) * 360 : 0;
    return `${operationStatusColors[estado]} ${start}deg ${chartAngle}deg`;
  });
  const pieBackground = operationTotal
    ? `conic-gradient(${pieSegments.join(", ")})`
    : "conic-gradient(#E8EEE7 0deg 360deg)";

  const visibleDispatches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return dispatches
      .filter((item) => {
        const searchable = [item.codigo, item.lote_id, item.destino, item.lot?.fundo, item.lot?.cultivo]
          .some((value) => value?.toLocaleLowerCase("es").includes(normalizedQuery));
        return (!normalizedQuery || searchable) && (statusFilter === "ALL" || item.estado === statusFilter);
      })
      .sort((left, right) => {
        const difference = Date.parse(left.created_at) - Date.parse(right.created_at);
        return dateOrder === "newest" ? -difference : difference;
      });
  }, [dispatches, query, statusFilter, dateOrder]);

  const visibleOperationLots = useMemo(() => {
    const normalizedQuery = operationQuery.trim().toLocaleLowerCase("es");
    return operationLots.filter((lot) => {
      const matchesQuery = !normalizedQuery || [lot.id, lot.fundo, lot.cultivo, operationStatusLabels[lot.estado]]
        .some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery));
      return matchesQuery && (operationStatus === "ALL" || lot.estado === operationStatus);
    }).sort((left, right) => {
      const difference = Date.parse(left.created_at) - Date.parse(right.created_at);
      return operationDateOrder === "newest" ? -difference : difference;
    });
  }, [operationLots, operationQuery, operationStatus, operationDateOrder]);
  const operationPageSize = 10;
  const operationPageCount = Math.max(1, Math.ceil(visibleOperationLots.length / operationPageSize));
  const currentOperationPage = Math.min(operationPage, operationPageCount);
  const pagedOperationLots = visibleOperationLots.slice(
    (currentOperationPage - 1) * operationPageSize,
    currentOperationPage * operationPageSize,
  );

  useEffect(() => { setOperationPage(1); }, [operationQuery, operationStatus, operationDateOrder]);

  async function createDocumentLink(item: DispatchRow) {
    if (!client || !item.document) return;
    setError("");
    const { data, error: urlError } = await client.storage.from("despacho-documentos").createSignedUrl(item.document.storage_path, 120);
    if (urlError) {
      setError(`No se pudo preparar el acceso privado al informe: ${urlError.message}`);
      return;
    }
    setSignedUrl(data.signedUrl);
  }

  async function resolve(approve: boolean) {
    if (!client || !selected) return;
    if (!approve && reviewNote.trim().length < 5) {
      setError("Escribe un motivo de al menos 5 caracteres para devolver el expediente.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const { error: requestError } = await client.rpc("resolver_despacho", {
      p_despacho_id: selected.id,
      p_aprobar: approve,
      p_motivo: reviewNote.trim() || null,
    });
    if (requestError) {
      setError(`No se pudo registrar la decisión: ${requestError.message}`);
      setBusy(false);
      return;
    }
    setNotice(`${selected.codigo}: ${approve ? "aprobado y liberado" : "devuelto a Packing con observaciones"}.`);
    setSelectedId(null);
    setReviewNote("");
    setSignedUrl("");
    await loadDispatches();
    setBusy(false);
  }

  return <section className="space-y-5" aria-labelledby="dispatch-review-title">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2D6A4F]">Flujo operativo real</p><h2 id="dispatch-review-title" className="mt-2 text-2xl font-bold text-[#17251D]">Revisión de despachos</h2><p className="mt-2 text-sm text-[#526157]">Expedientes enviados desde Packing, con informes privados y trazabilidad de la decisión.</p></div>
      <Button type="button" variant="outline" onClick={() => void loadDispatches()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar</Button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Summary label="Despachos" value={counts.total} icon={FileCheck2} />
      <Summary label="Lotes bajo supervisión" value={operationTotal} icon={Package} />
      <Summary label="Pendientes" value={counts.pending} icon={Clock3} tone="amber" />
      <Summary label="Aprobados" value={counts.approved} icon={Check} tone="green" />
      <Summary label="Devueltos" value={counts.rejected} icon={AlertCircle} tone="red" />
    </div>

    <Card>
      <CardHeader className="pb-3"><CardTitle>Estado de expedientes</CardTitle><p className="mt-1 text-xs text-[#526157]">Distribución de todos los despachos cargados desde Supabase.</p></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {(["PENDIENTE_FIRMA", "APROBADO", "RECHAZADO"] as const).map((state) => {
          const value = dispatches.filter((item) => item.estado === state).length;
          const percentage = counts.total ? (value / counts.total) * 100 : 0;
          const color = state === "APROBADO" ? "bg-green-700" : state === "RECHAZADO" ? "bg-red-600" : "bg-amber-500";
          return <div key={state}>
            <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-[#17251D]">{stateLabels[state]}</span><span className="tabular-nums text-[#526157]">{value} · {Math.round(percentage)}%</span></div>
            <div role="img" aria-label={`${stateLabels[state]}: ${value} de ${counts.total}`} className="h-2 overflow-hidden rounded-full bg-[#E8EEE7]"><div className={`h-full ${color}`} style={{ width: `${percentage}%` }} /></div>
          </div>;
        })}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3"><CardTitle>Distribución de lotes por estado</CardTitle><p className="mt-1 text-xs text-[#526157]">Vista general de los lotes reales registrados en Supabase: {operationTotal} en total.</p></CardHeader>
      <CardContent>
        {operationError ? <p role="alert" className="text-sm text-red-800">{operationError}</p> : operationTotal === 0 && loading ? <p role="status" className="text-sm text-[#526157]">Cargando estados de lote…</p> : operationTotal === 0 ? <p className="text-sm text-[#526157]">No hay lotes registrados para graficar.</p> : <div className="grid items-center gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="mx-auto grid h-48 w-48 place-items-center rounded-full" role="img" aria-label={`Gráfico circular: distribución de ${operationTotal} lotes por estado`} style={{ background: pieBackground }}>
            <div className="grid h-28 w-28 place-content-center rounded-full bg-white text-center shadow-inner"><span className="text-2xl font-bold tabular-nums text-[#17251D]">{operationTotal}</span><span className="text-[10px] font-semibold uppercase text-[#526157]">lotes</span></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {operationCounts.map(({ estado, total }) => <div key={estado} className="flex min-w-0 items-center gap-3 border-b border-gray-100 pb-2">
              <span aria-hidden="true" className="h-3 w-3 shrink-0" style={{ backgroundColor: operationStatusColors[estado] }} />
              <span className="min-w-0 flex-1 truncate text-sm text-[#526157]">{operationStatusLabels[estado]}</span>
              <span className="text-sm font-bold tabular-nums text-[#17251D]">{total}</span>
              <span className="w-10 text-right text-xs tabular-nums text-gray-500">{Math.round((total / operationTotal) * 100)}%</span>
            </div>)}
          </div>
        </div>}
      </CardContent>
    </Card>

    {error && <Card className="border-red-200 bg-red-50 shadow-none"><CardContent className="p-4 text-sm text-red-900">{error}</CardContent></Card>}
    {notice && <Card className="border-green-200 bg-green-50 shadow-none"><CardContent className="p-4 text-sm text-green-900">{notice}</CardContent></Card>}
    <Card>
      <CardHeader className="pb-3"><CardTitle>Expedientes enviados por Packing</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading && dispatches.length === 0 ? <p role="status" className="px-5 pb-5 text-sm text-[#526157]">Cargando despachos…</p> : dispatches.length === 0 ? <div className="px-5 pb-7 text-center"><FileText size={23} className="mx-auto text-gray-400" /><p className="mt-3 text-sm font-semibold text-[#17251D]">Aún no hay despachos enviados</p><p className="mt-1 text-xs text-[#526157]">Los expedientes aparecerán aquí cuando Packing los envíe.</p></div> : <>
          <div className="grid gap-3 border-y border-gray-100 bg-[#F5F8F4]/60 p-4 sm:grid-cols-[minmax(220px,1fr)_200px_200px]">
            <label className="relative block"><span className="sr-only">Buscar despachos</span><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código, lote, fundo…" className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" /></label>
            <label><span className="sr-only">Filtrar por estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DispatchState | "ALL")} className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="ALL">Todos los estados</option><option value="PENDIENTE_FIRMA">Pendientes</option><option value="APROBADO">Aprobados</option><option value="RECHAZADO">Devueltos</option></select></label>
            <label className="relative"><span className="sr-only">Ordenar por fecha</span><ArrowDownWideNarrow size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><select value={dateOrder} onChange={(event) => setDateOrder(event.target.value as "newest" | "oldest")} className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="newest">Más recientes primero</option><option value="oldest">Más antiguos primero</option></select></label>
          </div>
          {visibleDispatches.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#526157]">No hay despachos que coincidan con esos filtros.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[790px] text-left text-sm">
            <thead className="border-y border-gray-100 bg-[#F5F8F4] text-[10px] uppercase tracking-wider text-[#526157]"><tr><th className="px-5 py-3">Despacho / lote</th><th className="px-3 py-3">Destino</th><th className="px-3 py-3">Cajas</th><th className="px-3 py-3">Informe</th><th className="px-3 py-3">Estado</th><th className="px-5 py-3 text-right">Detalle</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{visibleDispatches.map((item) => <tr key={item.id} className="hover:bg-[#F5F8F4]/70">
              <td className="px-5 py-4"><p className="font-bold text-[#1B4332]">{item.codigo}</p><p className="mt-1 text-xs text-[#526157]">{item.lot?.fundo ?? "Lote"} · {item.lot?.cultivo ?? item.lote_id}</p><p className="mt-1 text-[11px] text-gray-400">{new Date(item.created_at).toLocaleString("es-PE")}</p></td>
              <td className="px-3 py-4">{item.destino}</td><td className="px-3 py-4 tabular-nums">{item.cajas.toLocaleString("es-PE")}</td>
              <td className="px-3 py-4">{item.document ? <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4332]"><FileText size={14} /> Adjuntado</span> : <span className="text-xs text-red-700">Falta informe</span>}</td>
              <td className="px-3 py-4"><span className={`inline-flex px-2.5 py-1 text-xs font-semibold ${item.estado === "APROBADO" ? "bg-green-100 text-green-800" : item.estado === "RECHAZADO" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>{stateLabels[item.estado]}</span></td>
              <td className="px-5 py-4 text-right"><Button type="button" variant="outline" className="min-h-9" onClick={() => { setSelectedId(item.id); setReviewNote(""); setSignedUrl(""); setError(""); }}>Revisar</Button></td>
            </tr>)}</tbody>
          </table></div>
          )}
        </>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3"><CardTitle>Operaciones por lote</CardTitle><p className="mt-1 text-xs text-[#526157]">Seguimiento del estado real de cada lote, aunque todavía no tenga un despacho enviado.</p></CardHeader>
      <CardContent className="p-0">
        {operationError ? <p className="px-5 pb-5 text-sm text-red-800">{operationError}</p> : operationLots.length === 0 && loading ? <p role="status" className="px-5 pb-5 text-sm text-[#526157]">Cargando lotes…</p> : operationLots.length === 0 ? <p className="px-5 pb-7 text-sm text-[#526157]">No hay lotes registrados.</p> : <>
          <div className="grid gap-3 border-y border-gray-100 bg-[#F5F8F4]/60 p-4 sm:grid-cols-[minmax(220px,1fr)_210px_200px]">
            <label className="relative block"><span className="sr-only">Buscar operaciones</span><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><input type="search" value={operationQuery} onChange={(event) => setOperationQuery(event.target.value)} placeholder="Buscar lote, fundo o cultivo…" className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" /></label>
            <label><span className="sr-only">Filtrar operaciones por estado</span><select value={operationStatus} onChange={(event) => setOperationStatus(event.target.value as OperationStatus | "ALL")} className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="ALL">Todos los estados</option>{operationStates.map((estado) => <option key={estado} value={estado}>{operationStatusLabels[estado]}</option>)}</select></label>
            <label className="relative block"><span className="sr-only">Ordenar operaciones por fecha</span><ArrowDownWideNarrow size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><select value={operationDateOrder} onChange={(event) => setOperationDateOrder(event.target.value as "newest" | "oldest")} className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="newest">Más recientes primero</option><option value="oldest">Más antiguos primero</option></select></label>
          </div>
          {visibleOperationLots.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#526157]">No hay lotes que coincidan con los filtros.</p> : <>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-y border-gray-100 bg-[#F5F8F4] text-[10px] uppercase tracking-wider text-[#526157]"><tr><th className="px-5 py-3">Lote</th><th className="px-3 py-3">Fundo</th><th className="px-3 py-3">Cultivo</th><th className="px-3 py-3">Estado</th><th className="px-5 py-3 text-right">Registrado</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{pagedOperationLots.map((lot) => <tr key={lot.id} className="hover:bg-[#F5F8F4]/70"><td className="px-5 py-4 font-semibold text-[#17251D]">{lot.id}</td><td className="px-3 py-4">{lot.fundo}</td><td className="px-3 py-4">{lot.cultivo}</td><td className="px-3 py-4"><span className="inline-flex items-center gap-2 text-xs font-semibold text-[#17251D]"><span className="h-2.5 w-2.5" style={{ backgroundColor: operationStatusColors[lot.estado] }} />{operationStatusLabels[lot.estado]}</span></td><td className="whitespace-nowrap px-5 py-4 text-right text-xs text-[#526157]">{new Date(lot.created_at).toLocaleDateString("es-PE")}</td></tr>)}</tbody>
          </table></div>
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#526157]">Mostrando {(currentOperationPage - 1) * operationPageSize + 1}–{Math.min(currentOperationPage * operationPageSize, visibleOperationLots.length)} de {visibleOperationLots.length} lotes</p><div className="flex items-center gap-2"><Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" aria-label="Página anterior de lotes" onClick={() => setOperationPage((value) => Math.max(1, value - 1))} disabled={currentOperationPage === 1}><ChevronLeft size={15} /> Anterior</Button><span className="min-w-16 text-center text-xs tabular-nums text-[#526157]">{currentOperationPage} / {operationPageCount}</span><Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" aria-label="Página siguiente de lotes" onClick={() => setOperationPage((value) => Math.min(operationPageCount, value + 1))} disabled={currentOperationPage >= operationPageCount}>Siguiente <ChevronRight size={15} /></Button></div></div>
          </>}
        </>}
      </CardContent>
    </Card>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="dispatch-dialog-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 p-5"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#2D6A4F]">Revisión administrativa</p><h3 id="dispatch-dialog-title" className="mt-2 text-xl font-bold text-[#17251D]">{selected.codigo}</h3></div><Button type="button" variant="ghost" className="min-h-9 px-2" aria-label="Cerrar detalle" onClick={() => setSelectedId(null)}><X size={17} /></Button></header>
        <div className="space-y-5 p-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2"><Info label="Lote" value={`${selected.lot?.fundo ?? ""} · ${selected.lot?.cultivo ?? selected.lote_id}`} /><Info label="Destino" value={selected.destino} /><Info label="Cajas" value={selected.cajas.toLocaleString("es-PE")} /><Info label="Enviado" value={new Date(selected.created_at).toLocaleString("es-PE")} /></dl>
          {selected.document ? <div className="border border-gray-200 p-4"><p className="text-sm font-bold text-[#17251D]">{selected.document.nombre_archivo}</p><p className="mt-1 text-xs text-[#526157]">{(selected.document.size_bytes / 1024 / 1024).toFixed(2)} MB · acceso privado temporal</p><div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" className="min-h-9" onClick={() => void createDocumentLink(selected)}><FileText size={15} /> Preparar descarga segura</Button>{signedUrl && <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#1B4332] underline">Abrir informe</a>}</div></div> : <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-900">Este expediente no tiene un informe asociado; no puede aprobarse.</p>}
          {selected.estado !== "PENDIENTE_FIRMA" ? <div className="border border-gray-200 bg-[#F5F8F4] p-4 text-sm"><p className="font-semibold">{stateLabels[selected.estado]}</p>{selected.motivo_revision && <p className="mt-2 text-[#526157]">Motivo: {selected.motivo_revision}</p>}{selected.revisado_at && <p className="mt-2 text-xs text-gray-500">Revisado {new Date(selected.revisado_at).toLocaleString("es-PE")}</p>}</div> : <>
            <label className="block text-sm font-semibold text-[#17251D]">Observación de revisión<textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={500} rows={3} placeholder="Obligatoria para devolver a Packing…" className="mt-2 w-full resize-y rounded-xl border border-gray-200 p-3 text-sm font-normal outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" /></label>
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row"><Button type="button" variant="outline" disabled={busy || !selected.document} onClick={() => void resolve(false)}><X size={15} /> Devolver a Packing</Button><Button type="button" disabled={busy || !selected.document} onClick={() => void resolve(true)}><ShieldCheck size={15} /> Aprobar y liberar</Button></div>
          </>}
        </div>
      </section>
    </div>}
  </section>;
}

function Summary({ label, value, icon: Icon, tone = "forest" }: { label: string; value: number; icon: typeof FileCheck2; tone?: "forest" | "amber" | "green" | "red" }) {
  const tones = { forest: "bg-[#E8EEE7] text-[#1B4332]", amber: "bg-amber-100 text-amber-900", green: "bg-green-100 text-green-900", red: "bg-red-100 text-red-900" };
  return <Card><CardContent className="flex items-start justify-between gap-3 p-5"><div><p className="text-sm font-semibold text-[#526157]">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums text-[#17251D]">{value.toLocaleString("es-PE")}</p></div><span className={`flex h-10 w-10 items-center justify-center ${tones[tone]}`}><Icon size={18} /></span></CardContent></Card>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt><dd className="mt-1 break-words font-semibold text-[#17251D]">{value}</dd></div>;
}