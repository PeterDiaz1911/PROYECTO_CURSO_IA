"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownWideNarrow, CalendarDays, ChevronLeft, ChevronRight, FileText, Leaf, Package, RefreshCw, Search, ShieldCheck, Users, Warehouse } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { ChartCard, ChartEmpty, ChartError, ChartLoading, DashboardLegend, DashboardMetric, DashboardTooltip, chartColors } from "@/features/dashboards/DashboardCharts";
import { comparePeriodCounts, dashboardSinceDate, dashboardStatuses, dateKeyInLima, getRegistrationSeries, shiftDateKey, type DashboardLot, type DashboardPeriod, type DashboardStatus } from "@/features/gerencia/dashboard-data";

type DashboardRole = "ADMIN" | "SUPERVISOR" | "OPERADOR";
type LotRecord = DashboardLot & { destino: string | null; creado_por: string };
type DocumentRecord = { id: string; lote_id: string };
type UserRecord = { id: string; is_active: boolean };
type DispatchSummary = { lote_id: string; estado: "PENDIENTE_FIRMA" | "APROBADO" | "RECHAZADO"; created_at: string };
type DateBounds = { start: string | null; end: string };
type DestinationFilter = "ALL" | "NONE" | "USA" | "UE" | "China";

const statusLabels: Record<DashboardStatus, string> = {
  EN_CAMPO: "En campo",
  EN_PACKING: "En Packing",
  PENDIENTE_FIRMA: "Pendiente de firma",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};
const statusColors: Record<DashboardStatus, string> = {
  EN_CAMPO: chartColors.green,
  EN_PACKING: chartColors.process,
  PENDIENTE_FIRMA: chartColors.pending,
  APROBADO: chartColors.sage,
  RECHAZADO: chartColors.rejected,
};
const destinationLabels: Record<string, string> = { USA: "Estados Unidos", UE: "Unión Europea", China: "China" };
const pageSize = 10;
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
  return lot.fundo.startsWith("DEMO ·");
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
  const [dateOrder, setDateOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
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
      setLots(loadedLots);

      if (role === "ADMIN") {
        const [documentResult, userResult] = await Promise.allSettled([
          loadAllRows((from, to) => client.from("documentos").select("id,lote_id").order("created_at", { ascending: true }).range(from, to)),
          loadAllRows((from, to) => client.from("usuarios").select("id,is_active").order("created_at", { ascending: true }).range(from, to)),
        ]);
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
      setUpdatedAt(new Date().toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las métricas autorizadas.");
    } finally {
      setLoading(false);
    }
  }, [client, role]);

  useEffect(() => { void loadData(); }, [loadData, refresh]);

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
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    const matchesSearch = !normalizedSearch || [lot.id, lot.fundo, lot.cultivo, lot.destino ?? "", statusLabels[lot.estado]]
      .some((value) => value.toLocaleLowerCase("es").includes(normalizedSearch));
    return (status === "ALL" || lot.estado === status)
      && (crop === "ALL" || lot.cultivo === crop)
      && (farm === "ALL" || lot.fundo === farm)
      && (destination === "ALL" || (destination === "NONE" ? !lot.destino : lot.destino === destination))
      && (dataMode === "ALL" || (dataMode === "DEMO" ? demo : !demo))
      && matchesSearch;
  }), [lots, status, crop, farm, destination, dataMode, search]);

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
    label: statusLabels[value],
    total: currentLots.filter((lot) => lot.estado === value).length,
    fill: value === "EN_CAMPO" ? chartColors.green : value === "EN_PACKING" ? chartColors.process : value === "PENDIENTE_FIRMA" ? chartColors.pending : value === "APROBADO" ? chartColors.sage : chartColors.rejected,
  }));
  const registeredIds = new Set(currentLots.map((lot) => lot.id));
  const documentCount = documents.filter((document) => registeredIds.has(document.lote_id)).length;
  const resolvedCount = statusCounts.find((entry) => entry.key === "APROBADO")!.total + statusCounts.find((entry) => entry.key === "RECHAZADO")!.total;
  const approvalRate = status === "ALL" && resolvedCount
    ? Math.round((statusCounts.find((entry) => entry.key === "APROBADO")!.total / resolvedCount) * 100)
    : null;
  const approvalRateDetail = status !== "ALL"
    ? "Tasa no disponible al filtrar por un estado único"
    : approvalRate === null
      ? "Tasa: sin casos resueltos"
      : `Tasa ${approvalRate}% · ${resolvedCount} resueltos (aprobados + rechazados)`;
  const pendingCount = statusCounts.filter((entry) => ["EN_CAMPO", "EN_PACKING", "PENDIENTE_FIRMA"].includes(entry.key)).reduce((sum, entry) => sum + entry.total, 0);
  const previousPending = dashboardStatuses.filter((value) => ["EN_CAMPO", "EN_PACKING", "PENDIENTE_FIRMA"].includes(value)).reduce((sum, value) => sum + (previousStatuses.get(value) ?? 0), 0);
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
    const difference = Date.parse(left.created_at) - Date.parse(right.created_at);
    return dateOrder === "newest" ? -difference : difference;
  }), [currentLots, dateOrder]);
  const pageCount = Math.max(1, Math.ceil(sortedLots.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleLots = sortedLots.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const cropsOptions = useMemo(() => [...new Set(lots.map((lot) => lot.cultivo))].sort(), [lots]);
  const farmsOptions = useMemo(() => [...new Set(lots.map((lot) => lot.fundo))].sort(), [lots]);
  const destinationsOptions = useMemo(() => [...new Set(lots.map((lot) => lot.destino).filter((value): value is string => Boolean(value)))].sort(), [lots]);

  useEffect(() => { setPage(1); }, [search, dateOrder, status, crop, farm, destination, dataMode, period, customStart, customEnd]);

  const tableDateLabel = period === "all" ? "Todo el historial" : bounds.start ? `${localDate(bounds.start)} – ${localDate(bounds.end)}` : "Sin registros";
  const roleHeading = roleCopy[role];
  const demoNotice = dataMode === "ALL" && demoCount > 0 ? `${demoCount} registros DEMO identificados por el prefijo del fundo.` : "";

  if (error) return <section className="space-y-5"><PageHeader role={role} copy={roleHeading} updatedAt={updatedAt} onRefresh={() => setRefresh((value) => value + 1)} loading={loading} /><Card><CardContent><ChartError message={error} onRetry={() => setRefresh((value) => value + 1)} /></CardContent></Card></section>;

  return <section className="space-y-5" aria-labelledby="role-dashboard-title">
    <PageHeader role={role} copy={roleHeading} updatedAt={updatedAt} onRefresh={() => setRefresh((value) => value + 1)} loading={loading} />
    <div className="grid gap-3 rounded-2xl border border-[#17251D]/10 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
      <Field label="Período"><select value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)} className={filterClass}><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="all">Todo el historial</option><option value="custom">Rango personalizado</option></select></Field>
      {period === "custom" ? <><Field label="Desde"><input type="date" value={customStart} max={today} onChange={(event) => setCustomStart(event.target.value)} className={filterClass} /></Field><Field label="Hasta"><input type="date" value={customEnd} max={today} onChange={(event) => setCustomEnd(event.target.value)} className={filterClass} /></Field></> : null}
      <Field label="Estado"><select value={status} onChange={(event) => setStatus(event.target.value as DashboardStatus | "ALL")} className={filterClass}><option value="ALL">Todos los estados</option>{dashboardStatuses.map((value) => <option value={value} key={value}>{statusLabels[value]}</option>)}</select></Field>
      <Field label="Cultivo"><select value={crop} onChange={(event) => setCrop(event.target.value)} className={filterClass}><option value="ALL">Todos los cultivos</option>{cropsOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field>
      <Field label="Fundo"><select value={farm} onChange={(event) => setFarm(event.target.value)} className={filterClass}><option value="ALL">Todos los fundos</option>{farmsOptions.map((value) => <option value={value} key={value}>{value}</option>)}</select></Field>
      {role !== "OPERADOR" && <Field label="Destino"><select value={destination} onChange={(event) => setDestination(event.target.value as DestinationFilter)} className={filterClass}><option value="ALL">Todos los destinos</option><option value="NONE">Sin destino</option>{destinationsOptions.map((value) => <option value={value} key={value}>{destinationLabels[value] ?? value}</option>)}</select></Field>}
      <Field label="Origen"><select value={dataMode} onChange={(event) => setDataMode(event.target.value as "ALL" | "REAL" | "DEMO")} className={filterClass}><option value="ALL">Reales y DEMO</option><option value="REAL">Solo registros no DEMO</option><option value="DEMO">Solo marcados DEMO</option></select></Field>
    </div>
    {rangeInvalid && <p role="alert" className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Revisa el rango personalizado: la fecha inicial debe ser anterior o igual a la fecha final.</p>}
    {demoNotice && <p role="note" className="border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950">{demoNotice} Los gráficos los incluyen porque el filtro de origen está en “Reales y DEMO”.</p>}
    <p className="text-xs text-[#526157]">{roleHeading.scope} · Zona horaria: America/Lima · {tableDateLabel}</p>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {role === "ADMIN" ? <>
        <DashboardMetric label="Lotes registrados" value={loading ? "…" : fmt(currentLots.length)} unit={loading ? undefined : "lotes"} detail="Dentro de todos los filtros activos" icon={Package} comparison={!loading && comparison ? totalChange.label : undefined} />
        <DashboardMetric label="Pendientes / en proceso" value={loading ? "…" : fmt(pendingCount)} unit={loading ? undefined : "lotes"} detail="En campo + En Packing + Pendiente de firma" icon={Warehouse} comparison={!loading && comparison ? comparePeriodCounts(pendingCount, previousPending).label : undefined} />
        <DashboardMetric label="Aprobados" value={loading ? "…" : fmt(countState(currentLots, "APROBADO"))} unit={loading ? undefined : "lotes"} detail={loading ? "Calculando dentro de filtros" : approvalRateDetail} icon={ShieldCheck} />
        <DashboardMetric label="Rechazados" value={loading ? "…" : fmt(countState(currentLots, "RECHAZADO"))} unit={loading ? undefined : "lotes"} detail="Rechazos dentro de los filtros activos" icon={AlertCircle} />
        <DashboardMetric label="Documentos asociados" value={loading ? "…" : documentsError ? "—" : fmt(documentsInPeriod)} unit={loading || documentsError ? undefined : "documentos"} detail={documentsError ? `Error al cargar: ${documentsError}` : "Adjuntos a los lotes filtrados"} icon={FileText} />
      </> : role === "SUPERVISOR" ? <>
        <DashboardMetric label="Lotes bajo supervisión" value={loading ? "…" : fmt(currentLots.length)} unit={loading ? undefined : "lotes"} detail="Con filtros y período seleccionados" icon={Package} comparison={!loading && comparison ? totalChange.label : undefined} />
        <DashboardMetric label="Pendientes de recepción" value={loading ? "…" : fmt(countState(currentLots, "EN_CAMPO"))} unit={loading ? undefined : "lotes"} detail="Estado EN_CAMPO" icon={Warehouse} />
        <DashboardMetric label="En Packing" value={loading ? "…" : fmt(countState(currentLots, "EN_PACKING"))} unit={loading ? undefined : "lotes"} detail="Estado EN_PACKING" icon={Leaf} />
        <DashboardMetric label="Enviados a Gerencia" value={loading ? "…" : dispatchError ? "—" : fmt(dispatchesPendingReview)} unit={loading || dispatchError ? undefined : "despachos"} detail={dispatchError ? "Historial no disponible; verifica la migración del flujo." : "Despachos pendientes dentro del período y filtros"} icon={ShieldCheck} />
        <DashboardMetric label="Devueltos" value={loading ? "…" : dispatchError ? "—" : fmt(dispatchesReturned)} unit={loading || dispatchError ? undefined : "despachos"} detail={dispatchError ? "Historial no disponible; verifica la migración del flujo." : "Decisiones RECHAZADO registradas por Gerencia"} icon={AlertCircle} />
      </> : <>
        <DashboardMetric label="Mis lotes registrados" value={loading ? "…" : fmt(currentLots.length)} unit={loading ? undefined : "lotes"} detail="Solo registros visibles para tu cuenta" icon={Package} comparison={!loading && comparison ? totalChange.label : undefined} />
        <DashboardMetric label="En tránsito a Packing" value={loading ? "…" : fmt(countState(currentLots, "EN_CAMPO"))} unit={loading ? undefined : "lotes"} detail="Estado EN_CAMPO" icon={Warehouse} />
        <DashboardMetric label="Pendientes de firma" value={loading ? "…" : fmt(countState(currentLots, "PENDIENTE_FIRMA"))} unit={loading ? undefined : "lotes"} detail="Estado PENDIENTE_FIRMA" icon={ShieldCheck} />
        <DashboardMetric label="Devueltos" value={loading ? "…" : fmt(countState(currentLots, "RECHAZADO"))} unit={loading ? undefined : "lotes"} detail="Pendiente de corrección según el estado actual" icon={AlertCircle} />
        <DashboardMetric label="Promedio diario" value={loading ? "…" : averagePerDay.toFixed(1)} unit={loading ? undefined : "lotes/día"} detail={`Calculado sobre ${fmt(coverageDays)} días del período`} icon={CalendarDays} />
      </>}
    </div>

    {role === "ADMIN" && <section className="space-y-3" aria-labelledby="admin-users-metrics-title"><div><h2 id="admin-users-metrics-title" className="text-lg font-bold text-[#17251D]">Accesos de usuarios</h2><p className="mt-1 text-xs text-[#526157]">Indicadores administrativos separados de los gráficos de lotes.</p></div>{usersError ? <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-900">No se pudieron cargar usuarios: {usersError}</p> : <div className="grid gap-3 sm:grid-cols-2"><DashboardMetric label="Usuarios activos" value={fmt(users.filter((user) => user.is_active).length)} unit="cuentas" detail="Perfiles con acceso habilitado" icon={Users} /><DashboardMetric label="Pendientes de activación" value={fmt(users.filter((user) => !user.is_active).length)} unit="cuentas" detail="Perfiles registrados sin acceso" icon={Users} /></div>}</section>}

    {loading ? <ChartLoading /> : currentLots.length === 0 ? <ChartEmpty label={lots.length ? "No hay coincidencias para el período y filtros seleccionados." : "No hay historial autorizado para graficar."} /> : <>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Evolución de registros" description={`${granularity === "day" ? "Lotes creados por día" : "Lotes creados por semana"}; eje Y en cantidad entera desde cero. Días cubiertos sin ingresos aparecen como cero.`}>
          <ResponsiveContainer width="100%" height={320} minWidth={0}>
            <LineChart data={trend} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#DDE5DD" strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={24} tick={{ fill: chartColors.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#CFD9CF" }} />
              <YAxis allowDecimals={false} domain={[0, "dataMax"]} width={34} tick={{ fill: chartColors.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<DashboardTooltip />} />
              <Line type="monotone" dataKey="total" name="Lotes" stroke={chartColors.forest} strokeWidth={3} dot={{ r: 3, fill: chartColors.forest }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <DashboardLegend items={[{ label: granularity === "day" ? "Registros por día" : "Registros por semana", color: chartColors.forest }]} />
        </ChartCard>
        <ChartCard title="Distribución por estado" description={`Estados actuales dentro del mismo conjunto filtrado · ${fmt(currentLots.length)} lotes.`}>
          <div className="grid items-center gap-3 sm:grid-cols-[minmax(160px,220px)_1fr]">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <PieChart>
                <Pie data={statusCounts.filter((entry) => entry.total > 0)} dataKey="total" nameKey="label" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}>
                  {statusCounts.filter((entry) => entry.total > 0).map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<DashboardTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <DashboardLegend items={statusCounts.filter((entry) => entry.total > 0).map((entry) => ({ label: entry.label, color: entry.fill, value: entry.total }))} />
          </div>
        </ChartCard>
        {role !== "OPERADOR" && destinations.length > 0 && <CategoryChart title="Lotes por destino" description="Solo lotes con un destino asignado." rows={destinations} color={chartColors.process} />}
        <CategoryChart title="Cultivos con más registros" description="Principales cultivos dentro del conjunto filtrado." rows={crops} color={chartColors.green} />
        {role === "ADMIN" && <CategoryChart title="Actividad por fundo" description="Fundos ordenados por cantidad; porcentaje del total filtrado." rows={farms.map((row) => ({ ...row, label: `${row.label} · ${Math.round((row.total / Math.max(1, currentLots.length)) * 100)}%` }))} color={chartColors.sage} />}
      </div>
      <Card className="min-w-0 rounded-2xl">
        <CardHeader className="pb-3"><CardTitle>{role === "OPERADOR" ? "Mis registros" : "Actividad de lotes"}</CardTitle><p className="mt-1 text-xs text-[#526157]">La búsqueda y los filtros se aplican a indicadores, gráficos y tabla.</p></CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-3 border-y border-[#17251D]/10 bg-[#F5F8F4]/60 p-4 sm:grid-cols-[minmax(220px,1fr)_220px]"><label className="relative block"><span className="sr-only">Buscar lotes del panel</span><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lote, fundo, cultivo…" className={filterClass + " pl-10"} /></label><label className="relative block"><span className="sr-only">Ordenar lotes por fecha</span><ArrowDownWideNarrow size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" /><select value={dateOrder} onChange={(event) => setDateOrder(event.target.value as "newest" | "oldest")} className={filterClass + " pl-10"}><option value="newest">Más recientes primero</option><option value="oldest">Más antiguos primero</option></select></label></div>
          {loading && sortedLots.length === 0 ? <ChartLoading label="Cargando actividad autorizada…" /> : sortedLots.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#526157]">No hay coincidencias en la tabla para la búsqueda.</p> : <>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Actividad de lotes que coincide con los filtros activos</caption><thead className="border-b border-[#17251D]/10 bg-[#F5F8F4] text-[10px] uppercase tracking-wider text-[#526157]"><tr><th className="px-5 py-3">Lote</th><th className="px-3 py-3">Fundo</th><th className="px-3 py-3">Cultivo</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Destino</th><th className="px-5 py-3 text-right">Registrado</th></tr></thead><tbody className="divide-y divide-[#17251D]/10">{visibleLots.map((lot) => <tr key={lot.id} className="hover:bg-[#F5F8F4]/70"><td className="px-5 py-3 font-semibold text-[#17251D]">{lot.id}</td><td className="px-3 py-3">{lot.fundo}</td><td className="px-3 py-3">{lot.cultivo}</td><td className="px-3 py-3"><StatusPill status={lot.estado} /></td><td className="px-3 py-3">{lot.destino ? destinationLabels[lot.destino] ?? lot.destino : "Sin destino"}</td><td className="whitespace-nowrap px-5 py-3 text-right text-xs text-[#526157]">{new Date(lot.created_at).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" })}</td></tr>)}</tbody></table></div>
            <div className="flex flex-col gap-3 border-t border-[#17251D]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#526157]">Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedLots.length)} de {sortedLots.length} lotes</p><div className="flex items-center gap-2"><Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}><ChevronLeft size={15} /> Anterior</Button><span className="min-w-16 text-center text-xs tabular-nums text-[#526157]">{currentPage} / {pageCount}</span><Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount}>Siguiente <ChevronRight size={15} /></Button></div></div>
          </>}
        </CardContent>
      </Card>
    </>}
  </section>;
}

const filterClass = "min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20";

function PageHeader({ role, copy, updatedAt, loading, onRefresh }: { role: DashboardRole; copy: { title: string; description: string; scope: string }; updatedAt: string; loading: boolean; onRefresh: () => void }) {
  return <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2D6A4F]">{role === "ADMIN" ? "Gerencia ejecutiva" : role === "SUPERVISOR" ? "Centro de operaciones · Packing" : "Operación de campo"}</p><h1 id="role-dashboard-title" className="mt-2 text-2xl font-bold tracking-tight text-[#17251D] sm:text-3xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#526157]">{copy.description}</p><p className="mt-2 text-xs text-[#526157]">{updatedAt ? `Actualizado ${updatedAt} · ` : ""}{copy.scope}</p></div><Button type="button" variant="outline" className="min-h-11 self-start rounded-xl sm:self-auto" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar</Button></header>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-xs font-bold text-[#526157]">{label}<span className="mt-1.5 block">{children}</span></label>;
}

function countState(lots: LotRecord[], state: DashboardStatus) {
  return lots.filter((lot) => lot.estado === state).length;
}

function countCategories(lots: LotRecord[], key: (lot: LotRecord) => string) {
  const counts = new Map<string, number>();
  for (const lot of lots) counts.set(key(lot), (counts.get(key(lot)) ?? 0) + 1);
  return [...counts].map(([label, total]) => ({ label, total })).sort((left, right) => right.total - left.total).slice(0, 7);
}

function fmt(value: number) {
  return value.toLocaleString("es-PE");
}

function CategoryChart({ title, description, rows, color }: { title: string; description: string; rows: { label: string; total: number }[]; color: string }) {
  return <ChartCard title={title} description={description}>
    {rows.length ? <ResponsiveContainer width="100%" height={300} minWidth={0}><BarChart data={rows} layout="vertical" margin={{ top: 8, right: 14, left: 8, bottom: 8 }}>
      <CartesianGrid horizontal={false} stroke="#DDE5DD" strokeDasharray="3 3" />
      <XAxis type="number" allowDecimals={false} domain={[0, "dataMax"]} tick={{ fill: chartColors.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#CFD9CF" }} />
      <YAxis type="category" dataKey="label" width={105} interval={0} tick={{ fill: chartColors.muted, fontSize: 10 }} tickLine={false} axisLine={false} />
      <Tooltip content={<DashboardTooltip />} />
      <Bar dataKey="total" name="Lotes" fill={color} radius={[0, 5, 5, 0]} isAnimationActive={false} />
    </BarChart></ResponsiveContainer> : <p className="grid h-[300px] place-items-center text-sm text-[#526157]">Sin datos en este conjunto filtrado.</p>}
    <DashboardLegend items={[{ label: "Lotes", color }]} />
  </ChartCard>;
}

function StatusPill({ status }: { status: DashboardStatus }) {
  const background = status === "RECHAZADO" ? "#FCE8E3" : status === "PENDIENTE_FIRMA" ? "#FFF1CC" : status === "APROBADO" ? "#DCF4E4" : status === "EN_PACKING" ? "#E3F0F3" : "#E8EEE7";
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-semibold text-[#17251D]" style={{ backgroundColor: background }}><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />{statusLabels[status]}</span>;
}
