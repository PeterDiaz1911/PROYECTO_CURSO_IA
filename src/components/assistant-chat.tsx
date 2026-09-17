"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

type Message = { role: "assistant" | "user"; text: string };

export function AssistantChat() {
  const context = useTraceabilityStore((state) => state.aiContext);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "He cargado el contexto fitosanitario. ¿Qué deseas validar?" }]);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  useEffect(() => { setMessages((current) => [...current, { role: "assistant", text: `Recalculando normativas para ${context.destino}...` }]); }, [context.destino]);
  function submit(event: React.FormEvent) { event.preventDefault(); const text = message.trim(); if (!text || typing) return; setMessages((current) => [...current, { role: "user", text }]); setMessage(""); setTyping(true); window.setTimeout(() => { setMessages((current) => [...current, { role: "assistant", text: `Contexto consultado: ${context.lote.cultivo}, destino ${context.destino}, ${context.lote.ppm} ppm residuales.` }]); setTyping(false); }, 500); }
  return <section className="flex min-h-[540px] flex-col bg-forest text-white shadow-sm" aria-labelledby="assistant-title"><div className="border-b border-white/10 p-5"><div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center bg-lime text-forest"><Bot size={20} /></div><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-lime"><span className="h-1.5 w-1.5 rounded-full bg-lime" /> En línea</span></div><h2 id="assistant-title" className="mt-6 font-display text-2xl font-bold">Validación contextual IA</h2><p className="mt-2 text-xs leading-5 text-white/55">{context.lote.id} · {context.lote.cultivo} · destino {context.destino}</p></div><div className="flex-1 overflow-y-auto p-5"><div className="mb-5 flex gap-2 text-[11px] text-white/45"><Sparkles size={14} className="text-lime" /> Contexto actualizado en tiempo real</div>{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`mb-4 flex gap-2 ${item.role === "user" ? "flex-row-reverse" : ""}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center ${item.role === "user" ? "bg-rust" : "bg-white/10"}`}><Bot size={13} /></span><p className={`max-w-[84%] px-3 py-2.5 text-xs leading-5 ${item.role === "user" ? "bg-lime text-ink" : "bg-white/10 text-white/75"}`}>{item.text}</p></div>)}{typing && <div className="flex items-center gap-2 text-xs text-white/50"><Loader2 size={14} className="animate-spin" /> Analizando...</div>}</div><form onSubmit={submit} className="border-t border-white/10 p-4"><div className="flex gap-2"><Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe una consulta..." className="border-white/15 bg-white/10 text-white placeholder:text-white/35" aria-label="Consulta al asistente" /><button aria-label="Enviar consulta" type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center bg-lime text-forest"><Send size={15} /></button></div><div className="mt-3 flex items-center gap-1.5 text-[10px] text-white/35"><CheckCircle2 size={12} /> Reglas fitosanitarias activas</div></form></section>;
}
