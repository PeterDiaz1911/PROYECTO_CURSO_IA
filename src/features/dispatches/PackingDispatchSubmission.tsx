"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDownWideNarrow, FileUp, LoaderCircle, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Destination } from "@/store/useTraceabilityStore";

type DispatchHistory = {
  codigo: string;
  lote_id: string;
  destino: Destination;
  cajas: number;
  estado: "PENDIENTE_FIRMA" | "APROBADO" | "RECHAZADO";
  created_at: string;
  motivo_revision: string | null;
};

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;
const statusLabels: Record<DispatchHistory["estado"], string> = {
  PENDIENTE_FIRMA: "Pendiente de revisión",
  APROBADO: "Aprobado y liberado",
  RECHAZADO: "Requiere corrección",
};

function fileMimeType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "pdf" ? "application/pdf"
    : extension === "jpg" || extension === "jpeg" ? "image/jpeg"
      : extension === "png" ? "image/png"
        : extension === "webp" ? "image/webp" : "";
}

export function PackingDispatchSubmission({
  lotId,
  destination,
  boxes,
  eligible,
  received,
}: {
  lotId: string;
  destination: Destination;
  boxes: number;
  eligible: boolean;
  received: boolean;
}) {
  const { client, profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<DispatchHistory[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<DispatchHistory["estado"] | "ALL">("ALL");
  const [historyDateOrder, setHistoryDateOrder] = useState<"newest" | "oldest">("newest");

  const loadHistory = useCallback(async () => {
    if (!client || !profile?.id) return;
    const { data, error: requestError } = await client
      .from("despachos")
      .select("codigo,lote_id,destino,cajas,estado,created_at,motivo_revision")
      .eq("creado_por", profile.id)
      .order("created_at", { ascending: false });
    if (requestError) {
      setError(`No se pudo consultar el historial de despachos: ${requestError.message}`);
      return;
    }
    setHistory((data ?? []) as DispatchHistory[]);
  }, [client, profile?.id]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const visibleHistory = useMemo(() => {
    const normalizedQuery = historyQuery.trim().toLocaleLowerCase("es");
    return history
      .filter((item) => (!normalizedQuery || [item.codigo, item.lote_id, item.destino]
        .some((value) => value.toLocaleLowerCase("es").includes(normalizedQuery)))
        && (historyStatus === "ALL" || item.estado === historyStatus))
      .sort((left, right) => {
        const difference = Date.parse(left.created_at) - Date.parse(right.created_at);
        return historyDateOrder === "newest" ? -difference : difference;
      });
  }, [history, historyQuery, historyStatus, historyDateOrder]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!client || !profile?.id) {
      setError("No está disponible la sesión activa de Packing.");
      return;
    }
    if (!received) {
      setError("Primero registra la recepción del lote desde la sección Recepción.");
      return;
    }
    if (!eligible) {
      setError("El lote todavía no cumple los requisitos del destino seleccionado.");
      return;
    }
    if (!Number.isInteger(boxes) || boxes < 1 || boxes > 1000000) {
      setError("Ingresa una cantidad válida de cajas.");
      return;
    }
    if (!file) {
      setError("Adjunta el informe o ficha del despacho antes de enviarlo.");
      return;
    }
    const mimeType = fileMimeType(file);
    if (!allowedTypes.has(mimeType) || file.size < 1 || file.size > maxFileSize) {
      setError("Adjunta PDF, JPG, PNG o WebP de hasta 10 MB.");
      return;
    }

    setSubmitting(true);
    const requestId = crypto.randomUUID();
    const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(-180) || "informe";
    const storagePath = `${profile.id}/${requestId}/${safeName}`;
    let uploaded = false;
    try {
      const { error: uploadError } = await client.storage
        .from("despacho-documentos")
        .upload(storagePath, file, { contentType: mimeType, upsert: false });
      if (uploadError) throw new Error(`No se pudo subir el informe: ${uploadError.message}`);
      uploaded = true;

      const { data, error: createError } = await client.rpc("crear_despacho", {
        p_lote_id: lotId,
        p_destino: destination,
        p_cajas: boxes,
        p_storage_path: storagePath,
        p_nombre_archivo: file.name.slice(0, 180),
        p_mime_type: mimeType,
        p_size_bytes: file.size,
      });
      if (createError) throw new Error(createError.message);

      const created = data as { codigo?: string } | null;
      setNotice(`Despacho ${created?.codigo ?? "registrado"} enviado a Gerencia con el informe adjunto.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await loadHistory();
    } catch (cause) {
      if (uploaded) {
        await client.storage.from("despacho-documentos").remove([storagePath]);
      }
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el despacho.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="space-y-5">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileUp size={19} className="text-[#1B4332]" /> Enviar ficha a Gerencia</CardTitle>
        <p className="mt-1 text-sm text-gray-500">Adjunta el informe del despacho. El expediente quedará pendiente de revisión administrativa.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-3 border border-gray-100 bg-[#F5F8F4] p-4 text-sm sm:grid-cols-3">
            <p><span className="block text-xs text-gray-500">Lote</span><strong className="mt-1 block break-all">{lotId}</strong></p>
            <p><span className="block text-xs text-gray-500">Destino</span><strong className="mt-1 block">{destination}</strong></p>
            <p><span className="block text-xs text-gray-500">Cajas</span><strong className="mt-1 block">{Number.isInteger(boxes) ? boxes.toLocaleString("es-PE") : "Pendiente"}</strong></p>
          </div>
          <label className="block text-sm font-semibold text-[#17251D]">
            Informe o ficha de despacho
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block min-h-11 w-full rounded-xl border border-gray-200 bg-white p-2 text-sm file:mr-3 file:border-0 file:bg-[#E8EEE7] file:px-3 file:py-2 file:font-semibold file:text-[#1B4332]" />
            <span className="mt-1 block text-xs font-normal text-gray-500">PDF, JPG, PNG o WebP · máximo 10 MB · almacenado de forma privada.</span>
          </label>
          {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
          <Button type="submit" disabled={submitting || !received || !eligible || !Number.isInteger(boxes) || boxes < 1}>
            {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? "Subiendo y enviando…" : !received ? "Registra primero la recepción" : !eligible ? "Bloqueado por validación del lote" : "Subir informe y enviar a Gerencia"}
          </Button>
          {!received && <p className="text-xs leading-5 text-amber-800">El lote debe estar registrado como recibido por Packing antes de iniciar el despacho.</p>}
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Historial de despachos</CardTitle><p className="mt-1 text-xs text-gray-500">Estado persistente de los informes enviados por tu cuenta.</p></CardHeader>
      <CardContent className="space-y-2">
        {history.length === 0 ? <p className="text-sm text-gray-500">Todavía no hay despachos enviados desde esta cuenta.</p> : <>
          <div className="grid gap-3 border-b border-gray-100 pb-3 sm:grid-cols-[minmax(220px,1fr)_190px_200px]">
            <label className="relative block"><span className="sr-only">Buscar mis despachos</span><Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="search" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Buscar código o lote…" className="min-h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" /></label>
            <label><span className="sr-only">Filtrar historial por estado</span><select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value as DispatchHistory["estado"] | "ALL")} className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="ALL">Todos los estados</option><option value="PENDIENTE_FIRMA">Pendientes</option><option value="APROBADO">Aprobados</option><option value="RECHAZADO">Devueltos</option></select></label>
            <label className="relative"><span className="sr-only">Ordenar historial por fecha</span><ArrowDownWideNarrow size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><select value={historyDateOrder} onChange={(event) => setHistoryDateOrder(event.target.value as "newest" | "oldest")} className="min-h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20"><option value="newest">Más recientes primero</option><option value="oldest">Más antiguos primero</option></select></label>
          </div>
          {visibleHistory.length === 0 ? <p className="py-5 text-center text-sm text-gray-500">No hay envíos que coincidan con esos filtros.</p> : visibleHistory.map((item) => (
          <div key={item.codigo} className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 py-3 text-sm">
            <div><p className="font-bold text-[#17251D]">{item.codigo} · {item.destino} · {item.cajas.toLocaleString("es-PE")} cajas</p><p className="mt-1 text-xs text-gray-500">Lote {item.lote_id} · {new Date(item.created_at).toLocaleDateString("es-PE")}</p>{item.motivo_revision && <p className="mt-1 max-w-xl text-xs text-red-800">Observación: {item.motivo_revision}</p>}</div>
            <span className={`px-2.5 py-1 text-xs font-semibold ${item.estado === "APROBADO" ? "bg-green-100 text-green-800" : item.estado === "RECHAZADO" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>{statusLabels[item.estado]}</span>
          </div>
          ))}
        </>}
      </CardContent>
    </Card>
  </div>;
}