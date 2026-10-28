"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, LoaderCircle, Send } from "lucide-react";
import { askGemini, savedLotId } from "./assistant-api";
import { useAuth } from "@/features/auth/AuthProvider";

type Message = { role: "user" | "assistant"; text: string };

// A keyed conversation prevents late responses or history from leaking across lots/accounts.
export function GeminiChat({ lotId, title = "Asistente agrícola" }: { lotId?: string | null; title?: string }) {
  const { session } = useAuth();
  const id = savedLotId(lotId);
  return <Conversation key={`${session?.user.id ?? "guest"}:${id ?? "general"}`} lotId={id} title={title} />;
}

function Conversation({ lotId, title }: { lotId: string | null; title: string }) {
  const inputId = useId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const sending = useRef(false);
  const alive = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (stick.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || question.length > 1000 || sending.current) return;
    sending.current = true;
    setBusy(true); setError(""); stick.current = true;
    setMessages((items) => [...items, { role: "user", text: question }]);
    setDraft("");
    try {
      const answer = await askGemini(question, lotId);
      if (!alive.current) return;
      setConnected(true);
      setMessages((items) => [...items, { role: "assistant", text: answer }]);
    } catch (cause) {
      if (!alive.current) return;
      setConnected(false);
      setError(cause instanceof Error ? cause.message : "No se pudo completar la consulta.");
      setDraft(question);
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
      event.preventDefault(); event.currentTarget.form?.requestSubmit();
    }
  }

  return <section className="flex max-h-[85dvh] min-h-[510px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#1B4332]/15 bg-white shadow-sm" aria-label={title}>
    <header className="border-b border-[#1B4332]/10 bg-[#F5F8F4] p-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B7D96B] text-[#17251D]"><Bot size={20} /></span><h2 className="text-lg font-bold text-[#17251D]">{title}</h2></div>
      <p className="mt-3 text-xs font-semibold text-[#2D6A4F]">{busy ? "Consultando Gemini…" : connected ? "Última respuesta generada con Gemini" : "Conexión con Gemini preparada"}</p>
      <p className="mt-2 break-words text-xs leading-5 text-[#526157]">{lotId ? `Lote guardado: ${lotId}. El servidor comprobará tu acceso.` : "Consulta general. Selecciona un lote guardado para consultar sus datos; los ejemplos locales no se envían."}</p>
    </header>
    <div ref={list} role="log" aria-live="polite" aria-label="Conversación con el asistente" onScroll={(event) => {
      const el = event.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    }} className="min-h-40 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
      {!messages.length && <p className="rounded-xl bg-[#F5F8F4] p-3 text-sm leading-6 text-[#17251D]">Consulta sobre trazabilidad, documentación o el lote seleccionado. Cada pregunta se evalúa con el contexto actual; no se envía el historial de la conversación.</p>}
      {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><p className={`max-w-[94%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-tr-sm bg-[#B7D96B] text-[#17251D]" : "rounded-tl-sm border border-[#1B4332]/10 bg-[#F5F8F4] text-[#17251D]"}`}><span className="mb-1 block text-xs font-bold">{message.role === "user" ? "Tú" : "Asistente · Gemini"}</span>{message.text}</p></div>)}
      {busy && <p role="status" className="flex items-center gap-2 text-sm text-[#17251D]"><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> Preparando respuesta…</p>}
    </div>
    <form onSubmit={(event) => void submit(event)} className="border-t border-[#1B4332]/10 bg-white p-4">
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <label htmlFor={inputId} className="sr-only">Tu consulta</label>
      <div className="flex items-end gap-2"><textarea id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} rows={2} maxLength={1000} disabled={busy} placeholder="Escribe tu consulta…" className="max-h-32 min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-[#526157]/30 bg-white p-3 text-sm text-[#17251D] outline-none placeholder:text-[#526157] focus:ring-2 focus:ring-[#2D6A4F] disabled:bg-[#F5F8F4]" /><button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar consulta" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1B4332] text-white outline-none hover:bg-[#2D6A4F] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 disabled:bg-[#E8EEE7] disabled:text-[#526157]"><Send size={18} /></button></div>
      <p className="mt-2 text-[11px] leading-5 text-[#526157]">Enter envía · Shift+Enter agrega línea. La IA no consulta normativa vigente ni autoriza aplicaciones o despachos. No incluyas datos personales.</p>
    </form>
  </section>;
}
