"use client";
import { GeminiChat } from "@//features/assistant/GeminiChat";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";
export function IAValidadorPacking() {
  const lotId = useTraceabilityStore((state) => state.activeLote.id);
  return <GeminiChat lotId={lotId} title="Asistente de Packing" />;
}
