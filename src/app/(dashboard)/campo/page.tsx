"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarDays, CheckCircle2, Send } from "lucide-react";
import { IAConsultorAgronomo } from "@/components/ai/IA_ConsultorAgronomo";
import { GestorDocumental } from "@/components/documentos/GestorDocumental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtimeLotes } from "@/hooks/useRealtimeLotes";
import { isLoteRow, mapLoteRow } from "@/lib/supabase/lotes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

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
  function renderTab() { switch (tab) { case "lotes": return <Card><CardHeader><CardTitle>Lotes Enviados Hoy</CardTitle></CardHeader><CardContent className="p-0"><table className="w-full text-left text-sm"><thead className="border-b border-gray-100 text-xs text-gray-500"><tr><th className="px-5 py-3">Lote</th><th className="px-3 py-3">Cultivo</th><th className="px-3 py-3">Estado</th></tr></thead><tbody>{lotes.map((lote) => <tr key={lote.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-5 py-4 font-bold">{lote.id}</td><td className="px-3 py-4">{lote.cultivo}</td><td className="px-3 py-4"><span className="bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">{lote.status}</span></td></tr>)}</tbody></table></CardContent></Card>; case "guias": return <GestorDocumental readOnly={false} documentos={documentos} />; case "registro": default: return <Card><CardHeader><CardTitle>Nuevo Lote Cosechado</CardTitle></CardHeader><CardContent><form onSubmit={form.handleSubmit(submit)} className="grid gap-5 sm:grid-cols-2"><Field label="Fundo" error={form.formState.errors.fundo?.message}><select {...form.register("fundo")} className="mt-2 h-10 w-full border border-gray-200 px-3 text-sm"><option value="">Selecciona un fundo</option><option>Fundo Tate</option><option>San José</option><option>Valle Azul · Ica</option></select></Field><Field label="Cultivo" error={form.formState.errors.cultivo?.message}><input {...form.register("cultivo")} className="mt-2 h-10 w-full border border-gray-200 px-3 text-sm" placeholder="Uva Sweet Globe" /></Field><Field label="Agroquímico" error={form.formState.errors.agroquimico?.message}><input {...form.register("agroquimico")} className="mt-2 h-10 w-full border border-gray-200 px-3 text-sm" placeholder="Nombre comercial" /></Field><Field label="Días transcurridos" error={form.formState.errors.dias?.message}><input {...form.register("dias", { valueAsNumber: true })} type="number" className="mt-2 h-10 w-full border border-gray-200 px-3 text-sm" /></Field><Field label="PPM residuales" error={form.formState.errors.ppm?.message}><input {...form.register("ppm", { valueAsNumber: true })} type="number" step="0.01" className="mt-2 h-10 w-full border border-gray-200 px-3 text-sm" /></Field><Field label="Fecha de cosecha" error={form.formState.errors.fecha?.message}><div className="relative mt-2"><CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input {...form.register("fecha")} type="date" className="h-10 w-full border border-gray-200 pl-9 pr-3 text-sm" /></div></Field><div className="flex items-end"><Button type="submit" disabled={form.formState.isSubmitting}><Send size={15} /> {form.formState.isSubmitting ? "Guardando..." : "Enviar a Packing"}</Button></div>{saveError && <p role="alert" className="text-xs font-semibold text-red-600 sm:col-span-2">{saveError}</p>}{sent && <p className="flex items-center gap-2 text-xs font-bold text-green-700 sm:col-span-2"><CheckCircle2 size={15} /> Lote registrado.</p>}</form></CardContent></Card>; } }
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-12"><section className="col-span-1 lg:col-span-9"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#C9603F]">Ingeniero Agrónomo</p><h1 className="mt-2 text-3xl font-bold">Operación de campo</h1><p className="mt-2 text-sm text-gray-500">Vista activa: {tab} · navegación sin recarga.</p></div>{loadingLotes && <p className="mb-4 text-sm text-gray-500">Cargando lotes desde Supabase...</p>}{lotesError && <p role="alert" className="mb-4 text-sm font-semibold text-red-600">{lotesError}</p>}{renderTab()}</section><aside className="col-span-1 lg:col-span-3"><IAConsultorAgronomo /></aside></div>;
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-gray-800">{label}{children}{error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}</label>; }
export default function CampoPage() { return <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando campo...</div>}><CampoWorkspace /></Suspense>; }
