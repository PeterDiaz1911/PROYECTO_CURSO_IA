"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Bot, ChevronDown, LoaderCircle, MessageCircle, Minimize2, Send, X } from "lucide-react";
import { AssistantRequestError, askGemini, savedLotId, type AssistantFailureKind } from "./assistant-api";
import { useAuth } from "@/features/auth/AuthProvider";

type Message = { role: "user" | "assistant"; text: string };
type Presentation = "inline" | "floating";

export function GeminiChat({
  lotId,
  title = "Asistente agrícola",
  embedded = false,
  presentation = "inline",
  open,
  onOpenChange,
}: {
  lotId?: string | null;
  title?: string;
  embedded?: boolean;
  presentation?: Presentation;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { session } = useAuth();
  const id = savedLotId(lotId);
  const conversationKey = `${session?.user.id ?? "guest"}:${id ?? "general"}`;
  if (presentation === "floating") {
    return <FloatingAssistant key={conversationKey} lotId={id} title={title} open={open} onOpenChange={onOpenChange} />;
  }
  return <Conversation key={conversationKey} lotId={id} title={title} embedded={embedded} presentation="inline" />;
}

function FloatingAssistant({
  lotId,
  title,
  open,
  onOpenChange,
}: {
  lotId: string | null;
  title: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [visualViewport, setVisualViewport] = useState<{ top: number; height: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const isOpen = open ?? internalOpen;
  const changeOpen = useCallback((next: boolean) => {
    if (next && !isOpen) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setInternalOpen(next);
    onOpenChange?.(next);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => {
      setMobile(media.matches);
      const viewport = window.visualViewport;
      setVisualViewport(viewport
        ? { top: viewport.offsetTop, height: viewport.height }
        : { top: 0, height: window.innerHeight });
    };
    update();
    media.addEventListener("change", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      media.removeEventListener("change", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => panel.current?.focus());
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        changeOpen(false);
        return;
      }
      if (event.key !== "Tab" || !mobile || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), a[href]');
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      opener.current?.focus();
      opener.current = null;
    };
  }, [isOpen, mobile, changeOpen]);

  if (!mounted) return null;
  return createPortal(<div className={`pointer-events-none fixed inset-0 z-[70] ${isOpen ? "isolate" : ""}`}>
    {isOpen && mobile && <button type="button" aria-label="Cerrar asistente" tabIndex={-1} onClick={() => changeOpen(false)} className="pointer-events-auto fixed inset-0 bg-[#17251D]/55" />}
    <div
      ref={panel}
      role="dialog"
      aria-modal={mobile ? true : undefined}
      aria-label={title}
      tabIndex={-1}
      style={mobile
        ? { top: visualViewport?.top ?? 0, left: 0, right: 0, height: visualViewport?.height ?? "100dvh" }
        : { bottom: "calc(5rem + env(safe-area-inset-bottom))", right: "1.25rem" }}
      className={`pointer-events-auto fixed z-[71] overflow-hidden bg-white shadow-2xl outline-none ${mobile ? "w-full" : "h-[min(680px,calc(100dvh-7rem))] w-[min(420px,calc(100vw-2.5rem))] rounded-2xl border border-[#17251D]/15"} ${isOpen ? "block" : "hidden"}`}
      onMouseDown={(event) => {
        if (mobile && event.target === event.currentTarget) changeOpen(false);
      }}
    >
      <Conversation
        lotId={lotId}
        title={title}
        embedded
        presentation="floating"
        onMinimize={() => changeOpen(false)}
        onClose={() => changeOpen(false)}
      />
    </div>
    {!isOpen && <button
      type="button"
      aria-label={lotId ? `Abrir asistente para el lote ${lotId}` : "Abrir asistente operativo"}
      aria-expanded={false}
      onClick={(event) => {
        opener.current = event.currentTarget;
        changeOpen(true);
      }}
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))", right: "calc(1.25rem + env(safe-area-inset-right))" }}
      className="pointer-events-auto fixed z-[71] flex min-h-12 items-center gap-2 rounded-full bg-[#1B4332] px-4 text-sm font-bold text-white shadow-lg outline-none transition hover:bg-[#2D6A4F] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
    >
      <MessageCircle size={18} aria-hidden="true" /> Asistente IA
      {lotId && <span className="max-w-28 truncate text-xs font-medium text-white/80">{lotId}</span>}
    </button>}
  </div>, document.body);
}

function Conversation({
  lotId,
  title,
  embedded,
  presentation,
  onMinimize,
  onClose,
}: {
  lotId: string | null;
  title: string;
  embedded: boolean;
  presentation: Presentation;
  onMinimize?: () => void;
  onClose?: () => void;
}) {
  const inputId = useId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failureKind, setFailureKind] = useState<AssistantFailureKind | null>(null);
  const [receivedResponse, setReceivedResponse] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const sending = useRef(false);
  const alive = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const previousMessageCount = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (stick.current && list.current) {
      list.current.scrollTop = list.current.scrollHeight;
      setHasNewMessages(false);
    } else if (messages.length > previousMessageCount.current) {
      setHasNewMessages(true);
    }
    previousMessageCount.current = messages.length;
  }, [messages, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || question.length > 1000 || sending.current) return;
    sending.current = true;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setError("");
    setFailureKind(null);
    stick.current = true;
    setMessages((items) => {
      const last = items[items.length - 1];
      return last?.role === "user" && last.text === question ? items : [...items, { role: "user", text: question }];
    });
    setDraft("");
    try {
      const answer = await askGemini(question, lotId, controller.signal);
      if (!alive.current) return;
      setReceivedResponse(true);
      setMessages((items) => [...items, { role: "assistant", text: answer }]);
    } catch (cause) {
      if (!alive.current || controller.signal.aborted) return;
      setReceivedResponse(false);
      setFailureKind(cause instanceof AssistantRequestError ? cause.kind : "unavailable");
      setError(cause instanceof Error ? cause.message : "No se pudo completar la consulta.");
      setDraft(question);
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const serviceStatus = busy
    ? "Consultando el servicio configurado…"
    : receivedResponse
      ? "El servicio devolvió una respuesta en esta sesión."
      : failureKind === "session"
        ? "La sesión o el acceso no fueron aceptados."
        : failureKind === "quota"
          ? "Se alcanzó un límite de consultas."
          : failureKind === "configuration"
            ? "El servicio necesita revisión de configuración."
            : failureKind === "request"
              ? "Revisa la consulta y el lote seleccionado."
              : failureKind === "unavailable"
                ? "No se recibió una respuesta del servicio."
                : "La conexión se comprobará al enviar una consulta.";

  return <section className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-[#1B4332]/15 bg-white ${presentation === "floating" ? "w-full rounded-none sm:rounded-2xl" : `rounded-2xl shadow-sm ${embedded ? "h-full min-h-0 max-h-full w-full" : "min-h-[420px] max-h-[calc(100dvh-8rem)] self-start lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]"}`}`} aria-label={title}>
    <header className="shrink-0 border-b border-[#1B4332]/10 bg-[#F5F8F4] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B7D96B] text-[#17251D]"><Bot size={20} /></span><h2 className="truncate text-lg font-bold text-[#17251D]">{title}</h2></div>
        <div className="flex shrink-0 items-center gap-1">
          {presentation === "floating" ? <>
            <button type="button" onClick={onMinimize} aria-label="Minimizar asistente" className="grid h-10 w-10 place-items-center rounded-lg text-[#526157] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"><Minimize2 size={17} /></button>
            <button type="button" onClick={onClose} aria-label="Cerrar asistente" className="grid h-10 w-10 place-items-center rounded-lg text-[#526157] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"><X size={18} /></button>
          </> : <button type="button" onClick={() => setCollapsed((value) => !value)} className="rounded-lg border border-[#1B4332]/10 bg-white px-2 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#1B4332]" aria-expanded={!collapsed}>{collapsed ? "Abrir" : "Minimizar"}</button>}
        </div>
      </div>
      {!collapsed && <>
        <p role="status" className="mt-3 text-xs font-semibold text-[#2D6A4F]">{serviceStatus}</p>
        <p className="mt-2 break-words text-xs leading-5 text-[#526157]">{lotId ? `Lote seleccionado: ${lotId}. El servidor comprobará tu acceso.` : "Consulta general con el resumen operativo autorizado. Selecciona un lote para consultar sus detalles."}</p>
      </>}
    </header>
    {!collapsed && <>
      <div
        ref={list}
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          if (stick.current) setHasNewMessages(false);
        }}
        className="relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
      >
        {!messages.length && <p className="rounded-xl bg-[#F5F8F4] p-3 text-sm leading-6 text-[#17251D]">Consulta sobre trazabilidad, documentación, el resumen operativo o el lote seleccionado. Cada pregunta se evalúa con el contexto actual; no se envía el historial de la conversación.</p>}
        {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><p className={`max-w-[94%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-tr-sm bg-[#B7D96B] text-[#17251D]" : "rounded-tl-sm border border-[#1B4332]/10 bg-[#F5F8F4] text-[#17251D]"}`}><span className="mb-1 block text-xs font-bold">{message.role === "user" ? "Tú" : "Asistente · Gemini"}</span>{message.text}</p></div>)}
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-[#17251D]"><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> Preparando respuesta…</p>}
        {hasNewMessages && <div className="sticky bottom-1 flex justify-end"><button type="button" onClick={() => {
          stick.current = true;
          if (list.current) list.current.scrollTop = list.current.scrollHeight;
          setHasNewMessages(false);
        }} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#1B4332] px-3 text-xs font-semibold text-white shadow outline-none hover:bg-[#2D6A4F] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"><ChevronDown size={15} /> Mensajes nuevos</button></div>}
      </div>
      <form onSubmit={(event) => void submit(event)} className="shrink-0 border-t border-[#1B4332]/10 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error} Puedes corregir o reintentar la consulta; tu texto se conserva.</p>}
        <label htmlFor={inputId} className="sr-only">Tu consulta</label>
        <div className="flex items-end gap-2"><textarea id={inputId} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} rows={2} maxLength={1000} disabled={busy} placeholder="Escribe tu consulta…" className="max-h-32 min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-[#526157]/30 bg-field p-3 text-sm text-[#17251D] outline-none placeholder:text-[#526157] focus:ring-2 focus:ring-[#2D6A4F] disabled:bg-[#F5F8F4]" /><button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar consulta" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1B4332] text-white outline-none hover:bg-[#2D6A4F] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 disabled:bg-[#E8EEE7] disabled:text-[#526157]"><Send size={18} /></button></div>
        <p className="mt-2 text-[11px] leading-5 text-[#526157]">Enter envía · Shift+Enter agrega línea. La IA no consulta normativa vigente ni autoriza aplicaciones o despachos. No incluyas datos personales.</p>
      </form>
    </>}
  </section>;
}
