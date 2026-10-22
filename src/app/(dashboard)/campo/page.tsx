"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  Leaf,
  Search,
  Send,
  Sprout,
} from "lucide-react";
import { IAConsultorAgronomo } from "@/components/ai/IA_ConsultorAgronomo";
import { GestorDocumental } from "@/components/documentos/GestorDocumental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtimeLotes } from "@/hooks/useRealtimeLotes";
import { isLoteRow, mapLoteRow } from "@/lib/supabase/lotes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

const schema = z.object({
  fundo: z.string().min(1, "Selecciona un fundo."),
  cultivo: z.string().trim().min(2, "Indica el cultivo."),
  agroquimico: z.string().trim().min(2, "Indica el agroquímico."),
  dias: z.number().int().min(0, "Ingresa un número entero igual o mayor que cero."),
  diasCarencia: z.number().int().min(0, "Ingresa los días de carencia del producto."),
  ppm: z.number().min(0, "El valor no puede ser negativo."),
  fecha: z.string().min(1, "Selecciona una fecha."),
});
type Values = z.infer<typeof schema>;

const fieldControlClass = "mt-1.5 h-11 w-full border border-ink/15 bg-white px-3 text-sm font-normal text-ink outline-none transition placeholder:text-ink/35 focus:border-forest focus:ring-2 focus:ring-forest/10";

const tabs = [
  { id: "registro", label: "Registrar lote", icon: Sprout },
  { id: "lotes", label: "Lotes", icon: ClipboardList },
  { id: "guias", label: "Documentos", icon: FileText },
] as const;

function CampoWorkspace() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = tabs.find((item) => item.id === requestedTab)?.id ?? "registro";
  const { loading: loadingLotes, error: lotesError } = useRealtimeLotes();
  const addOrUpdateLote = useTraceabilityStore((state) => state.addOrUpdateLote);
  const setActiveLote = useTraceabilityStore((state) => state.setActiveLote);
  const lotes = useTraceabilityStore((state) => state.lotesCosecha);
  const documentos = useTraceabilityStore((state) => state.documentos);
  const [sent, setSent] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");
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
        dias_carencia: values.diasCarencia,
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

  const filteredLotes = lotes.filter((lote) =>
    [lote.id, lote.fundo, lote.cultivo, lote.status]
      .some((value) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );
  const inFieldCount = lotes.filter((lote) => lote.status === "En tránsito a Packing").length;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden bg-forest px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[32px] border-white/5" />
        <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-lime/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-lime">
              <Leaf size={15} /> Operaciones agrícolas
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Campo en marcha</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
              Registra cosechas, consulta su estado y mantén la trazabilidad de cada lote.
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80">
            <span className={`h-2 w-2 rounded-full ${loadingLotes ? "animate-pulse bg-amber-300" : lotesError ? "bg-red-300" : "bg-lime"}`} />
            {loadingLotes ? "Sincronizando" : lotesError ? "Revisar conexión" : "Sincronizado"}
          </div>
        </div>
      </header>

      <section aria-label="Resumen de operaciones" className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Lotes registrados" value={lotes.length} icon={ClipboardList} accent="text-forest" />
        <SummaryCard label="En tránsito a packing" value={inFieldCount} icon={Sprout} accent="text-[#648533]" />
        <SummaryCard label="Documentos disponibles" value={documentos.length} icon={FileText} accent="text-[#C9603F]" />
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <section className="min-w-0 xl:col-span-8">
          <nav aria-label="Secciones de campo" className="mb-4 flex gap-1 overflow-x-auto border-b border-ink/10">
            {tabs.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                href={`/campo?tab=${id}`}
                aria-current={tab === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  tab === id
                    ? "border-forest text-forest"
                    : "border-transparent text-ink/45 hover:border-ink/20 hover:text-ink"
                }`}
              >
                <Icon size={16} /> {label}
              </Link>
            ))}
          </nav>

          {loadingLotes && (
            <p role="status" className="mb-4 border border-ink/10 bg-white px-4 py-3 text-sm text-ink/60">
              Cargando lotes desde Supabase...
            </p>
          )}
          {lotesError && (
            <p role="alert" className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {lotesError}
            </p>
          )}

          {tab === "guias" ? (
            <GestorDocumental readOnly={false} documentos={documentos} />
          ) : tab === "lotes" ? (
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Lotes registrados</CardTitle>
                  <p className="mt-1 text-xs text-ink/50">Consulta el cultivo, fundo y estado de cada cosecha.</p>
                </div>
                <label className="relative block w-full sm:max-w-xs">
                  <span className="sr-only">Buscar lote</span>
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar lote, cultivo o fundo"
                    className="h-10 w-full border border-ink/15 bg-cream/40 pl-9 pr-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-forest focus:ring-2 focus:ring-forest/10"
                  />
                </label>
              </CardHeader>
              <CardContent className="pt-0">
                {filteredLotes.length === 0 ? (
                  <div className="border border-dashed border-ink/15 px-5 py-12 text-center">
                    <ClipboardList size={24} className="mx-auto text-ink/30" />
                    <p className="mt-3 text-sm font-semibold text-ink/70">
                      {search ? "No hay lotes que coincidan con tu búsqueda." : "Aún no hay lotes registrados."}
                    </p>
                    {!search && (
                      <Link href="/campo?tab=registro" className="mt-3 inline-block text-sm font-bold text-forest underline underline-offset-4">
                        Registrar el primer lote
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left text-sm">
                      <thead className="border-y border-ink/10 bg-cream/50 text-[11px] uppercase tracking-wide text-ink/50">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-bold">Lote / fundo</th>
                          <th scope="col" className="px-4 py-3 font-bold">Cultivo</th>
                          <th scope="col" className="px-4 py-3 font-bold">Cosecha</th>
                          <th scope="col" className="px-4 py-3 font-bold">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/10">
                        {filteredLotes.map((lote) => (
                          <tr key={lote.id} className="transition hover:bg-cream/50">
                            <td className="px-4 py-4">
                              <p className="font-bold text-ink">{lote.id}</p>
                              <p className="mt-1 text-xs text-ink/50">{lote.fundo}</p>
                            </td>
                            <td className="px-4 py-4 font-medium text-ink/75">{lote.cultivo}</td>
                            <td className="px-4 py-4 text-ink/60">{lote.fechaCosecha}</td>
                            <td className="px-4 py-4"><StatusBadge status={lote.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b border-ink/10">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-lime/30 text-forest">
                    <FlaskConical size={19} />
                  </div>
                  <div>
                    <CardTitle>Registrar nueva cosecha</CardTitle>
                    <p className="mt-1 text-xs leading-5 text-ink/50">
                      Completa los datos del lote y envíalos a packing para continuar la trazabilidad.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={form.handleSubmit(submit)} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <Field label="Fundo" error={form.formState.errors.fundo?.message}>
                    <select {...form.register("fundo")} className={fieldControlClass}>
                      <option value="">Selecciona un fundo</option>
                      <option>Fundo Tate</option>
                      <option>San José</option>
                      <option>Valle Azul · Ica</option>
                    </select>
                  </Field>
                  <Field label="Cultivo" error={form.formState.errors.cultivo?.message}>
                    <input {...form.register("cultivo")} className={fieldControlClass} placeholder="Ej. Uva Sweet Globe" />
                  </Field>
                  <Field label="Agroquímico aplicado" error={form.formState.errors.agroquimico?.message}>
                    <input {...form.register("agroquimico")} className={fieldControlClass} placeholder="Nombre comercial del producto" />
                  </Field>
                  <Field label="Días de carencia del producto" error={form.formState.errors.diasCarencia?.message}>
                    <input {...form.register("diasCarencia", { valueAsNumber: true })} type="number" min="0" step="1" className={fieldControlClass} placeholder="Ej. 14" />
                  </Field>
                  <Field label="Días transcurridos desde la aplicación" error={form.formState.errors.dias?.message}>
                    <input {...form.register("dias", { valueAsNumber: true })} type="number" min="0" step="1" className={fieldControlClass} placeholder="Ej. 18" />
                  </Field>
                  <Field label="PPM residuales" error={form.formState.errors.ppm?.message}>
                    <input {...form.register("ppm", { valueAsNumber: true })} type="number" min="0" step="0.01" className={fieldControlClass} placeholder="Ej. 0.42" />
                  </Field>
                  <Field label="Fecha de cosecha" error={form.formState.errors.fecha?.message}>
                    <div className="relative">
                      <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                      <input {...form.register("fecha")} type="date" className={`${fieldControlClass} pl-10`} />
                    </div>
                  </Field>
                  <div className="flex items-end">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full justify-center sm:w-auto">
                      <Send size={15} />
                      {form.formState.isSubmitting ? "Guardando lote..." : "Enviar a packing"}
                    </Button>
                  </div>
                  {saveError && (
                    <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">
                      {saveError}
                    </p>
                  )}
                  {sent && (
                    <p role="status" className="flex items-center gap-2 border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 sm:col-span-2">
                      <CheckCircle2 size={16} /> Lote registrado y enviado correctamente a packing.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="xl:col-span-4">
          <IAConsultorAgronomo />
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Leaf;
  accent: string;
}) {
  return (
    <Card className="flex items-center gap-4 px-5 py-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center bg-cream ${accent}`}>
        <Icon size={19} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-ink">{value}</p>
        <p className="mt-1.5 text-xs font-medium text-ink/55">{label}</p>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = status === "Aprobado"
    ? "bg-green-100 text-green-800"
    : status === "Rechazado"
      ? "bg-red-100 text-red-800"
      : status === "En tránsito a Packing"
        ? "bg-blue-100 text-blue-800"
        : "bg-amber-100 text-amber-800";

  return <span className={`inline-flex whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold ${style}`}>{status}</span>;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold text-ink/80">
      {label}
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

export default function CampoPage() {
  return (
    <Suspense fallback={<div role="status" className="p-6 text-sm text-ink/55">Cargando operaciones de campo...</div>}>
      <CampoWorkspace />
    </Suspense>
  );
}
