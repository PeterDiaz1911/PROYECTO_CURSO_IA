"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowDownWideNarrow, Bot, CalendarDays, ChevronLeft, ChevronRight, Download, Eye, FileText, Filter, Leaf, Package, RefreshCw, Search, ShieldCheck, Users, Warehouse, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { GeminiChat } from "@/features/assistant/GeminiChat";
import { ChartCard, ChartEmpty, ChartError, ChartLoading, DashboardLegend, DashboardMetric, DashboardTooltip, chartColors } from "@/features/dashboards/DashboardCharts";
import { categoryColor, comparePeriodCounts, dashboardSinceDate, dashboardStatuses, dashboardStatusConfig, dateKeyInLima, getRegistrationSeries, shiftDateKey, type DashboardLot, type DashboardPeriod, type DashboardStatus } from "@/features/gerencia/dashboard-data";
import { dashboardCsvFilename, dashboardLotsCsv } from "@/features/gerencia/dashboard-export";

type DashboardRole = "ADMIN" | "SUPERVISOR" | "OPERADOR";
type LotRecord = DashboardLot & { destino: string | null; creado_por: string };
type DocumentRecord = { id: string; lote_id: string };
type UserRecord = { id: string; is_active: boolean };
type DispatchSummary = { lote_id: string; estado: "PENDIENTE_FIRMA" | "APROBADO" | "RECHAZADO"; created_at: string };
type DateBounds = { start: string | null; end: string };
type DestinationFilter = "ALL" | "NONE" | "USA" | "UE" | "China";

const destinationLabels: Record<string, string> = { USA: "Estados Unidos", UE: "Unión Europea", China: "China" };
const pageChunk = 1000;
const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "all", label: "Todo el historial" },
  { value: "custom", label: "Rango personalizado" },
];

const roleCopy: Record<DashboardRole, { title: string; description: string; scope: string }> = {
  ADMIN: { title: "Panel de operaciones", description: "Indicadores y actividad de lotes disponibles para Gerencia.", scope: "Datos globales autorizados por Supabase RLS." },
  SUPERVISOR: { title: "Panel de Packing", description: "Recepción, avance y revisión de lotes autorizados para Packing.", scope: "Lotes visibles para el rol Supervisor." },
  OPERADOR: { title: "Mi actividad de campo", description: "Seguimiento personal de los lotes que registraste.", scope: "Solo tus registros, restringidos por Supabase RLS." },
};

function isDemoLot(lot: LotRecord) {
  return lot.fundo.startsWith("DEMO");
}

function localDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("es-PE", { timeZone: "America/Lima" });
}

function dayDifference(start: string, end: string) {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startTime = Date.UTC(startYear, startMonth - 1, startDay);
  const endTime = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((endTime - startTime) / 86400000);
}

async function loadAllRows<T>(readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageChunk) {
    const { data, error } = await readPage(offset, offset + pageChunk - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageChunk) return rows;
  }
}

function isStatus(value: unknown): value is DashboardStatus {
  return typeof value === "string" && dashboardStatuses.includes(value as DashboardStatus);
}

function makeLotRecord(value: unknown): LotRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.fundo !== "string" || typeof row.cultivo !== "string"
      || typeof row.agroquimico !== "string" || !isStatus(row.estado)
      || typeof row.fecha_cosecha !== "string" || typeof row.created_at !== "string"
      || Number.isNaN(Date.parse(row.created_at))) return null;
  return {
    id: row.id,
    fundo: row.fundo,
    cultivo: row.cultivo,
    agroquimico: row.agroquimico,
    estado: row.estado,
    fecha_cosecha: row.fecha_cosecha,
    created_at: row.created_at,
    destino: typeof row.destino === "string" ? row.destino : null,
    creado_por: typeof row.creado_por === "string" ? row.creado_por : "",
  };
}

export function RoleAnalyticsDashboard({ role }: { role: DashboardRole }) {
  const { client } = useAuth();
  const [lots, setLots] = useState<LotRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [dispatches, setDispatches] = useState<DispatchSummary[]>([]);
  const [dispatchError, setDispatchError] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersError, setUsersError] = useState("");
  const [documentsError, setDocumentsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const requestVersion = useRef(0);
  const [updatedAt, setUpdatedAt] = useState("");
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [customStart, setCustomStart] = useState(() => shiftDateKey(dateKeyInLima(new Date()), -29));
  const [customEnd, setCustomEnd] = useState(() => dateKeyInLima(new Date()));
  const [status, setStatus] = useState<DashboardStatus | "ALL">("ALL");
  const [crop, setCrop] = useState("ALL");
  const [farm, setFarm] = useState("ALL");
  const [destination, setDestination] = useState<DestinationFilter>("ALL");
  const [dataMode, setDataMode] = useState<"ALL" | "REAL" | "DEMO">("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "estado" | "cultivo" | "fundo">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const loadData = useCallback(async () => {
    const request = ++requestVersion.current;
    if (!client) {
      setError("No está disponible la conexión con Supabase.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setUsersError("");
    setDocumentsError("");
    setDispatchError("");
    try {
      let loadedLots: LotRecord[];
      if (role === "ADMIN") {
        const { data: response, error: requestError } = await client.rpc("gerencia_dashboard", {
          p_desde: null,
          p_estado: null,
        });
        if (requestError) throw new Error(requestError.message);
        const record = response as { lotes?: unknown } | null;
        if (!record || !Array.isArray(record.lotes)) throw new Error("Respuesta de Gerencia no válida.");
        const parsed = record.lotes.map(makeLotRecord);
        if (parsed.some((row) => row === null)) throw new Error("Gerencia recibió lotes con un formato incompleto.");
        const baseLots = parsed as LotRecord[];
        const ids = baseLots.map((lot) => lot.id);
        const details = ids.length ? await loadAllRows((from, to) => client
          .from("lotes")
          .select("id,destino,creado_por")
          .in("id", ids.slice(from, to + 1))
          .order("created_at", { ascending: true })) : [];
        const extra = new Map((details as { id: string; destino: string | null; creado_por: string }[]).map((row) => [row.id, row]));
        loadedLots = baseLots.map((lot) => ({ ...lot, ...extra.get(lot.id) }));
      } else {
        const rows = await loadAllRows((from, to) => client
          .from("lotes")
          .select("id,fundo,cultivo,agroquimico,estado,fecha_cosecha,created_at,destino,creado_por")
          .order("created_at", { ascending: true })
          .range(from, to));
        const parsed = rows.map(makeLotRecord);
        if (parsed.some((row) => row === null)) throw new Error("La consulta de lotes devolvió registros incompletos.");
        loadedLots = parsed as LotRecord[];
      }
      if (request !== requestVersion.current) return;
      setLots(loadedLots);

      if (role === "ADMIN") {
        const [documentResult, userResult] = await Promise.allSettled([
          loadAllRows((from, to) => client.from("documentos").select("id,lote_id").order("created_at", { ascending: true }).range(from, to)),
          loadAllRows((from, to) => client.from("usuarios").select("id,is_active").order("created_at", { ascending: true }).range(from, to)),
        ]);
        if (request !== requestVersion.current) return;
        if (documentResult.status === "fulfilled") setDocuments(documentResult.value as DocumentRecord[]);
        else {
          setDocuments([]);
          setDocumentsError(documentResult.reason instanceof Error ? documentResult.reason.message : "No se pudieron cargar los documentos.");
        }
        if (userResult.status === "fulfilled") setUsers(userResult.value as UserRecord[]);
        else {
          setUsers([]);
          setUsersError(userResult.reason instanceof Error ? userResult.reason.message : "No se pudieron cargar los usuarios.");
        }
        setDispatches([]);
      } else {
        setDocuments([]);
        setUsers([]);
        if (role === "SUPERVISOR") {
          try {
            const dispatchRows = await loadAllRows((from, to) => client
              .from("despachos")
              .select("lote_id,estado,created_at")
              .order("created_at", { ascending: true })
              .range(from, to));
            setDispatches(dispatchRows as DispatchSummary[]);
          } catch (cause) {
            setDispatches([]);
            setDispatchError(cause instanceof Error ? cause.message : "No se pudo consultar el historial de despachos.");
          }
        } else {
          setDispatches([]);
        }
      }
      if (request === requestVersion.current) setUpdatedAt(new Date().toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }));
    } catch (cause) {
      if (request === requestVersion.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las métricas autorizadas.");
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  }, [client, role]);

  useEffect(() => {
    void loadData();
    return () => { requestVersion.current += 1; };
  }, [loadData, refresh]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const today = dateKeyInLima(new Date());
  const firstLotDate = lots.length ? lots.map((lot) => dateKeyInLima(lot.created_at)).sort()[0] : null;
  const bounds = useMemo<DateBounds>(() => {
    if (period === "all") return { start: firstLotDate, end: today };
    if (period === "custom") return { start: customStart, end: customEnd };
    return { start: dashboardSinceDate(period), end: today };
  }, [period, firstLotDate, today, customStart, customEnd]);
  const rangeInvalid = period === "custom" && (!customStart || !customEnd || customStart > customEnd);

  const categoryLots = useMemo(() => lots.filter((lot) => {
    const demo = isDemoLot(lot);
    const normalizedSearch = debouncedSearch.toLocaleLowerCase("es");
    const matchesSearch = !normalizedSearch || [lot.id, lot.fundo, lot.cultivo, lot.agroquimico, lot.fecha_cosecha, lot.destino ?? "", dashboardStatusConfig[lot.estado].label]
      .some((value) => value.toLocaleLowerCase("es").includes(normalizedSearch));
    return (status === "ALL" || lot.estado === status)
      && (crop === "ALL" || lot.cultivo === crop)
      && (farm === "ALL" || lot.fundo === farm)
      && (destination === "ALL" || (destination === "NONE" ? !lot.destino : lot.destino === destination))
      && (dataMode === "ALL" || (dataMode === "DEMO" ? demo : !demo))
      && matchesSearch;
  }), [lots, status, crop, farm, destination, dataMode, debouncedSearch]);

  const currentLots = useMemo(() => {
    if (!bounds.start || rangeInvalid) return [];
    return categoryLots.filter((lot) => {
      const createdDate = dateKeyInLima(lot.created_at);
      return createdDate >= bounds.start! && createdDate <= bounds.end;
    });
  }, [categoryLots, bounds, rangeInvalid]);

  const comparison = useMemo(() => {
    if (period === "all" || !bounds.start || rangeInvalid) return null;
    const length = dayDifference(bounds.start, bounds.end) + 1;
    if (length <= 0) return null;
    const previousEnd = shiftDateKey(bounds.start, -1);
    const previousStart = shiftDateKey(previousEnd, -(length - 1));
    const previousLots = categoryLots.filter((lot) => {
      const createdDate = dateKeyInLima(lot.created_at);
      return createdDate >= previousStart && createdDate <= previousEnd;
    });
    return { previousLots, start: previousStart, end: previousEnd };
  }, [period, bounds, categoryLots, rangeInvalid]);

  const previousTotal = comparison?.previousLots.length ?? 0;
  const totalChange = comparePeriodCounts(currentLots.length, previousTotal);
  const previousStatuses = useMemo(() => {
    const counts = new Map<DashboardStatus, number>();
    for (const lot of comparison?.previousLots ?? []) counts.set(lot.estado, (counts.get(lot.estado) ?? 0) + 1);
    return counts;
  }, [comparison]);
  const statusCounts = dashboardStatuses.map((value) => ({
    key: value,
    label: dashboardStatusConfig[value].label,
    total: currentLots.filter((lot) => lot.estado === value).length,
    fill: dashboardStatusConfig[value].color,
  }));
  const registeredIds = new Set(currentLots.map((lot) => lot.id));
  const documentCount = documents.filter((document) => registeredIds.has(document.lote_id)).length;
  const resolvedCount = statusCounts.find((entry) => entry.key === "APROBADO")!.total + statusCounts.find((entry) => entry.key === "RECHAZADO")!.total;
  const approvalRate = status === "ALL" && resolvedCount
    ? Math.round((statusCounts.find((entry) => entry.key === "APROBADO")!.total / resolvedCount) * 100)
    : null;
  const approvalRateDetail = status !== "ALL"
    ? "Incluye todos los estados para calcular la tasa"
    : approvalRate === null
      ? "Tasa: sin casos resueltos"
      : `Tasa ${approvalRate}% · ${resolvedCount} resueltos (aprobados + rechazados)`;
  const pendingCount = countState(currentLots, "PENDIENTE_FIRMA");
  const previousPending = previousStatuses.get("PENDIENTE_FIRMA") ?? 0;
  const matchingDispatches = dispatches.filter((dispatch) => {
    const createdDate = dateKeyInLima(dispatch.created_at);
    const selectedLot = categoryLots.some((lot) => lot.id === dispatch.lote_id);
    return selectedLot && Boolean(bounds.start) && createdDate >= bounds.start! && createdDate <= bounds.end;
  });
  const dispatchesPendingReview = matchingDispatches.filter((dispatch) => dispatch.estado === "PENDIENTE_FIRMA").length;
  const dispatchesReturned = matchingDispatches.filter((dispatch) => dispatch.estado === "RECHAZADO").length;
  const demoCount = currentLots.filter(isDemoLot).length;
  const daysInRange = bounds.start && bounds.end ? Math.max(1, dayDifference(bounds.start, bounds.end) + 1) : 0;
  const coverageDays = period === "all" && firstLotDate ? Math.max(1, dayDifference(firstLotDate, today) + 1) : daysInRange;
  const averagePerDay = coverageDays ? currentLots.length / coverageDays : 0;
  const granularity = daysInRange > 45 || period === "all" ? "week" : "day";
  const trend = getRegistrationSeries(categoryLots, bounds.start, bounds.end, granularity, firstLotDate);
  const crops = countCategories(currentLots, (lot) => lot.cultivo);
  const farms = countCategories(currentLots, (lot) => lot.fundo);
  const destinations = countCategories(currentLots.filter((lot) => lot.destino), (lot) => destinationLabels[lot.destino!] ?? lot.destino!);
  const documentsInPeriod = role === "ADMIN" ? documentCount : 0;

  const sortedLots = useMemo(() => [...currentLots].sort((left, right) => {
    const difference = sortField === "created_at"
      ? Date.parse(left.created_at) - Date.parse(right.created_at)
      : left[sortField].localeCompare(right[sortField], "es", { sensitivity: "base" });
    return sortDirection === "asc" ? difference : -difference;
  }), [currentLots, sortField, sortDirection]);
  const pageCount = Math.max(1, Math.ceil(sortedLots.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleLots = sortedLots.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedLot = selectedLotId ? currentLots.find((lot) => lot.id === selectedLotId) ?? null : null;
  const cropsOptions = useMemo(() => [...new Set(lots.map((lot) => lot.cultivo))].sort(), [lots]);
  const farmsOptions = useMemo(() => [...new Set(lots.map((lot) => lot.fundo))].sort(), [lots]);
  const destinationsOptions = useMemo(() => [...new Set(lots.map((lot) => lot.destino).filter((value): value is string => Boolean(value)))].sort(), [lots]);

  useEffect(() => { setPage(1); }, [debouncedSearch, sortField, sortDirection, pageSize, status, crop, farm, destination, dataMode, period, customStart, customEnd]);
  useEffect(() => {
    if (selectedLotId && !currentLots.some((lot) => lot.id === selectedLotId)) setSelectedLotId(null);
  }, [currentLots, selectedLotId]);

  const tableDateLabel = period === "all" ? "Todo el historial" : bounds.start ? `${localDate(bounds.start)} – ${localDate(bounds.end)}` : "Sin registros";
  const roleHeading = roleCopy[role];
  const demoNotice = dataMode === "ALL" && demoCount > 0 ? `${demoCount} registros DEMO identificados por el prefijo del fundo.` : "";
  const activeFilterCount = Number(period !== "30d") + Number(status !== "ALL") + Number(crop !== "ALL")
    + Number(farm !== "ALL") + Number(destination !== "ALL") + Number(dataMode !== "ALL") + Number(Boolean(debouncedSearch));
  const actionHref = role === "ADMIN" ? routeHref("/gerente", "autorizacion")
    : role === "SUPERVISOR" ? routeHref("/packing", "recepcion")
      : routeHref("/campo", "registro");
  const actionLabel = role === "ADMIN" ? "Revisar pendientes"
    : role === "SUPERVISOR" ? "Recibir lotes"
      : "Registrar lote";

  function exportFilteredLots() {
    const blob = new Blob([dashboardLotsCsv(sortedLots)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = dashboardCsvFilename(today);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (error) return <section className="space-y-5"><PageHeader role={role} copy={roleHeading} updatedAt={updatedAt} onRefresh={() => setRefresh((value) => value + 1)} loading={loading} actionHref={actionHref} actionLabel={actionLabel} onExport={exportFilteredLots} exportDisabled /> <Card><CardContent><ChartError message={error} onRetry={() => setRefresh((value) => value + 1)} /></CardContent></Card></section>;

  return <section className="space-y-5" aria-labelledby="role-dashboard-title">
    <PageHeader role={role} copy={roleHeading} updatedAt={updatedAt} onRefresh={() => setRefresh((value) => value + 1)} loading={loading} actionHref={actionHref} actionLabel={actionLabel} onExport={exportFilteredLots} exportDisabled={loading || sortedLots.length === 0} />
    <div className="space-y-3 rounded-2xl border border-[#17251D]/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <p className="text-sm font-semibold text-[#17251D]">{activeFilterCount ? `${activeFilterCount} filtros activos` : "Sin filtros adicionales"}</p>
        <Button type="button" variant="outline" aria-expanded={filtersOpen} aria-controls="dashboard-filters" onClick={() => setFiltersOpen((open) => !open)} className="min-h-10 rounded-xl"><Filter size={16} /> Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Button>
      </div>
      <div id="dashboard-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4`}>
      <Field label="Buscar lote"><span className="relative block"><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID, fundo, cultivo, destino…" className={filterClass + " pl-10"} /></span></Field>
      <Field label="Período"><select value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)} className={filterClass}><option value="today">Hoy</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="all">Todo el historial</option><option value="custom">Rango personalizado</option></select></Field>
      {period === "custom" ? <><Field label="Desde"><input type="date" value={customStart} max={today} onChange={(event) => setCustomStart(event.target.value)} className={filterClass} /></Field><Field label="Hasta"><input type="date" value={customEnd} max={today} onChange={(event) => setCustomEnd(event.target.value)} className={filterClass} /></Field></> : null}
      <Field label="Estado"><select value={status} onChange={(event) => setStatus(event.target.value as DashboardStatus | "ALL")} className={filterClass}><option value="ALL">Todos los estados</option>{dashboardStatuses.map((value) => <option value={value} key={value}>{dashboardStatusConfig[value].label}</option>)}</select></Field>
      <Field label="Cultivo"><select value={crop} onChange={(event) => setCrop(event.target.value)} className={filterClass}><option value="ALL">Todos los cultivos</option>{cropsOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field>
      <Field label="Fundo"><select value={farm} onChange={(event) => setFarm(event.target.value)} className={filterClass}><option value="ALL">Todos los fundos</option>{farmsOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field>
      {role !== "OPERADOR" && <Field label="Destino"><select value={destination} onChange={(event) => setDestination(event.target.value as DestinationFilter)} className={filterClass}><option value="ALL">Todos los destinos</option><option value="NONE">Sin destino</option>{destinationsOptions.map((value) => <option value={value} key={value}>{destinationLabels[value] ?? value}</option>)}</select></Field>}
      <Field label="Origen"><select value={dataMode} onChange={(event) => setDataMode(event.target.value as "ALL" | "REAL" | "DEMO")} className={filterClass}><option value="ALL">Reales y DEMO</option><option value="REAL">Solo registros no DEMO</option><option value="DEMO">Solo marcados DEMO</option></select></Field>
      </div>
      {activeFilterCount > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-[#17251D]/10 pt-3" aria-label="Filtros aplicados">
        <span className="text-xs font-semibold text-[#526157]">Filtros:</span>
        {debouncedSearch && <FilterChip label={`Búsqueda: ${debouncedSearch}`} onRemove={() => setSearch("")} />}
        {period !== "30d" && <FilterChip label={periodLabel(period, customStart, customEnd)} onRemove={() => { setPeriod("30d"); setCustomStart(shiftDateKey(today, -29)); setCustomEnd(today); }} />}
        {status !== "ALL" && <FilterChip label={`Estado: ${dashboardStatusConfig[status].label}`} onRemove={() => setStatus("ALL")} />}
        {crop !== "ALL" && <FilterChip label={`Cultivo: ${crop}`} onRemove={() => setCrop("ALL")} />}
        {farm !== "ALL" && <FilterChip label={`Fundo: ${farm}`} onRemove={() => setFarm("ALL")} />}
        {destination !== "ALL" && <FilterChip label={`Destino: ${destination === "NONE" ? "Sin destino" : destinationLabels[destination] ?? destination}`} onRemove={() => setDestination("ALL")} />}
        {dataMode !== "ALL" && <FilterChip label={`Origen: ${dataMode === "DEMO" ? "DEMO" : "No marcado DEMO"}`} onRemove={() => setDataMode("ALL")} />}
        <Button type="button" variant="ghost" className="min-h-9 px-2 text-xs" onClick={() => { setSearch(""); setPeriod("30d"); setCustomStart(shiftDateKey(today, -29)); setCustomEnd(today); setStatus("ALL"); setCrop("ALL"); setFarm("ALL"); setDestination("ALL"); setDataMode("ALL"); }}>Limpiar filtros</Button>
      </div>}
    </div>
    {rangeInvalid && <p role="alert" className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Revisa el rango personalizado: la fecha inicial debe ser anterior o igual a la fecha final.</p>}
    {demoNotice && <p role="note" className="border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950">{demoNotice} Los gráficos los incluyen porque el filtro de origen está en “Reales y DEMO”.</p>}
    <p className="text-xs text-[#526157]">{roleHeading.scope} · Zona horaria: America/Lima · Período: {tableDateLabel} · Fechas por registro (created_at); los estados son actuales · {fmt(currentLots.length)} resultados autorizados</p>

    <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${role === "ADMIN" ? "2xl:grid-cols-6" : "2xl:grid-cols-5"}`}>
      {role === "ADMIN" ? <>
        <DashboardMetric label="Lotes registrados" value={loading ? "…" : fmt(currentLots.length)} unit={loading ? undefined : "lotes"} detail="Dentro de todos los filtros activos" icon={Package} comparison={!loading && comparison ? totalChange.label : undefined} />
        <DashboardMetric label="Pendientes de autorización" value={loading ? "…" : fmt(pendingCount)} unit={loading ? undefined : "lotes"} detail="Lotes en estado Pendiente de firma" icon={Warehouse} comparison={!loading && comparison ? comparePeriodCounts(pendingCount, previousPending).label : undefined} onClick={() => setStatus(status === "PENDIENTE_FIRMA" ? "ALL" : "PENDIENTE_FIRMA")} />
        <DashboardMetric label="Aprobados" value={loading ? "…" : fmt(countState(currentLots, "APROBADO"))} unit={loading ? undefined : "lotes"} detail="Lotes actualmente aprobados en el período y filtros." icon={ShieldCheck} tone="approved" onClick={() => setStatus(status === "APROBADO" ? "ALL" : "APROBADO")} />
        <DashboardMetric label="Tasa de aprobación" value={loading ? "…" : approvalRate === null ? "—" : `${approvalRate}%`} unit={loading || approvalRate === null ? undefined : "de resueltos"} detail={loading ? "Calculando aprobados / (aprobados + rechazados)" : approvalRateDetail} icon={ShieldCheck} onClick={() => setStatus("ALL")} />
        <DashboardMetric label="Rechazados" value={loading ? "…" : fmt(countState(currentLots, "RECHAZADO"))} unit={loading ? undefined : "lotes"} detail="Rechazos dentro de los filtros activos" icon={AlertCircle} onClick={() => setStatus(status === "RECHAZADO" ? "ALL" : "RECHAZADO")} />
        <DashboardMetric label="Documentos asociados" value={loading ? "…" : documentsError ? "—" : fmt(documentsInPeriod)} unit={loading || documentsError ? undefined : "documentos"} detail={documentsError ? `Error al cargar: ${documentsError}` : "Adjuntos a los lotes filtrados"} icon={FileText} />
      </> : role === "SUPERVISOR" ? <>
        <DashboardMetric label="Lotes bajo supervisión" value={loading ? "…" : fmt(currentLots.length)} unit={loading ? undefined : "lotes"} detail="Con filtros y período seleccionados" icon={Package} comparison={!loading && comparison ? totalChange.label : undefined} />
        <DashboardMetric label="Pendientes de recepción" value={loading ? "…" : fmt(countState(currentLots, "EN_CAMPO"))} unit={loading ? undefined : "lotes"} detail="Estado EN_CAMPO" icon={Warehouse} onClick={() => setStatus(status === "EN_CAMPO" ? "ALL" : "EN_CAMPO")} />
        <DashboardMetric label="En Packing" value={loading ? "…" : fmt(countState(currentLots, "EN_PACKING"))} unit={loading ? undefined : "lotes"} detail="Estado EN_PACKING" icon={Leaf} onClick={() => setStatus(status === "EN_PACKING" ? "ALL" : "EN_PACKING")} />
        <DashboardMetric label="Enviados a Gerencia" value={loading ? "…" : dispatchError ? "—" : fmt(dispatchesPendingReview)} unit={loading || dispatchError ? undefined : "despachos"} detail={dispatchError ? "Historial no disponible; verifica la migración del flujo." : "Despachos pendientes dentro del período y filtros"} icon={ShieldCheck} onClick={() => setStatus(status === "PENDIENTE_FIRMA" ? "ALL" : "PENDIENTE_FIRMA")} />
        <DashboardMetric label="Devueltos" value={loading ? "…" : dispatchError ? "—" : fmt(dispatchesReturned)} unit={loading || dispatchError ? undefined : "despachos"} detail={dispatchError ? "Historial no disponible; verifica la migración del flujo." : "Decisiones RECHAZADO registradas por Gerencia"} icon={AlertCircle} onClick={() => setStatus(status === "RECHAZADO" ? "ALL" : "RECHAZADO")} />
      </> : <>
        <DashboardMetric label="Mis lotes registrados" value={loading ? "…" : fmt(currentLots.length)} unit={loading ? undefined : "lotes"} detail="Solo registros visibles para tu cuenta" icon={Package} comparison={!loading && comparison ? totalChange.label : undefined} />
        <DashboardMetric label="En tránsito a Packing" value={loading ? "…" : fmt(countState(currentLots, "EN_CAMPO"))} unit={loading ? undefined : "lotes"} detail="Estado EN_CAMPO" icon={Warehouse} onClick={() => setStatus(status === "EN_CAMPO" ? "ALL" : "EN_CAMPO")} />
        <DashboardMetric label="Pendientes de firma" value={loading ? "…" : fmt(countState(currentLots, "PENDIENTE_FIRMA"))} unit={loading ? undefined : "lotes"} detail="Estado PENDIENTE_FIRMA" icon={ShieldCheck} onClick={() => setStatus(status === "PENDIENTE_FIRMA" ? "ALL" : "PENDIENTE_FIRMA")} />
        <DashboardMetric label="Devueltos" value={loading ? "…" : fmt(countState(currentLots, "RECHAZADO"))} unit={loading ? undefined : "lotes"} detail="Pendiente de corrección según el estado actual" icon={AlertCircle} onClick={() => setStatus(status === "RECHAZADO" ? "ALL" : "RECHAZADO")} />
        <DashboardMetric label="Promedio diario" value={loading ? "…" : averagePerDay.toFixed(1)} unit={loading ? undefined : "lotes/día"} detail={`Calculado sobre ${fmt(coverageDays)} días del período`} icon={CalendarDays} />
      </>}
    </div>

    {role === "ADMIN" && <section className="space-y-3" aria-labelledby="admin-users-metrics-title"><div><h2 id="admin-users-metrics-title" className="text-lg font-bold text-[#17251D]">Accesos de usuarios</h2><p className="mt-1 text-xs text-[#526157]">Indicadores administrativos separados de los gráficos de lotes.</p></div>{usersError ? <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-900">No se pudieron cargar usuarios: {usersError}</p> : <div className="grid gap-3 sm:grid-cols-2"><DashboardMetric label="Usuarios activos" value={fmt(users.filter((user) => user.is_active).length)} unit="cuentas" detail="Perfiles con acceso habilitado" icon={Users} /><DashboardMetric label="Usuarios no habilitados" value={fmt(users.filter((user) => !user.is_active).length)} unit="cuentas" detail="Perfiles sin acceso activo; el sistema no distingue espera de desactivación." icon={Users} /></div>}</section>}

    <SectionHeading title="Actividad y prioridades" description="Evolución de registros junto a accesos accionables para el rol." />
    {loading ? <ChartLoading /> : currentLots.length === 0 ? <ChartEmpty label={lots.length ? "No hay coincidencias para el período y filtros seleccionados." : "No hay historial autorizado para graficar."} /> : <>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <ChartCard title="Evolución de registros" description={`${granularity === "day" ? "Lotes creados por día" : "Lotes creados por semana"}; eje Y en cantidad entera desde cero. Días cubiertos sin ingresos aparecen como cero.`}>
            <ResponsiveContainer width="100%" height={290} minWidth={0}>
              <LineChart data={trend} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis dataKey="label" minTickGap={24} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                <YAxis allowDecimals={false} domain={[0, "dataMax"]} width={34} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<DashboardTooltip />} />
                <Line type="monotone" dataKey="total" name="Lotes" stroke={chartColors.forest} strokeWidth={3} dot={{ r: 3, fill: chartColors.forest }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <DashboardLegend items={[{ label: granularity === "day" ? "Registros por día" : "Registros por semana", color: chartColors.forest }]} />
          </ChartCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <WorkflowQueue role={role} lots={currentLots} />
        </div>
      </div>
      <SectionHeading title="Distribución por estado" description={`Estados actuales dentro del mismo conjunto filtrado · ${fmt(currentLots.length)} lotes.`} />
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5">
          <ChartCard title="Estado actual de los lotes" description="Selecciona un segmento o estado para filtrar. No representa cambios históricos de estado.">
            <div className="grid items-center gap-2 sm:grid-cols-[minmax(170px,220px)_1fr]">
              <ResponsiveContainer width="100%" height={218} minWidth={0}>
                <PieChart>
                  <Pie data={statusCounts.filter((entry) => entry.total > 0)} dataKey="total" nameKey="label" innerRadius="63%" outerRadius="84%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} onClick={(entry) => {
                    if (typeof entry.key === "string" && isStatus(entry.key)) setStatus(status === entry.key ? "ALL" : entry.key);
                  }}>
                    {statusCounts.filter((entry) => entry.total > 0).map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<DashboardTooltip />} />
                  <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--text-primary)" }} className="text-xl font-bold">{fmt(currentLots.length)}</text>
                  <text x="50%" y="61%" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--text-secondary)" }} className="text-[10px]">lotes</text>
                </PieChart>
              </ResponsiveContainer>
              <div className="grid gap-1" aria-label="Filtrar por estado">
                {statusCounts.map((entry) => {
                  const percentage = currentLots.length ? (entry.total / currentLots.length) * 100 : 0;
                  return <button key={entry.key} type="button" aria-pressed={status === entry.key} onClick={() => setStatus(status === entry.key ? "ALL" : entry.key)} className="flex min-h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-left text-xs text-[#17251D] outline-none hover:bg-[#F5F8F4] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dashboardStatusConfig[entry.key].color }} />
                    <span className="min-w-0 flex-1 truncate">{dashboardStatusConfig[entry.key].label}</span>
                    <strong className="shrink-0 tabular-nums">{fmt(entry.total)}</strong>
                    <span className="w-12 shrink-0 text-right tabular-nums text-[#526157]">{percentage.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%</span>
                  </button>;
                })}
              </div>
            </div>
          </ChartCard>
        </div>
        {role !== "OPERADOR" && destinations.length > 0 && <div className="min-w-0 xl:col-span-7"><CategoryChart title="Lotes por destino" description="Solo lotes con un destino asignado; colores estables por categoría." rows={destinations} onSelect={(value) => {
          const target = destinationsOptions.find((option) => (destinationLabels[option] ?? option) === value);
          if (target) setDestination(destination === target ? "ALL" : target as DestinationFilter);
        }} /></div>}
      </div>
      <SectionHeading title="Comparación por categoría" description="Compara los principales cultivos y fundos del conjunto filtrado." />
      <div className="grid gap-4 xl:grid-cols-2">
        <CategoryChart title="Lotes por cultivo" description="Top 7 por defecto. Selecciona una categoría para filtrar." rows={crops} onSelect={(value) => setCrop(crop === value ? "ALL" : value)} />
        <CategoryChart title="Lotes por fundo" description="Top 7 por defecto. Selecciona una categoría para filtrar." rows={farms} onSelect={(value) => setFarm(farm === value ? "ALL" : value)} />
      </div>
      {selectedLot && <Card className="border-[#2D6A4F]/25 bg-gradient-to-r from-[#F5F8F4] to-white">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div><CardTitle className="text-base">Lote seleccionado · {selectedLot.id}</CardTitle><p className="mt-1 text-xs text-[#526157]">Detalle de consulta. Seleccionarlo no modifica su estado.</p></div>
          <Button type="button" variant="ghost" aria-label="Limpiar lote seleccionado" className="min-h-9 px-2" onClick={() => setSelectedLotId(null)}><X size={16} /> Quitar</Button>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Fundo" value={selectedLot.fundo} />
          <Detail label="Cultivo" value={selectedLot.cultivo} />
          <Detail label="Estado actual" value={dashboardStatusConfig[selectedLot.estado].label} />
          <Detail label="Destino" value={selectedLot.destino ? destinationLabels[selectedLot.destino] ?? selectedLot.destino : "Sin destino"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className="min-h-10 rounded-xl" onClick={() => setAssistantOpen(true)}><Bot size={16} /> Analizar con IA</Button>
            <span className="self-center text-xs text-[#526157]">El asistente recibirá este lote como contexto y verificará el acceso en Supabase.</span>
          </div>
        </CardContent>
      </Card>}

      <Card className="min-w-0 rounded-2xl">
        <CardHeader className="pb-3"><CardTitle>{role === "OPERADOR" ? "Mis registros" : "Actividad de lotes"}</CardTitle><p className="mt-1 text-xs text-[#526157]">La tabla contiene los {fmt(sortedLots.length)} lotes autorizados que coinciden con todos los filtros activos.</p></CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-3 border-y border-[#17251D]/10 bg-[#F5F8F4]/60 p-4 sm:grid-cols-[minmax(180px,1fr)_minmax(160px,220px)_auto]">
            <label className="relative block"><span className="sr-only">Ordenar lotes por campo</span><ArrowDownWideNarrow size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><select value={sortField} onChange={(event) => setSortField(event.target.value as typeof sortField)} className={filterClass + " pl-10"}><option value="created_at">Orden: fecha</option><option value="estado">Orden: estado</option><option value="cultivo">Orden: cultivo</option><option value="fundo">Orden: fundo</option></select></label>
            <Button type="button" variant="outline" aria-label={`Orden ${sortDirection === "asc" ? "ascendente" : "descendente"}`} aria-pressed={sortDirection === "asc"} className="min-h-11 rounded-xl" onClick={() => setSortDirection((value) => value === "asc" ? "desc" : "asc")}>{sortDirection === "asc" ? "Ascendente ↑" : "Descendente ↓"}</Button>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#526157]">Filas por página<select aria-label="Filas por página" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className={filterClass + " w-auto"}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
          </div>
          {loading && sortedLots.length === 0 ? <ChartLoading label="Cargando actividad autorizada…" /> : sortedLots.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#526157]">No hay coincidencias para el período y los filtros seleccionados.</p> : <>
            <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><caption className="sr-only">Actividad de lotes que coincide con los filtros activos</caption><thead className="border-b border-[#17251D]/10 bg-[#F5F8F4] text-[10px] uppercase tracking-wider text-[#526157]"><tr><th className="px-5 py-3">Lote</th><th className="px-3 py-3">Fundo</th><th className="px-3 py-3">Cultivo</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Destino</th><th className="px-5 py-3 text-right">Registrado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-[#17251D]/10">{visibleLots.map((lot) => <tr key={lot.id} aria-selected={selectedLotId === lot.id} className={`hover:bg-[#F5F8F4]/70 ${selectedLotId === lot.id ? "bg-[#E8EEE7]" : ""}`}><td className="px-5 py-3 font-semibold text-[#17251D]">{lot.id}{isDemoLot(lot) && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">DEMO</span>}</td><td className="px-3 py-3">{lot.fundo}</td><td className="px-3 py-3">{lot.cultivo}</td><td className="px-3 py-3"><StatusPill status={lot.estado} /></td><td className="px-3 py-3">{lot.destino ? destinationLabels[lot.destino] ?? lot.destino : "Sin destino"}</td><td className="whitespace-nowrap px-5 py-3 text-right text-xs text-[#526157]">{new Date(lot.created_at).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" })}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button type="button" variant="outline" className="min-h-9 rounded-lg px-2 text-xs" aria-label={`Ver detalle del lote ${lot.id}`} onClick={() => setSelectedLotId(lot.id)}><Eye size={14} /> Ver</Button><Button type="button" variant="ghost" className="min-h-9 rounded-lg px-2 text-xs" aria-label={`Analizar el lote ${lot.id} con IA`} onClick={() => { setSelectedLotId(lot.id); setAssistantOpen(true); }}><Bot size={14} /> IA</Button></div></td></tr>)}</tbody></table></div>
            <div className="flex flex-col gap-3 border-t border-[#17251D]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#526157]">Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedLots.length)} de {sortedLots.length} lotes filtrados</p><div className="flex items-center gap-2"><Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}><ChevronLeft size={15} /> Anterior</Button><span className="min-w-16 text-center text-xs tabular-nums text-[#526157]">{currentPage} / {pageCount}</span><Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount}>Siguiente <ChevronRight size={15} /></Button></div></div>
          </>}
        </CardContent>
      </Card>
    </>}
    <GeminiChat lotId={selectedLot?.id ?? null} title="Asistente operativo" presentation="floating" open={assistantOpen} onOpenChange={setAssistantOpen} />
  </section>;
}

const filterClass = "min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20";

function PageHeader({ role, copy, updatedAt, loading, onRefresh, actionHref, actionLabel, onExport, exportDisabled }: { role: DashboardRole; copy: { title: string; description: string; scope: string }; updatedAt: string; loading: boolean; onRefresh: () => void; actionHref: string; actionLabel: string; onExport: () => void; exportDisabled: boolean }) {
  return <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2D6A4F]">{role === "ADMIN" ? "Gerencia ejecutiva" : role === "SUPERVISOR" ? "Centro de operaciones · Packing" : "Operación de campo"}</p><h1 id="role-dashboard-title" className="mt-2 text-2xl font-bold tracking-tight text-[#17251D] sm:text-3xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#526157]">{copy.description}</p><p className="mt-2 text-xs text-[#526157]">{updatedAt ? `Última consulta correcta: ${updatedAt} · ` : ""}{copy.scope}</p></div><div className="flex flex-wrap gap-2"><a href={actionHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1B4332] px-4 text-sm font-semibold text-white outline-none hover:bg-[#2D6A4F] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2">{actionLabel}</a><Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin motion-reduce:animate-none" : ""} /> Actualizar</Button><Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={onExport} disabled={exportDisabled} title="Exporta todos los lotes autorizados con los filtros activos, no solo esta página"><Download size={16} /> Exportar CSV</Button></div></header>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-xs font-bold text-[#526157]">{label}<span className="mt-1.5 block">{children}</span></label>;
}

function countState(lots: LotRecord[], state: DashboardStatus) {
  return lots.filter((lot) => lot.estado === state).length;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="pt-2">
    <h2 className="text-lg font-bold tracking-tight text-[#17251D]">{title}</h2>
    <p className="mt-1 text-sm text-[#526157]">{description}</p>
  </div>;
}

function WorkflowQueue({ role, lots }: { role: DashboardRole; lots: LotRecord[] }) {
  const items = role === "ADMIN"
    ? [{ label: "Pendientes de autorización", status: "PENDIENTE_FIRMA" as const, tab: "autorizacion", path: "/gerente" }]
    : role === "SUPERVISOR"
      ? [
        { label: "Por recibir en Packing", status: "EN_CAMPO" as const, tab: "recepcion", path: "/packing" },
        { label: "Lotes en proceso de Packing", status: "EN_PACKING" as const, tab: "salida", path: "/packing" },
      ]
      : [
        { label: "Lotes registrados en campo", status: "EN_CAMPO" as const, tab: "lotes", path: "/campo" },
        { label: "Lotes observados", status: "RECHAZADO" as const, tab: "lotes", path: "/campo" },
      ];

  return <ChartCard title={role === "OPERADOR" ? "Seguimiento de mi actividad" : "Prioridades del flujo"} description="Conteos del conjunto filtrado; los accesos abren el flujo correspondiente a tu rol.">
    <div className="space-y-2">
      {items.map((item) => {
        const total = countState(lots, item.status);
        return <a key={item.status} href={routeHref(item.path, item.tab)} className="group flex min-h-16 items-center gap-3 rounded-xl border border-[#17251D]/10 bg-[#F8FAF7] p-3 outline-none transition hover:border-[#2D6A4F]/40 hover:bg-[#F0F6EF] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E3F0E3] text-lg font-bold tabular-nums text-[#1B4332]">{fmt(total)}</span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-[#17251D]">{item.label}</span>
          <ChevronRight size={17} className="shrink-0 text-[#526157] transition group-hover:translate-x-0.5" aria-hidden="true" />
        </a>;
      })}
      <p className="pt-1 text-xs leading-5 text-[#526157]">Alcance de cifras: lotes visibles para tu rol, período y filtros activos.</p>
    </div>
  </ChartCard>;
}

function countCategories(lots: LotRecord[], key: (lot: LotRecord) => string) {
  const counts = new Map<string, number>();
  for (const lot of lots) counts.set(key(lot), (counts.get(key(lot)) ?? 0) + 1);
  return [...counts].map(([label, total]) => ({ label, total, color: categoryColor(label) }))
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "es"));
}

function fmt(value: number) {
  return value.toLocaleString("es-PE");
}

function shortCategoryLabel(value: string) {
  return value.length > 11 ? `${value.slice(0, 10)}…` : value;
}

function routeHref(path: string, tab: string) {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `${basePath}${path}/?tab=${encodeURIComponent(tab)}`;
}

function periodLabel(period: DashboardPeriod, start: string, end: string) {
  if (period === "custom") return `Rango: ${localDate(start)} – ${localDate(end)}`;
  if (period === "today") return "Hoy";
  if (period === "7d") return "Últimos 7 días";
  if (period === "30d") return "Últimos 30 días";
  if (period === "90d") return "Últimos 90 días";
  return "Todo el historial";
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-[#17251D]/10 bg-[#F5F8F4] pl-3 pr-1 text-xs text-[#17251D]"><span className="max-w-[240px] truncate">{label}</span><button type="button" onClick={onRemove} aria-label={`Quitar filtro: ${label}`} className="rounded-full p-1 outline-none hover:bg-[#E8EEE7] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"><X size={13} /></button></span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-[#526157]">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#17251D]">{value}</dd></div>;
}

function CategoryChart({ title, description, rows, onSelect }: { title: string; description: string; rows: { label: string; total: number; color: string }[]; onSelect: (label: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const chartRows = (showAll ? rows : rows.slice(0, 7)).map((row) => ({
    ...row,
    shortLabel: shortCategoryLabel(row.label),
    fullLabel: row.label,
  }));
  const maxBarSize = chartRows.length > 10 ? 22 : 30;
  const chartWidth = showAll ? Math.max(360, chartRows.length * 72) : undefined;
  return <ChartCard title={title} description={description}>
    {chartRows.length ? <div className="w-full overflow-x-auto"><div className="h-[290px] min-w-0" style={chartWidth ? { minWidth: chartWidth } : undefined}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={chartRows} layout="horizontal" margin={{ top: 12, right: 8, left: -18, bottom: chartRows.length > 7 ? 72 : 52 }} barCategoryGap="28%">
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
      <XAxis type="category" dataKey="shortLabel" interval={0} height={chartRows.length > 7 ? 72 : 54} tick={{ fill: "var(--chart-axis)", fontSize: 11, angle: chartRows.length > 7 ? -35 : 0, textAnchor: chartRows.length > 7 ? "end" : "middle" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
      <YAxis type="number" allowDecimals={false} domain={[0, "dataMax"]} width={34} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} />
      <Tooltip content={<DashboardTooltip />} />
      <Bar dataKey="total" name="Lotes" radius={[5, 5, 0, 0]} maxBarSize={maxBarSize} isAnimationActive={false} cursor="pointer" onClick={(_entry, index) => {
        const label = chartRows[index]?.label;
        if (typeof label === "string") onSelect(label);
      }}>
        {chartRows.map((row) => <Cell key={row.label} fill={row.color} />)}
      </Bar>
    </BarChart></ResponsiveContainer></div></div> : <p className="grid h-[300px] place-items-center text-sm text-[#526157]">Sin datos en este conjunto filtrado.</p>}
    {rows.length > 7 && <Button type="button" variant="ghost" className="mt-1 min-h-9 px-2 text-xs" onClick={() => setShowAll((value) => !value)}>{showAll ? "Mostrar Top 7" : `Ver todas las categorías (${rows.length})`}</Button>}
    {rows.length > 0 && <details className="mt-1 border-t border-[#E4EBE2] pt-2">
      <summary className="cursor-pointer rounded-md py-2 text-xs font-semibold text-[#236B3B] outline-none focus-visible:ring-2 focus-visible:ring-[#236B3B]">Ver nombres, cantidades y filtrar</summary>
      <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2" aria-label={`${title}: filtrar por categoría`}>
        {rows.map((row) => <button key={row.label} type="button" onClick={() => onSelect(row.label)} className="flex min-h-9 min-w-0 items-center gap-2 rounded-lg px-2 text-left text-xs text-[#17251D] outline-none hover:bg-[#F5F8F4] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"><span className="category-color-swatch h-2.5 w-2.5 shrink-0 rounded-sm" aria-hidden="true" style={{ backgroundColor: row.color }} /><span className="min-w-0 flex-1 truncate">{row.label}</span><strong className="tabular-nums">{fmt(row.total)}</strong></button>)}
      </div>
    </details>}
  </ChartCard>;
}

function StatusPill({ status }: { status: DashboardStatus }) {
  const color = dashboardStatusConfig[status].color;
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-default px-2.5 py-1 text-xs font-semibold text-primary" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, var(--surface))` }}><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{dashboardStatusConfig[status].label}</span>;
}
