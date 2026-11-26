"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Bot, ChevronDown, Minimize2, Send, Sparkles, X } from "lucide-react";
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

function AssistantAvatar({ busy = false, size = "md" }: { busy?: boolean; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-8 w-8 rounded-xl" : "h-11 w-11 rounded-2xl";
  const iconSize = size === "sm" ? 16 : 21;
  return (
    <span
      className={`relative flex ${dims} shrink-0 items-center justify-center bg-gradient-to-br from-[#B7D96B] via-emerald-300 to-emerald-400 text-[#0F291E] shadow-md ring-2 ring-white/25`}
    >
      <Bot size={iconSize} className={busy ? "animate-pulse" : ""} />
      <Sparkles
        size={size === "sm" ? 10 : 12}
        className={`absolute -right-1 -top-1 text-amber-200 drop-shadow ${busy ? "animate-spin" : ""}`}
      />
    </span>
  );
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
    {isOpen && mobile && <button type="button" aria-label="Cerrar asistente" tabIndex={-1} onClick={() => changeOpen(false)} className="pointer-events-auto fixed inset-0 bg-[#17251D]/60 backdrop-blur-xs" />}
    <div
      ref={panel}
      role="dialog"
      aria-modal={mobile ? true : undefined}
      aria-label={title}
      tabIndex={-1}
      style={mobile
        ? { top: visualViewport?.top ?? 0, left: 0, right: 0, height: visualViewport?.height ?? "100dvh" }
        : { bottom: "calc(5rem + env(safe-area-inset-bottom))", right: "1.25rem" }}
      className={`pointer-events-auto fixed z-[71] overflow-hidden bg-[var(--surface,#ffffff)] shadow-[0_24px_60px_-15px_rgba(8,28,21,0.35)] outline-none transition-all duration-200 ${mobile ? "w-full" : "h-[min(680px,calc(100dvh-7rem))] w-[min(430px,calc(100vw-2.5rem))] rounded-3xl border border-[#1B4332]/20"} ${isOpen ? "block" : "hidden"}`}
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
     style={{
        bottom: "calc(1.75rem + env(safe-area-inset-bottom))",
        right: "calc(1.75rem + env(safe-area-inset-right))",
      }}
      className="group pointer-events-auto fixed z-[71] flex items-center gap-3 rounded-full border border-white/15 bg-gradient-to-r from-[#1B4332] via-[#21523D] to-[#2D6A4F] py-2.5 pl-3 pr-5 text-sm font-bold text-white shadow-[0_12px_28px_-6px_rgba(27,67,50,0.55)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-6px_rgba(27,67,50,0.65)] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#B7D96B] to-emerald-300 text-[#0F291E] shadow-inner transition-transform duration-200 group-hover:scale-105">
        <Bot size={19} aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1B4332]" />
        </span>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>Asistente IA</span>
        {lotId ? (
          <span className="max-w-28 truncate text-[11px] font-medium text-emerald-200">{lotId}</span>
        ) : (
          <span className="text-[10px] font-medium text-emerald-200/90">En línea</span>
        )}
      </span>
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

  return (
    <section
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-[#1B4332]/15 bg-[var(--surface,#ffffff)] text-[var(--text-primary,#17251D)] ${
        presentation === "floating"
          ? "w-full rounded-none sm:rounded-3xl"
          : `rounded-2xl shadow-sm ${
              embedded
                ? "h-full min-h-0 max-h-full w-full"
                : "min-h-[420px] max-h-[calc(100dvh-8rem)] self-start lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]"
            }`
      }`}
      aria-label={title}
    >
      {/* CABECERA BOTÁNICA CON IDENTIDAD */}
      <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#1B4332] via-[#21523D] to-[#2D6A4F] p-4 text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-300/15 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AssistantAvatar busy={busy} />
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold leading-tight text-white">{title}</h2>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100 backdrop-blur-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-ping bg-amber-300" : "bg-emerald-300"}`} />
                {busy ? "Analizando…" : "En línea"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {presentation === "floating" ? (
              <>
                <button
                  type="button"
                  onClick={onMinimize}
                  aria-label="Minimizar asistente"
                  className="grid h-9 w-9 place-items-center rounded-xl text-white/80 outline-none transition hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar asistente"
                  className="grid h-9 w-9 place-items-center rounded-xl text-white/80 outline-none transition hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <X size={17} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white backdrop-blur-xs transition hover:bg-white/20"
                aria-expanded={!collapsed}
              >
                {collapsed ? "Abrir" : "Minimizar"}
              </button>
            )}
          </div>
        </div>
      </header>

      {!collapsed && (
        <>
          {/* PASTILLA DE ESTADO DE CONEXIÓN Y CONTEXTO */}
          <div
            style={{
              backgroundColor: "color-mix(in srgb, #2D6A4F 7%, var(--surface, #ffffff))",
              borderColor: "color-mix(in srgb, #2D6A4F 16%, var(--border, rgba(23,37,29,0.1)))",
            }}
            className="shrink-0 border-b px-4 py-2.5"
          >
            <p role="status" className="text-xs font-semibold text-[#2D6A4F] dark:text-emerald-400 [[data-theme=dark]_&]:text-emerald-400">
              {serviceStatus}
            </p>
            <p className="mt-0.5 break-words text-[11px] leading-4 text-[var(--text-secondary,#526157)]">
              {lotId
                ? `Lote seleccionado: ${lotId}. El servidor comprobará tu acceso.`
                : "Consulta general con el resumen operativo autorizado. Selecciona un lote para consultar sus detalles."}
            </p>
          </div>

          {/* ÁREA DE CONVERSACIÓN CON SCROLL FLUIDO */}
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
            className="relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scroll-smooth p-4"
          >
            {!messages.length && (
              <div
                style={{
                  backgroundColor: "color-mix(in srgb, #2D6A4F 8%, var(--surface, #ffffff))",
                  borderColor: "color-mix(in srgb, #2D6A4F 18%, var(--border, rgba(23,37,29,0.1)))",
                }}
                className="rounded-2xl border p-4 text-sm leading-6 text-[var(--text-primary,#17251D)] shadow-2xs"
              >
                Consulta sobre trazabilidad, documentación, el resumen operativo o el lote seleccionado. Cada pregunta se evalúa con el contexto actual; no se envía el historial de la conversación.
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex items-end gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <AssistantAvatar size="sm" />}
                <div
                  style={
                    message.role === "assistant"
                      ? {
                          backgroundColor: "color-mix(in srgb, #2D6A4F 8%, var(--surface, #ffffff))",
                          borderColor: "color-mix(in srgb, #2D6A4F 18%, var(--border, rgba(23,37,29,0.12)))",
                        }
                      : undefined
                  }
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow-2xs ${
                    message.role === "user"
                      ? "rounded-br-sm bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white"
                      : "rounded-bl-sm border text-[var(--text-primary,#17251D)]"
                  }`}
                >
                  <span
                    className={`mb-1 block text-[11px] font-bold ${
                      message.role === "user"
                        ? "text-emerald-200"
                        : "text-[#2D6A4F] dark:text-emerald-400 [[data-theme=dark]_&]:text-emerald-400"
                    }`}
                  >
                    {message.role === "user" ? "Tú" : "Asistente · Gemini"}
                  </span>
                  {message.text}
                </div>
              </div>
            ))}

            {/* ANIMACIÓN DE PENSANDO / ESPERANDO RESPUESTA */}
            {busy && (
              <div role="status" className="flex items-end gap-2.5">
                <AssistantAvatar busy size="sm" />
                <div
                  style={{
                    backgroundColor: "color-mix(in srgb, #2D6A4F 8%, var(--surface, #ffffff))",
                    borderColor: "color-mix(in srgb, #2D6A4F 22%, var(--border, rgba(23,37,29,0.12)))",
                  }}
                  className="inline-flex items-center gap-3 rounded-2xl rounded-bl-sm border px-4 py-3 text-xs font-medium text-[var(--text-primary,#17251D)] shadow-2xs"
                >
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#2D6A4F] [animation-delay:-0.3s] dark:bg-emerald-400 [[data-theme=dark]_&]:bg-emerald-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#2D6A4F] [animation-delay:-0.15s] dark:bg-emerald-400 [[data-theme=dark]_&]:bg-emerald-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#2D6A4F] dark:bg-emerald-400 [[data-theme=dark]_&]:bg-emerald-400" />
                  </span>
                  <span>Analizando datos operativos…</span>
                </div>
              </div>
            )}

            {hasNewMessages && (
              <div className="sticky bottom-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    stick.current = true;
                    if (list.current) list.current.scrollTop = list.current.scrollHeight;
                    setHasNewMessages(false);
                  }}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#1B4332] px-3.5 text-xs font-semibold text-white shadow-md outline-none transition hover:bg-[#2D6A4F] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
                >
                  <ChevronDown size={15} /> Mensajes nuevos
                </button>
              </div>
            )}
          </div>

          {/* CAJA DE ENTRADA DE CONSULTA */}
          <form
            onSubmit={(event) => void submit(event)}
            style={{ borderColor: "var(--border, rgba(23,37,29,0.12))" }}
            className="shrink-0 border-t bg-[var(--surface,#ffffff)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
          >
            {error && (
              <p role="alert" className="mb-3 rounded-xl border border-red-300/50 bg-red-500/10 p-3 text-xs font-medium text-red-700 dark:text-red-300 [[data-theme=dark]_&]:text-red-300">
                {error} Puedes corregir o reintentar la consulta; tu texto se conserva.
              </p>
            )}
            <label htmlFor={inputId} className="sr-only">
              Tu consulta
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id={inputId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={keyDown}
                rows={2}
                maxLength={1000}
                disabled={busy}
                placeholder="Escribe tu consulta…"
                className="max-h-32 min-h-12 min-w-0 flex-1 resize-y rounded-2xl border border-[#526157]/30 bg-field p-3 text-sm text-[var(--text-primary,#17251D)] shadow-inner outline-none placeholder:text-[var(--text-secondary,#526157)] focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                aria-label="Enviar consulta"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white shadow-md outline-none transition hover:scale-105 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2 disabled:scale-100 disabled:bg-[#E8EEE7] disabled:bg-none disabled:text-[#526157] disabled:shadow-none"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary,#526157)]">
              Enter envía · Shift+Enter agrega línea. La IA no consulta normativa vigente ni autoriza aplicaciones o despachos. No incluyas datos personales.
            </p>
          </form>
        </>
      )}
    </section>
  );
}