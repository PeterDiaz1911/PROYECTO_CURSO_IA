"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2, Send, ShieldAlert, Sparkles, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Lote } from "@/components/lotes/LotesDataTable";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  risk?: boolean;
};

export function ContextualAssistant({ lote, open, onClose }: { lote: Lote | null; open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", text: "He cargado el contexto fitosanitario del lote. ¿Qué deseas validar?" },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  if (!open || !lote) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    const selectedLote = lote;
    if (!selectedLote) return;

    setMessages((current) => [...current, { id: Date.now(), role: "user", text }]);
    setDraft("");
    setSending(true);

    window.setTimeout(() => {
      const hasRisk = selectedLote.diasCarencia < selectedLote.diasRequeridos;
      const response = hasRisk
        ? `Detecto un riesgo: faltan ${selectedLote.diasRequeridos - selectedLote.diasCarencia} días de carencia para liberar este lote.`
        : "El periodo de carencia está cumplido según los datos disponibles del lote.";
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", text: response, risk: hasRisk }]);
      setSending(false);
    }, 550);
  }

  return (
    <>
      <button aria-label="Cerrar asistente" onClick={onClose} className="fixed inset-0 z-40 bg-ink/35" />
      <aside role="dialog" aria-modal="true" aria-labelledby="assistant-title" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-ink/10 bg-cream shadow-2xl">
        <header className="flex items-start justify-between border-b border-ink/10 bg-white px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-emerald-100 text-emerald-700"><CheckCircle2 size={20} /></div>
            <div><h2 id="assistant-title" className="font-display text-lg font-bold">Auditoría Fitosanitaria IA</h2><p className="mt-1 text-xs text-ink/50">Análisis contextual del lote seleccionado</p></div>
          </div>
          <Button variant="ghost" aria-label="Cerrar panel" className="h-9 min-h-9 px-2" onClick={onClose}><X size={18} /></Button>
        </header>

        <Card className="m-4 border-forest/15 bg-forest/[.04]">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Contexto activo · {lote.id}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3"><ContextItem label="Cultivo" value={lote.cultivo} /><ContextItem label="Químico" value={lote.agroquimico} /><ContextItem label="LMR de referencia" value="0.50 ppm" /><ContextItem label="Destino" value={lote.mercadoDestino} /></CardContent>
        </Card>

        <ScrollArea className="flex-1 px-5 py-3" aria-live="polite">
          {messages.map((message) => <div key={message.id} className={cn("mb-4 flex gap-2", message.role === "user" && "flex-row-reverse")}>
            <Avatar className={message.role === "user" ? "bg-rust" : "bg-forest"}><AvatarFallback>{message.role === "user" ? "IR" : <Sparkles size={14} />}</AvatarFallback></Avatar>
            <div className={cn("max-w-[82%] px-3.5 py-3 text-xs leading-5", message.role === "user" ? "bg-lime text-ink" : message.risk ? "border border-red-200 bg-red-50 text-red-900" : "bg-white text-ink/75 shadow-sm")}>
              {message.risk && <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-red-700"><ShieldAlert size={13} /> Riesgo fitosanitario</p>}
              {message.text}
            </div>
          </div>)}
          {sending && <p className="text-xs text-ink/45">El asistente está analizando...</p>}
        </ScrollArea>

        <form onSubmit={submit} className="border-t border-ink/10 bg-white p-4"><div className="flex gap-2"><Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe una consulta..." aria-label="Consulta al asistente" /><Button type="submit" aria-label="Enviar consulta" disabled={sending}><Send size={16} /></Button></div><p className="mt-2 text-[10px] text-ink/40">Las recomendaciones deben validarse con la normativa oficial.</p></form>
      </aside>
    </>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{label}</p><p className="mt-1 truncate text-xs font-bold text-ink">{value}</p></div>;
}
