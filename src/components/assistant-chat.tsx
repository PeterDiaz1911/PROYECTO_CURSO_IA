"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles } from "lucide-react";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

type Message = { id: number; role: "assistant" | "user"; text: string };

function localResponse(question: string, context: ReturnType<typeof useTraceabilityStore.getState>["aiContext"]) {
  const prompt = question.toLocaleLowerCase("es");
  const lot = context.lote;
  const details = `Lote ${lot.id}: ${lot.cultivo}, destino ${context.destino}, ${lot.ppm} ppm registrados y ${lot.dias} días transcurridos frente a ${lot.diasRequeridos} días requeridos de carencia.`;
  if (/(carencia|d[ií]as|liber|cosecha)/i.test(prompt)) {
    const remaining = Math.max(0, lot.diasRequeridos - lot.dias);
    return `${details} ${remaining > 0 ? `Según estos datos, aún faltan ${remaining} días para completar el periodo indicado.` : "Según estos datos, el periodo indicado está cumplido."} Esta es una comprobación local; no autoriza el despacho ni reemplaza la validación operativa.`;
  }
  if (/(ppm|residuo|l[ií]mite|lmr|qu[ií]mic)/i.test(prompt)) {
    return `${details} No se consultan límites oficiales para el destino. Verifica el LMR vigente y el expediente con el área responsable; esta respuesta local no autoriza despachos.`;
  }
  return `${details} No hay un proveedor de IA conectado en esta aplicación. Puedo mostrar el contexto disponible, pero no interpretar consultas generales ni sustituir validaciones operativas.`;
}

export function AssistantChat() {
  const context = useTraceabilityStore((state) => state.aiContext);
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: "Soy una ayuda contextual local. Puedo mostrar datos del lote, pero no estoy conectado a un proveedor de IA ni autorizo despachos." }]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const sending = useRef(false);
  const nextId = useRef(2);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (stickToBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, typing]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending.current) return;
    sending.current = true;
    stickToBottom.current = true;
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text }]);
    setMessage("");
    setTyping(true);
    const answer = localResponse(text, context);
    timer.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: answer }]);
      setTyping(false);
      sending.current = false;
      timer.current = null;
    }, 350);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section className="flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-[#17251D]/10 bg-[#1B4332] text-white shadow-sm" aria-labelledby="assistant-title">
      <header className="border-b border-white/15 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B7D96B] text-[#17251D]"><Bot size={20} /></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B7D96B]" /> Respuesta local
          </span>
        </div>
        <h2 id="assistant-title" className="mt-5 text-xl font-bold tracking-tight text-white">Asistente contextual</h2>
        <p className="mt-2 text-sm leading-6 text-[#E6F0E7]">{context.lote.id} · {context.lote.cultivo} · destino {context.destino}</p>
        <p className="mt-2 text-xs leading-5 text-[#D4E4D7]">Sin proveedor de IA conectado. No autoriza despachos ni reemplaza las validaciones operativas.</p>
      </header>

      <div
        ref={list}
        role="log"
        aria-live="polite"
        aria-label="Conversación contextual"
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
        }}
        className="min-h-48 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-[#E6F0E7]"><Sparkles size={15} className="shrink-0 text-[#B7D96B]" /> Contexto disponible del lote</div>
        {messages.map((item) => (
          <div key={item.id} className={`flex gap-2.5 ${item.role === "user" ? "flex-row-reverse" : ""}`}>
            <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.role === "user" ? "bg-[#B7D96B] text-[#17251D]" : "bg-white/15 text-white"}`}>
              {item.role === "user" ? <span className="text-[10px] font-bold">Tú</span> : <Bot size={15} />}
            </span>
            <p className={`max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-3 text-sm leading-6 ${item.role === "user" ? "rounded-tr-sm bg-[#B7D96B] text-[#17251D]" : "rounded-tl-sm border border-white/10 bg-white text-[#17251D] shadow-sm"}`}>
              {item.text}
            </p>
          </div>
        ))}
        {typing && <div role="status" className="flex items-center gap-2 text-sm font-medium text-white"><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> Preparando respuesta local…</div>}
      </div>

      <form onSubmit={submit} className="border-t border-white/15 bg-[#173B2D] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <label htmlFor="assistant-message" className="sr-only">Escribe una consulta contextual</label>
        <div className="flex items-end gap-2">
          <textarea
            id="assistant-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe una consulta…"
            rows={2}
            maxLength={1000}
            className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-white/30 bg-white px-3 py-2.5 text-sm leading-5 text-[#17251D] outline-none placeholder:text-[#526157] focus:border-[#B7D96B] focus:ring-2 focus:ring-[#B7D96B]/50 disabled:bg-[#F5F8F4] disabled:text-[#526157] disabled:placeholder:text-[#526157]"
            aria-describedby="assistant-input-help"
            disabled={typing}
          />
          <button type="submit" aria-label="Enviar consulta" disabled={typing || !message.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B7D96B] text-[#17251D] outline-none transition hover:bg-[#C8E58A] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#173B2D] disabled:cursor-not-allowed disabled:bg-[#E8EEE7] disabled:text-[#526157]">
            <Send size={17} />
          </button>
        </div>
        <p id="assistant-input-help" className="mt-2 text-[11px] leading-5 text-[#E6F0E7]">Enter envía · Shift+Enter agrega una línea</p>
      </form>
    </section>
  );
}
