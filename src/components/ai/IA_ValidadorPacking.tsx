"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, Send, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

type Message = { id: number; role: "assistant" | "user"; text: string };

export function IAValidadorPacking() {
  const destination = useTraceabilityStore((state) => state.selectedDestination);
  const lot = useTraceabilityStore((state) => state.activeLote);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: "Soy una ayuda contextual local; no hay proveedor de IA ni consulta de normativa oficial conectados." }]);
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const sendingRef = useRef(false);
  const nextId = useRef(2);
  const timer = useRef<number | null>(null);
  const approvedByLocalCheck = lot.dias >= lot.diasRequeridos && lot.ppm <= (destination === "UE" ? 0.3 : 0.5);

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
    const remaining = Math.max(0, lot.diasRequeridos - lot.dias);
    const reply = `Contexto local: ${lot.id}, destino ${destination}, ${lot.dias} días transcurridos frente a ${lot.diasRequeridos} requeridos y ${lot.ppm} ppm registrados. No se consultan límites oficiales ni hay un proveedor de IA conectado. Valida etiqueta, certificado y procedimiento operativo; esta respuesta no autoriza el despacho.`;
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text: clean }]);
    setQuestion("");
    setSending(true);
    timer.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: remaining ? `${reply} Según esos campos, faltan ${remaining} días para completar la carencia indicada.` : reply }]);
      setSending(false);
      sendingRef.current = false;
      timer.current = null;
    }, 300);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-[#17251D]/10 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-[#17251D]"><Sparkles className="text-[#2D6A4F]" size={18} /> Asistente contextual · Packing</CardTitle>
        <p className="text-xs leading-5 text-[#526157]">Respuesta local · sin proveedor IA ni normativa oficial conectados.</p>
      </CardHeader>
      <CardContent>
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${approvedByLocalCheck ? "border-green-200 bg-green-50 text-green-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
          {approvedByLocalCheck ? <CheckCircle2 className="mt-0.5 shrink-0 text-green-800" size={18} /> : <AlertTriangle className="mt-0.5 shrink-0 text-amber-900" size={18} />}
          <div>
            <p className="text-sm font-bold">{approvedByLocalCheck ? "Los valores alcanzan la regla local configurada" : "Los valores no alcanzan la regla local configurada"}</p>
            <p className="mt-1 text-xs leading-5">Esta comprobación de interfaz no consulta límites oficiales ni constituye aprobación de lote o despacho.</p>
          </div>
        </div>

        <div
          ref={list}
          role="log"
          aria-live="polite"
          aria-label="Conversación de Packing"
          onScroll={(event) => {
            const element = event.currentTarget;
            stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
          }}
          className="mt-4 max-h-72 min-h-32 space-y-3 overflow-y-auto overscroll-contain rounded-xl bg-[#F5F8F4] p-3"
        >
          {messages.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-[#B7D96B] text-[#17251D]" : "border border-[#17251D]/10 bg-white text-[#17251D]"}`}>{message.text}</p>
          </div>)}
          {sending && <p role="status" className="flex items-center gap-2 text-sm font-medium text-[#17251D]"><LoaderCircle className="animate-spin motion-reduce:animate-none" size={15} /> Preparando respuesta local…</p>}
        </div>

        <form onSubmit={submit} className="mt-4">
          <label htmlFor="packing-assistant-input" className="sr-only">Consulta contextual de Packing</label>
          <div className="flex items-end gap-2">
            <textarea id="packing-assistant-input" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder="Pregunta sobre el contexto del lote…" rows={2} maxLength={1000} disabled={sending} className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-[#17251D]/20 bg-white px-3 py-2.5 text-sm leading-5 text-[#17251D] outline-none placeholder:text-[#526157] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 disabled:bg-[#F5F8F4] disabled:text-[#526157] disabled:placeholder:text-[#526157]" aria-describedby="packing-assistant-help" />
            <Button type="submit" aria-label="Enviar pregunta" disabled={sending || !question.trim()} className="h-11 min-h-11 w-11 rounded-xl p-0"><Send size={15} /></Button>
          </div>
          <p id="packing-assistant-help" className="mt-2 text-[11px] leading-5 text-[#526157]">Enter envía · Shift+Enter agrega línea · no autoriza despachos.</p>
        </form>
      </CardContent>
    </Card>
  );
}
