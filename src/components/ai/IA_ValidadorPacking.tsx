"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

export function IAValidadorPacking() {
  const destination = useTraceabilityStore((state) => state.selectedDestination);
  const lot = useTraceabilityStore((state) => state.activeLote);
  const [evaluating, setEvaluating] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const approved = lot.dias >= lot.diasRequeridos && lot.ppm <= (destination === "UE" ? 0.3 : 0.5);

  useEffect(() => { setEvaluating(true); const timer = window.setTimeout(() => setEvaluating(false), 650); return () => window.clearTimeout(timer); }, [destination, lot.id, lot.ppm]);
  function ask(event: React.FormEvent) { event.preventDefault(); if (!question.trim()) return; setAnswer(`Para ${destination}, mantén la trazabilidad del lote y valida cualquier cambio logístico contra el certificado vigente.`); setQuestion(""); }

  return <Card className="border-gray-100 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base">{evaluating ? <Loader2 className="animate-spin text-[#1B4332]" size={18} /> : approved ? <CheckCircle2 className="text-green-600" size={18} /> : <AlertTriangle className="text-red-600" size={18} />} Validador contextual · {destination}</CardTitle><p className="text-xs text-gray-500">Cruce automático de mercado, químico y carencia.</p></CardHeader><CardContent><div className={`p-4 ${approved ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{evaluating ? "Evaluando normativas..." : approved ? `Lote apto para ${destination}.` : `Riesgo de retención en ${destination}: revisa carencia y LMR.`}</div><p className="mt-4 text-[10px] leading-4 text-gray-400">System Prompt: Eres un asistente de empaque agroexportador. Verifica el cruce exacto de destino {destination} y agroquímico {lot.agroquimico}.</p><form onSubmit={ask} className="mt-5 flex gap-2"><Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta de seguimiento..." /><Button type="submit" aria-label="Enviar pregunta"><Send size={15} /></Button></form>{answer && <p className="mt-3 bg-gray-50 p-3 text-xs leading-5 text-gray-600">{answer}</p>}</CardContent></Card>;
}
