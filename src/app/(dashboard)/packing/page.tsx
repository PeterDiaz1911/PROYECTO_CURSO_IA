"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowDownWideNarrow,
  BadgeCheck,
  Boxes,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { IAValidadorPacking } from "@/components/ai/IA_ValidadorPacking";
import { GestorDocumental } from "@/components/documentos/GestorDocumental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtimeLotes } from "@/hooks/useRealtimeLotes";
import { useTraceabilityStore, type Destination, type HarvestLotRecord } from "@/store/useTraceabilityStore";
import { useAuth } from "@/features/auth/AuthProvider";
import { PackingDispatchSubmission } from "@/features/dispatches/PackingDispatchSubmission";
import { RoleAnalyticsDashboard } from "@/features/dashboards/RoleAnalyticsDashboard";

const packingTabs = [
  { id: "panel", label: "Resumen operativo", icon: PackageCheck },
  { id: "recepcion", label: "Recepción de lotes", icon: ClipboardCheck },
  { id: "salida", label: "Control de salida", icon: Truck },
  { id: "certificados", label: "Documentación", icon: FileCheck2 },
] as const;

const tabDescriptions: Record<string, string> = {
  panel: "Coordina la recepción, preparación y despacho de fruta para exportación.",
  recepcion: "Recibe fruta desde campo y consulta el estado de cada lote.",
  salida: "Prepara el despacho según el destino y los requisitos fitosanitarios.",
  certificados: "Administra los documentos que respaldan cada operación de packing.",
};

function PackingWorkspace() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "panel";
  const { client } = useAuth();
  const { loading: loadingLotes, error: lotesError } = useRealtimeLotes();
  const lotes = useTraceabilityStore((state) => state.lotesCosecha);
  const activeLote = useTraceabilityStore((state) => state.activeLote);
  const documentos = useTraceabilityStore((state) => state.documentos);
  const orders = useTraceabilityStore((state) => state.orders);
  const destination = useTraceabilityStore((state) => state.selectedDestination);
  const setDestination = useTraceabilityStore((state) => state.setDestination);
  const setActiveLote = useTraceabilityStore((state) => state.setActiveLote);
  const addOrUpdateLote = useTraceabilityStore((state) => state.addOrUpdateLote);
  const [boxes, setBoxes] = useState(420);
  const [receivingLotId, setReceivingLotId] = useState<string | null>(null);
  const [receiveError, setReceiveError] = useState("");
  const [receiveNotice, setReceiveNotice] = useState("");
  const selectedLot = lotes.find((lot) => lot.id === activeLote.id);
  const approved = activeLote.dias >= activeLote.diasRequeridos
    && activeLote.ppm <= (destination === "UE" ? 0.3 : 0.5);
  const currentTab = packingTabs.find((item) => item.id === tab) ?? packingTabs[0];

  async function receiveLot(lot: HarvestLotRecord) {
    if (!client) {
      setReceiveError("No está disponible la conexión con Supabase.");
      return;
    }
    setReceivingLotId(lot.id);
    setReceiveError("");
    setReceiveNotice("");
    const { data, error: requestError } = await client
      .from("lotes")
      .update({ estado: "EN_PACKING" })
      .eq("id", lot.id)
      .eq("estado", "EN_CAMPO")
      .select("id")
      .maybeSingle();
    if (requestError || !data) {
      setReceiveError(requestError?.message ?? "El lote ya no está en tránsito o no puede recibirse.");
      setReceivingLotId(null);
      return;
    }
    const received = { ...lot, status: "Recibido" as const };
    addOrUpdateLote(received);
    setActiveLote(received);
    setReceiveNotice(`Lote ${lot.id} recibido en Packing. Ya puede prepararse para despacho.`);
    setReceivingLotId(null);
  }

  function renderTab() {
    switch (tab) {
      case "recepcion":
        return (
          <ReceptionView
            lots={lotes}
            activeLotId={activeLote.id}
            onSelect={setActiveLote}
            onReceive={(lot) => void receiveLot(lot)}
            receivingLotId={receivingLotId}
            error={receiveError}
            notice={receiveNotice}
          />
        );
      case "salida":
        return (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck size={19} className="text-[#1B4332]" />
                  Preparación de despacho
                </CardTitle>
                <p className="mt-1 text-sm text-gray-500">
                  Configura el mercado y revisa el lote antes de preparar la salida.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    País o mercado de destino
                    <select
                      value={destination}
                      onChange={(event) => setDestination(event.target.value as Destination)}
                      className="mt-2 h-11 w-full border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#1B4332]"
                    >
                      <option value="USA">Estados Unidos</option>
                      <option value="UE">Unión Europea</option>
                      <option value="China">China</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Cajas para preparar
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={boxes}
                      onChange={(event) => setBoxes(Number(event.target.value))}
                      className="mt-2 h-11 w-full border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#1B4332]"
                    />
                  </label>
                </div>
                <div className={`flex items-start gap-3 border p-4 ${approved ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                  {approved ? <BadgeCheck size={19} className="mt-0.5 shrink-0" /> : <Clock3 size={19} className="mt-0.5 shrink-0" />}
                  <div>
                    <p className="text-sm font-bold">{approved ? "Lote apto para continuar" : "Validación fitosanitaria pendiente"}</p>
                    <p className="mt-1 text-xs leading-5">
                      Lote {activeLote.id}: {activeLote.dias} días de carencia (mínimo {activeLote.diasRequeridos}) · {activeLote.ppm} ppm.
                      {approved ? " Puedes continuar con la preparación para el mercado seleccionado." : " Revisa los requisitos antes de avanzar con el despacho."}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-5 text-gray-400">
                  La habilitación se valida nuevamente en Supabase al enviar el expediente. Solo los lotes recibidos por Packing pueden pasar a revisión de Gerencia.
                </p>
              </CardContent>
            </Card>
            <PackingDispatchSubmission
              lotId={activeLote.id}
              destination={destination}
              boxes={boxes}
              eligible={approved}
              received={selectedLot?.status === "Recibido"}
            />
            </div>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Lote seleccionado</CardTitle>
                <p className="mt-1 text-xs text-gray-500">Datos asociados a la trazabilidad.</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Detail label="Cultivo" value={activeLote.cultivo} />
                <Detail label="Fundo" value={activeLote.fundo} />
                <Detail label="Agroquímico" value={activeLote.agroquimico} />
                <Detail label="Estado" value={activeLote.estado} />
              </CardContent>
            </Card>
          </div>
        );
      case "certificados":
        return <GestorDocumental readOnly={false} documentos={documentos} />;
      case "panel":
      default:
        return <RoleAnalyticsDashboard role="SUPERVISOR" />;
    }
  }

  return (
    <div className="space-y-6">
      {tab !== "panel" && <header className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#C9603F]">Centro de operaciones · Packing</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#17211f]">{currentTab.label}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{tabDescriptions[tab] ?? tabDescriptions.panel}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 border border-green-100 bg-green-50 px-3 py-2 text-xs font-semibold text-[#1B4332]">
          <span className="h-2 w-2 rounded-full bg-green-600" />
          Temporada de exportación 2026
        </div>
      </header>}

      <nav aria-label="Secciones de packing" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {packingTabs.map(({ id, label, icon: Icon }) => {
          const selected = tab === id;
          return (
            <Link
              key={id}
              href={`/packing?tab=${id}`}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-12 items-center gap-2 border px-3 py-2 text-xs font-bold transition sm:text-sm ${selected ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-[#1B4332]/40 hover:text-[#1B4332]"}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {loadingLotes && <p role="status" className="text-sm text-gray-500">Sincronizando lotes de recepción...</p>}
      {lotesError && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{lotesError}</p>}

      <div className="grid min-h-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">{renderTab()}</section>
        <aside className="min-w-0 self-start xl:sticky xl:top-6"><IAValidadorPacking /></aside>
      </div>
    </div>
  );
}

function PackingOverview({
  lotCount,
  orderCount,
  pendingOrders,
  boxCount,
  documentCount,
}: {
  lotCount: number;
  orderCount: number;
  pendingOrders: number;
  boxCount: number;
  documentCount: number;
}) {
  const serviceSteps = [
    { title: "Recepción", description: "Ingreso y selección de lotes", icon: Warehouse, tab: "recepcion", state: "01" },
    { title: "Acondicionamiento", description: "Preparación según el pedido", icon: Boxes, tab: "salida", state: "02" },
    { title: "Control de salida", description: "Validación por mercado", icon: ShieldCheck, tab: "salida", state: "03" },
    { title: "Documentación", description: "Soporte para exportación", icon: FileCheck2, tab: "certificados", state: "04" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <Metric label="Lotes recibidos" value={String(lotCount)} detail="Trazabilidad desde campo" icon={Warehouse} />
        <Metric label="Cajas en órdenes" value={boxCount.toLocaleString("es-PE")} detail={`${orderCount} órdenes registradas`} icon={Boxes} />
        <Metric label="Órdenes por atender" value={String(pendingOrders)} detail="Pendientes o en revisión" icon={Clock3} />
        <Metric label="Documentos disponibles" value={String(documentCount)} detail="Certificados y guías" icon={FileCheck2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Servicio integral de packing</CardTitle>
          <p className="mt-1 text-sm text-gray-500">Seguimiento de las etapas que convierten la cosecha en un despacho listo para exportar.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {serviceSteps.map(({ title, description, icon: Icon, tab, state }) => (
              <Link key={title} href={`/packing?tab=${tab}`} className="group border border-gray-100 bg-gray-50 p-4 transition hover:border-[#1B4332]/30 hover:bg-green-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest text-[#C9603F]">ETAPA {state}</span>
                  <Icon size={18} className="text-[#1B4332]" />
                </div>
                <p className="mt-4 text-sm font-bold text-[#17211f]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1B4332]">
                  Abrir sección <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atención de órdenes</CardTitle>
            <p className="mt-1 text-xs text-gray-500">Estado de las órdenes de acondicionamiento y despacho.</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between border-t border-gray-100 py-3">
              <span className="text-sm text-gray-600">Órdenes registradas</span>
              <span className="font-bold text-[#1B4332]">{orderCount}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 py-3">
              <span className="text-sm text-gray-600">Pendientes o en revisión</span>
              <span className="font-bold text-amber-700">{pendingOrders}</span>
            </div>
            <Link href="/packing?tab=salida" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#1B4332] hover:text-[#C9603F]">
              Ir a control de salida <ArrowRight size={15} />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Control y trazabilidad</CardTitle>
            <p className="mt-1 text-xs text-gray-500">La revisión contextual ayuda a preparar cada lote según su destino.</p>
          </CardHeader>
          <CardContent className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-green-50 text-[#1B4332]"><ShieldCheck size={20} /></span>
            <div>
              <p className="text-sm font-bold text-gray-800">Validación fitosanitaria asistida</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">Consulta el estado del lote activo, el destino seleccionado y la documentación antes de confirmar una preparación.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReceptionView({
  lots,
  activeLotId,
  onSelect,
  onReceive,
  receivingLotId,
  error,
  notice,
}: {
  lots: HarvestLotRecord[];
  activeLotId: string;
  onSelect: (lot: HarvestLotRecord) => void;
  onReceive: (lot: HarvestLotRecord) => void;
  receivingLotId: string | null;
  error: string;
  notice: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<HarvestLotRecord["status"] | "all">("all");
  const [dateOrder, setDateOrder] = useState<"newest" | "oldest">("newest");
  const visibleLots = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return lots.filter((lot) => {
      const matchesQuery = !normalizedQuery || [lot.id, lot.cultivo, lot.fundo]
        .some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery));
      return matchesQuery && (statusFilter === "all" || lot.status === statusFilter);
    }).sort((left, right) => {
      const difference = Date.parse(left.fechaCosecha) - Date.parse(right.fechaCosecha);
      return dateOrder === "newest" ? -difference : difference;
    });
  }, [lots, query, statusFilter, dateOrder]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Warehouse size={19} className="text-[#1B4332]" />
          Recepción desde campo
        </CardTitle>
        <p className="mt-1 text-sm text-gray-500">Selecciona un lote para revisar su información y continuar con el proceso.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
        {lots.length > 0 && <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_190px_200px]">
          <label className="relative block"><span className="sr-only">Buscar lotes</span><Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lote, fundo o cultivo…" className="min-h-10 w-full border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" /></label>
          <label><span className="sr-only">Filtrar recepción por estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as HarvestLotRecord["status"] | "all")} className="min-h-10 w-full border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="all">Todos los estados</option><option value="En tránsito a Packing">En tránsito</option><option value="Recibido">Recibidos</option><option value="Procesando">En proceso</option><option value="Aprobado">Aprobados</option><option value="Rechazado">Devueltos</option></select></label>
          <label className="relative"><span className="sr-only">Ordenar lotes por fecha de cosecha</span><ArrowDownWideNarrow size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><select value={dateOrder} onChange={(event) => setDateOrder(event.target.value as "newest" | "oldest")} className="min-h-10 w-full border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="newest">Cosecha más reciente</option><option value="oldest">Cosecha más antigua</option></select></label>
        </div>}
        {lots.length === 0 ? (
          <div className="border border-dashed border-gray-200 px-4 py-10 text-center">
            <PackageCheck size={25} className="mx-auto text-gray-400" />
            <p className="mt-3 text-sm font-semibold text-gray-700">No hay lotes disponibles</p>
            <p className="mt-1 text-xs text-gray-500">Los lotes enviados desde campo aparecerán aquí.</p>
          </div>
        ) : visibleLots.length === 0 ? <p className="py-7 text-center text-sm text-gray-500">No hay lotes que coincidan con esos filtros.</p> : visibleLots.map((lot) => {
          const selected = activeLotId === lot.id;
          return <div key={lot.id} className={`border p-4 transition ${selected ? "border-[#1B4332] bg-green-50 ring-1 ring-[#1B4332]/10" : "border-gray-100 bg-white hover:border-[#1B4332]/40"}`}>
            <button type="button" onClick={() => onSelect(lot)} aria-pressed={selected} className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-[#17211f]">{lot.id}</p><span className="bg-white px-2 py-1 text-[10px] font-bold text-[#1B4332]">{lot.status}</span></div>
              <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-3"><span>{lot.cultivo}</span><span>{lot.fundo}</span><span>Cosecha: {lot.fechaCosecha}</span></div>
            </button>
            {lot.status === "En tránsito a Packing" && <Button type="button" variant="outline" className="mt-3 min-h-9" disabled={receivingLotId === lot.id} onClick={() => onReceive(lot)}>{receivingLotId === lot.id ? "Registrando recepción…" : "Registrar recepción"}</Button>}
          </div>;
        })}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof PackageCheck }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B4332]">{value}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center bg-green-50 text-[#1B4332]"><Icon size={18} /></span>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">{detail}</p>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export default function PackingPage() {
  return <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando centro de packing...</div>}><PackingWorkspace /></Suspense>;
}
