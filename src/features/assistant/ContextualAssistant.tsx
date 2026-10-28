"use client";
import { useEffect, useRef } from "react";
import type { Lote } from "@/components/lotes/LotesDataTable";
import { GeminiChat } from "@/features/assistant/GeminiChat";

export function ContextualAssistant({ lote, open, onClose }: { lote: Lote | null; open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !lote) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled])');
      const first = items[0]; const last = items[items.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); opener?.focus(); };
  }, [open, lote]);
  if (!open || !lote) return null;
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#17251D]/50" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={panel} role="dialog" aria-modal="true" aria-label="Asistente del lote" tabIndex={-1} className="h-[100dvh] w-full max-w-md overflow-y-auto bg-[#F5F8F4] p-4 outline-none">
      <button onClick={onClose} className="mb-3 rounded-lg border border-[#526157]/30 bg-white px-4 py-2 text-sm font-semibold text-[#17251D] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]">Cerrar asistente</button>
      <GeminiChat lotId={lote.id} title="Asistente del lote" />
    </aside>
  </div>;
}
