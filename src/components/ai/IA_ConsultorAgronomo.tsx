"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

type Message = { id: number; role: "assistant" | "user"; text: string };

const suggestions = ["LMR vigente para arándanos", "Carencia del producto registrado", "Compatibilidad de agroquímicos"];

function localAdvice(question: string, lot: ReturnType<typeof useTraceabilityStore.getState>["activeLote"], destination: string) {
  const prompt = question.toLocaleLowerCase("es");
  const context = `Lote ${lot.id}: ${lot.cultivo} en ${lot.fundo}, producto registrado ${lot.agroquimico}, destino ${destination}.`;
  if (/(carencia|d[ií]as|cosecha)/i.test(prompt)) {
    const remaining = Math.max(0, lot.diasRequeridos - lot.dias);
    return `${context} Registro: ${lot.dias} días transcurridos y ${lot.diasRequeridos} días requeridos; ${remaining ? `faltan ${remaining} días según esos campos` : "el valor registrado alcanza los días requeridos"}. Comprueba fechas y etiqueta aprobada. Esta respuesta local no autoriza aplicaciones ni despachos.`;
  }
  if (/(ppm|lmr|l[ií]mite|residuo)/i.test(prompt)) {
    return `${context} No hay una base de LMR vigente conectada. Confirma el límite oficial del destino y cultivo con la autoridad/etiqueta aplicable; no uses esta respuesta para decidir una liberación.`;
  }
  if (/(compatib|mezcl|dosis)/i.test(prompt)) {
    return `${context} No hay una fuente de compatibilidad o dosis conectada. Consulta la etiqueta aprobada del producto y el protocolo interno antes de mezclar o aplicar.`;
  }
  return `${context} No hay un proveedor de IA conectado. Puedo mostrar los datos del registro, pero no interpreto consultas generales ni sustituyo la revisión agronómica oficial.`;
}

export function IAConsultorAgronomo() {
  const lot = useTraceabilityStore((state) => state.activeLote);
  const destination = useTraceabilityStore((state) => state.selectedDestination);
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: "Ayuda local contextual; no hay proveedor de IA conectado. Verifica siempre la etiqueta aprobada y la normativa SENASA vigente." }]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const sendingRef = useRef(false);
  const nextId = useRef(2);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (stickToBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, sending]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || sendingRef.current) return;
    sendingRef.current = true;
    stickToBottom.current = true;
    const answer = localAdvice(clean, lot, destination);
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text: clean }]);
    setDraft("");
    setSending(true);
    timer.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: answer }]);
      setSending(false);
      sendingRef.current = false;
      timer.current = null;
    }, 300);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <Card className="flex min-h-[540px] flex-col overflow-hidden border-[#17251D]/10 bg-[#1B4332] text-white shadow-sm">
      <CardHeader className="border-b border-white/15">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B7D96B] text-[#17251D]"><Bot size={20} /></div>
        <CardTitle className="mt-4 text-white">Asistente contextual de Campo</CardTitle>
        <p className="text-xs leading-5 text-[#E6F0E7]">Respuesta local · sin proveedor IA conectado · no autoriza aplicaciones ni despachos.</p>
        <p className="mt-2 text-xs leading-5 text-white">{lot.id} · {lot.cultivo} · {destination}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        <div
          ref={list}
          role="log"
          aria-live="polite"
          aria-label="Conversación de Campo"
          onScroll={(event) => {
            const element = event.currentTarget;
            stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
          }}
          className="min-h-48 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-[#E6F0E7]"><Sparkles size={14} className="shrink-0 text-[#B7D96B]" /> Consulta basada en el registro seleccionado</div>
          {messages.map((item) => <div key={item.id} className={`flex gap-2 ${item.role === "user" ? "flex-row-reverse" : ""}`}>
            <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.role === "user" ? "bg-[#B7D96B] text-[#17251D]" : "bg-white/15 text-white"}`}>{item.role === "user" ? <span className="text-[10px] font-bold">Tú</span> : <Bot size={14} />}</span>
            <p className={`max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2.5 text-sm leading-6 ${item.role === "user" ? "rounded-tr-sm bg-[#B7D96B] text-[#17251D]" : "rounded-tl-sm border border-white/10 bg-white text-[#17251D] shadow-sm"}`}>{item.text}</p>
          </div>)}
          {sending && <p role="status" className="flex items-center gap-2 text-sm font-medium text-white"><LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" /> Preparando respuesta local…</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Sugerencias de consulta">
          {suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={sending} onClick={() => send(suggestion)} className="min-h-9 rounded-xl border border-white/40 px-3 py-1.5 text-left text-xs font-medium text-white outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#B7D96B] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#E6F0E7]">{suggestion}</button>)}
        </div>
        <form onSubmit={submit} className="mt-4 border-t border-white/15 pt-4">
          <label htmlFor="campo-assistant-input" className="sr-only">Consulta de Campo</label>
          <div className="flex items-end gap-2">
            <textarea id="campo-assistant-input" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Consulta normativa…" rows={2} maxLength={1000} disabled={sending} className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-white/30 bg-white px-3 py-2.5 text-sm leading-5 text-[#17251D] outline-none placeholder:text-[#526157] focus:border-[#B7D96B] focus:ring-2 focus:ring-[#B7D96B]/50 disabled:bg-[#F5F8F4] disabled:text-[#526157] disabled:placeholder:text-[#526157]" aria-describedby="campo-assistant-help" />
            <Button type="submit" aria-label="Enviar consulta" disabled={sending || !draft.trim()} className="h-11 min-h-11 w-11 rounded-xl bg-[#B7D96B] p-0 text-[#17251D] hover:bg-[#C8E58A] disabled:bg-[#E8EEE7] disabled:text-[#526157]"><Send size={16} /></Button>
          </div>
          <p id="campo-assistant-help" className="mt-2 text-[11px] leading-5 text-[#E6F0E7]">Enter envía · Shift+Enter agrega una línea</p>
        </form>
      </CardContent>
    </Card>
  );
}
