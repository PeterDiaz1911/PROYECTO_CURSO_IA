"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Send, ShieldAlert, Sparkles, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lote } from "@/components/lotes/LotesDataTable";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  risk?: boolean;
};

function answerLocally(question: string, lote: Lote) {
  const asksAboutCarencia = /(carencia|d[ií]as|liber|cosecha)/i.test(question);
  const remaining = Math.max(0, lote.diasRequeridos - lote.diasCarencia);
  if (!asksAboutCarencia) {
    return `Contexto disponible: ${lote.id}, ${lote.cultivo}, agroquímico ${lote.agroquimico}, destino ${lote.mercadoDestino}; ${lote.diasCarencia} días transcurridos y ${lote.diasRequeridos} días requeridos de carencia. No hay un proveedor de IA conectado; revisa las reglas oficiales y valida el expediente con el área responsable.`;
  }
  return remaining > 0
    ? `Según los datos disponibles del lote ${lote.id}, aún faltan ${remaining} días para completar el periodo de carencia indicado. Revisa las fechas con el área responsable; esta comprobación local no autoriza el despacho.`
    : `Según los datos disponibles del lote ${lote.id}, el periodo de carencia indicado está cumplido. Esta comprobación local no autoriza el despacho ni reemplaza las validaciones operativas.`;
}

export function ContextualAssistant({ lote, open, onClose }: { lote: Lote | null; open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", text: "Soy una ayuda contextual local, no conectada a un proveedor de IA. Puedo mostrar datos básicos del lote." },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const sendingRef = useRef(false);
  const nextId = useRef(2);
  const timer = useRef<number | null>(null);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && lote && !wasOpen.current) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      wasOpen.current = true;
      panel.current?.focus();
    } else if ((!open || !lote) && wasOpen.current) {
      wasOpen.current = false;
      opener.current?.focus();
      opener.current = null;
    }
  }, [lote, open]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (stickToBottom.current && scrollArea.current) scrollArea.current.scrollTop = scrollArea.current.scrollHeight;
  }, [messages, sending]);

  if (!open || !lote) return null;

  function closePanel() {
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sendingRef.current || !lote) return;
    sendingRef.current = true;
    stickToBottom.current = true;
    const currentLote = lote;
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text }]);
    setDraft("");
    setSending(true);

    timer.current = window.setTimeout(() => {
      const asksAboutCarencia = /(carencia|d[ií]as|liber|cosecha)/i.test(text);
      const risk = asksAboutCarencia && currentLote.diasCarencia < currentLote.diasRequeridos;
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: answerLocally(text, currentLote), risk }]);
      setSending(false);
      sendingRef.current = false;
      timer.current = null;
    }, 350);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== "Tab" || !panel.current) return;
    const items = panel.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
      event.preventDefault();
      items[0].focus();
    }
  }

  const pendingDays = Math.max(0, lote.diasRequeridos - lote.diasCarencia);

  return (
    <>
      <button type="button" aria-label="Cerrar asistente" tabIndex={-1} onClick={closePanel} className="fixed inset-0 z-40 bg-[#17251D]/45" />
      <aside ref={panel} role="dialog" aria-modal="true" aria-labelledby="assistant-title" tabIndex={-1} onKeyDown={trapFocus} className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-[#17251D]/10 bg-[#F5F8F4] shadow-2xl outline-none">
        <header className="flex items-start justify-between gap-3 border-b border-[#17251D]/10 bg-white px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8EEE7] text-[#1B4332]"><CheckCircle2 size={20} /></div>
            <div><h2 id="assistant-title" className="text-lg font-bold text-[#17251D]">Asistente contextual</h2><p className="mt-1 text-xs leading-5 text-[#526157]">Respuesta local · sin proveedor IA conectado</p></div>
          </div>
          <Button variant="ghost" aria-label="Cerrar panel" className="h-9 min-h-9 rounded-lg px-2" onClick={closePanel}><X size={18} /></Button>
        </header>

        <Card className="mx-4 mt-4 rounded-2xl border-[#1B4332]/15 bg-white">
          <CardHeader className="pb-3"><CardTitle className="text-sm text-[#17251D]">Contexto activo · {lote.id}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 pb-5">
            <ContextItem label="Cultivo" value={lote.cultivo} />
            <ContextItem label="Agroquímico" value={lote.agroquimico} />
            <ContextItem label="Carencia" value={`${lote.diasCarencia} / ${lote.diasRequeridos} días`} />
            <ContextItem label="Destino" value={lote.mercadoDestino} />
          </CardContent>
        </Card>

        <div
          ref={scrollArea}
          role="log"
          aria-live="polite"
          aria-label="Conversación contextual"
          onScroll={(event) => {
            const element = event.currentTarget;
            stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
          }}
          className="min-h-0 flex-1 space-y-4 overscroll-contain px-4 py-4"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-[#526157]"><Sparkles size={14} className="shrink-0 text-[#2D6A4F]" /> Datos visibles; no sustituye validación</div>
          {messages.map((item) => <div key={item.id} className={cn("flex gap-2", item.role === "user" && "flex-row-reverse")}>
            <Avatar className={item.role === "user" ? "h-8 w-8 bg-[#2D6A4F]" : "h-8 w-8 bg-[#1B4332]"}><AvatarFallback className="text-white">{item.role === "user" ? "Tú" : <Sparkles size={14} />}</AvatarFallback></Avatar>
            <div className={cn("max-w-[84%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-3 text-sm leading-6", item.role === "user" ? "rounded-tr-sm bg-[#B7D96B] text-[#17251D]" : item.risk ? "rounded-tl-sm border border-amber-300 bg-amber-50 text-amber-950" : "rounded-tl-sm border border-[#17251D]/10 bg-white text-[#17251D] shadow-sm")}>
              {item.risk && <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-950"><ShieldAlert size={14} /> Verifica carencia</p>}
              {item.text}
            </div>
          </div>)}
          {sending && <p role="status" className="flex items-center gap-2 text-sm font-medium text-[#17251D]"><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> Preparando respuesta local…</p>}
        </div>

        <form onSubmit={submit} className="border-t border-[#17251D]/10 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <label htmlFor="contextual-assistant-input" className="sr-only">Consulta al asistente</label>
          <div className="flex items-end gap-2">
            <textarea id="contextual-assistant-input" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe una consulta…" rows={2} maxLength={1000} disabled={sending} className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-[#17251D]/20 bg-white px-3 py-2.5 text-sm leading-5 text-[#17251D] outline-none placeholder:text-[#526157] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 disabled:bg-[#F5F8F4] disabled:text-[#526157] disabled:placeholder:text-[#526157]" />
            <Button type="submit" aria-label="Enviar consulta" disabled={sending || !draft.trim()} className="h-11 min-h-11 w-11 rounded-xl p-0 disabled:bg-[#E8EEE7] disabled:text-[#526157]"><Send size={16} /></Button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#526157]">Enter envía · Shift+Enter agrega línea · faltan {pendingDays} días según los datos mostrados. No autoriza despachos.</p>
        </form>
      </aside>
    </>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[#526157]">{label}</p><p className="mt-1 truncate text-xs font-bold text-[#17251D]">{value}</p></div>;
}
