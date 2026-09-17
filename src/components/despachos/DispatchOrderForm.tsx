"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayIso = today.toISOString().slice(0, 10);
const schema = z.object({ loteId: z.string().min(1, "Selecciona un lote."), destino: z.enum(["USA", "Unión Europea", "China"], { message: "Selecciona un país de destino." }), fechaZarpe: z.string().min(1, "Selecciona una fecha de zarpe.").refine((value) => value >= todayIso, "La fecha no puede estar en el pasado."), notas: z.string().max(1_000, "Las notas no pueden superar 1,000 caracteres.").optional() });
type DispatchFormValues = z.infer<typeof schema>;

export function DispatchOrderForm({ onSubmit }: { onSubmit?: (values: DispatchFormValues) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<DispatchFormValues>({ resolver: zodResolver(schema), defaultValues: { loteId: "", destino: undefined, fechaZarpe: "", notas: "" } });
  function submit(values: DispatchFormValues) { onSubmit?.(values); reset(); }
  return <Card className="max-w-2xl"><CardHeader><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rust">Logística de salida</p><CardTitle className="mt-2 text-2xl">Generar orden de despacho</CardTitle><CardDescription>Completa los datos para iniciar la validación documental del embarque.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit(submit)} noValidate className="space-y-5"><Field label="ID del lote" error={errors.loteId?.message}><select {...register("loteId")} className="h-10 w-full border border-ink/15 bg-white px-3 text-sm outline-none focus:border-forest"><option value="">Selecciona un lote</option><option value="LOT-24091">LOT-24091 · Uva Sweet Globe</option><option value="LOT-24088">LOT-24088 · Palta Hass</option><option value="LOT-24082">LOT-24082 · Arándano Biloxi</option></select></Field><Field label="País de destino" error={errors.destino?.message}><select {...register("destino")} className="h-10 w-full border border-ink/15 bg-white px-3 text-sm outline-none focus:border-forest"><option value="">Selecciona un destino</option><option value="USA">USA</option><option value="Unión Europea">Unión Europea</option><option value="China">China</option></select></Field><Field label="Fecha estimada de zarpe" error={errors.fechaZarpe?.message}><div className="relative"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" /><input {...register("fechaZarpe")} type="date" min={todayIso} className="h-10 w-full border border-ink/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-forest" /></div></Field><Field label="Notas de inspección" error={errors.notas?.message}><textarea {...register("notas")} rows={4} placeholder="Añade observaciones relevantes del control de calidad..." className="w-full resize-y border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-ink/35 focus:border-forest" /></Field><div className="flex justify-end border-t border-ink/10 pt-5"><Button type="submit" disabled={isSubmitting}><CheckCircle2 size={16} />{isSubmitting ? "Generando..." : "Generar orden"}</Button></div></form></CardContent></Card>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div><label className="mb-2 block text-xs font-bold text-ink">{label}</label>{children}{error && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}</div>; }
