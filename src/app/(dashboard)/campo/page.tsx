"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, CheckCircle2, FileText, Leaf, Send, Sprout } from "lucide-react";
import { IAConsultorAgronomo } from "@/components/ai/IA_ConsultorAgronomo";
import { GestorDocumental } from "@/components/documentos/GestorDocumental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtimeLotes } from "@/hooks/useRealtimeLotes";
import { isLoteRow, mapLoteRow } from "@/lib/supabase/lotes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";
import { RoleAnalyticsDashboard } from "@/features/dashboards/RoleAnalyticsDashboard";

const schema = z.object({ fundo: z.string().min(1, "Selecciona un fundo."), cultivo: z.string().min(2, "Indica el cultivo."), agroquimico: z.string().min(2, "Indica el agroquímico."), dias: z.number().min(0, "No puede ser negativo."), ppm: z.number().min(0, "No puede ser negativo."), fecha: z.string().min(1, "Selecciona una fecha.") });
type Values = z.infer<typeof schema>;

function CampoWorkspace() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "registro";
  const { loading: loadingLotes, error: lotesError } = useRealtimeLotes();
  const addOrUpdateLote = useTraceabilityStore((state) => state.addOrUpdateLote);
  const setActiveLote = useTraceabilityStore((state) => state.setActiveLote);
  const lotes = useTraceabilityStore((state) => state.lotesCosecha);
  const documentos = useTraceabilityStore((state) => state.documentos);
  const [sent, setSent] = useState(false);
  const [saveError, setSaveError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const reduceMotion = useReducedMotion();

  async function submit(values: Values) {
    setSaveError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSaveError("Supabase no está configurado. No se guardó el lote.");
      return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setSaveError(authError?.message ?? "Inicia sesión con Supabase para registrar un lote.");
      return;
    }

    const { data, error } = await supabase
      .from("lotes")
      .insert({
        fundo: values.fundo,
        cultivo: values.cultivo,
        agroquimico: values.agroquimico,
        ppm: values.ppm,
        dias_transcurridos: values.dias,
        dias_carencia: 14,
        fecha_cosecha: values.fecha,
        estado: "EN_CAMPO",
        creado_por: user.id,
      })
      .select("*")
      .single();

    if (error) {
      setSaveError(`No se pudo guardar el lote: ${error.message}`);
      return;
    }
    if (!isLoteRow(data)) {
      setSaveError("Supabase guardó el lote, pero devolvió datos incompletos.");
      return;
    }

    const lote = mapLoteRow(data);
    addOrUpdateLote(lote);
    setActiveLote(lote);
    setSent(true);
    form.reset();
    window.setTimeout(() => setSent(false), 3000);
  }

  if (tab === "panel") {
    return <RoleAnalyticsDashboard role="OPERADOR" />;
  }

  const inputClass = "mt-2 h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3.5 text-sm text-[#17251D] outline-none transition placeholder:text-gray-400 focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20";

  function statusBadgeStyle(status: string) {
    if (status === "Aprobado") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20";
    if (status === "Rechazado") return "bg-red-50 text-red-800 ring-1 ring-red-600/20";
    if (status === "Recibido" || status === "Procesando") return "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20";
    return "bg-sky-50 text-sky-800 ring-1 ring-sky-600/20";
  }

  function renderTab() {
    switch (tab) {
      case "lotes":
        return (
          <Card className="overflow-hidden rounded-2xl border-[#17251D]/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#17251D]/10 bg-[#F5F8F4]/60">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg"><Sprout size={18} className="text-[#2D6A4F]" /> Lotes Enviados Hoy</CardTitle>
                <p className="mt-1 text-xs text-[#526157]">Sincronización en tiempo real con recepción de Packing.</p>
              </div>
              <span className="rounded-full bg-[#E8EEE7] px-3 py-1 text-xs font-bold tabular-nums text-[#1B4332]">{lotes.length} registros</span>
            </CardHeader>
            <CardContent className="p-0">
              {lotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8EEE7] text-[#1B4332]"><Leaf size={22} /></span>
                  <p className="mt-3 text-sm font-bold text-[#17251D]">Aún no hay lotes enviados</p>
                  <p className="mt-1 max-w-xs text-xs text-[#526157]">Registra una cosecha en la pestaña de registro para enviarla a Packing.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#17251D]/10 bg-[#F5F8F4] text-[10px] font-bold uppercase tracking-wider text-[#526157]">
                      <tr><th className="px-5 py-3.5">Lote</th><th className="px-3 py-3.5">Fundo</th><th className="px-3 py-3.5">Cultivo</th><th className="px-5 py-3.5 text-right">Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#17251D]/10">
                      {lotes.map((lote) => (
                        <tr key={lote.id} className="transition-colors hover:bg-[#F5F8F4]/70">
                          <td className="px-5 py-4 font-mono text-xs font-bold text-[#1B4332]">{lote.id}</td>
                          <td className="px-3 py-4 text-xs font-medium text-[#526157]">{lote.fundo}</td>
                          <td className="px-3 py-4 font-semibold text-[#17251D]">{lote.cultivo}</td>
                          <td className="px-5 py-4 text-right">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeStyle(lote.status)}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {lote.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "guias":
        return <GestorDocumental readOnly={false} documentos={documentos} />;
      case "registro":
      default:
        return (
          <Card className="rounded-2xl border-[#17251D]/10 shadow-sm">
            <CardHeader className="border-b border-[#17251D]/10 bg-[#F5F8F4]/60">
              <CardTitle className="flex items-center gap-2 text-lg"><Leaf size={18} className="text-[#2D6A4F]" /> Nuevo Lote Cosechado</CardTitle>
              <p className="mt-1 text-xs text-[#526157]">Completa los parámetros fitosanitarios antes de remitir la fruta a Packing.</p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={form.handleSubmit(submit)} className="grid gap-5 sm:grid-cols-2">
                <Field label="Fundo" error={form.formState.errors.fundo?.message}>
                  <select {...form.register("fundo")} className={inputClass}>
                    <option value="">Selecciona un fundo</option>
                    <option>Fundo Tate</option>
                    <option>San José</option>
                    <option>Valle Azul · Ica</option>
                  </select>
                </Field>
                <Field label="Cultivo" error={form.formState.errors.cultivo?.message}>
                  <input {...form.register("cultivo")} className={inputClass} placeholder="Uva Sweet Globe" />
                </Field>
                <Field label="Agroquímico" error={form.formState.errors.agroquimico?.message}>
                  <input {...form.register("agroquimico")} className={inputClass} placeholder="Nombre comercial" />
                </Field>
                <Field label="Días transcurridos" error={form.formState.errors.dias?.message}>
                  <input {...form.register("dias", { valueAsNumber: true })} type="number" className={inputClass} placeholder="Ej. 18" />
                </Field>
                <Field label="PPM residuales" error={form.formState.errors.ppm?.message}>
                  <input {...form.register("ppm", { valueAsNumber: true })} type="number" step="0.01" className={inputClass} placeholder="Ej. 0.25" />
                </Field>
                <Field label="Fecha de cosecha" error={form.formState.errors.fecha?.message}>
                  <div className="relative mt-2">
                    <CalendarDays size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#526157]" />
                    <input {...form.register("fecha")} type="date" className="h-11 w-full rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3.5 text-sm text-[#17251D] outline-none transition focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" />
                  </div>
                </Field>
                <div className="flex items-end pt-1 sm:col-span-2">
                  <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 w-full rounded-xl px-6 shadow-sm transition-transform active:scale-[0.99] sm:w-auto">
                    <Send size={15} /> {form.formState.isSubmitting ? "Guardando..." : "Enviar a Packing"}
                  </Button>
                </div>
                {saveError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 sm:col-span-2">{saveError}</p>}
                <AnimatePresence>
                  {sent && (
                    <motion.p
                      initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 sm:col-span-2"
                    >
                      <CheckCircle2 size={16} /> Lote registrado y enviado a Packing correctamente.
                    </motion.p>
                  )}
                </AnimatePresence>
              </form>
            </CardContent>
          </Card>
        );
    }
  }

  return (
    <div className="grid min-h-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 lg:col-span-1">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#C9603F]">Ingeniero Agrónomo</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#17251D]">Operación de campo</h1>
          <p className="mt-1.5 text-sm text-[#526157]">Gestión de cosecha, parámetros fitosanitarios y envío hacia planta.</p>
        </div>
        {loadingLotes && (
          <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-[#17251D]/10 bg-white p-4 text-sm text-[#526157]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2D6A4F] border-t-transparent" />
            Sincronizando lotes de campo...
          </div>
        )}
        {lotesError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700">{lotesError}</p>}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </section>
      <aside className="min-w-0 lg:col-span-1"><IAConsultorAgronomo /></aside>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-gray-800">{label}{children}{error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}</label>; }
export default function CampoPage() { return <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando campo...</div>}><CampoWorkspace /></Suspense>; }