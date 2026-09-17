"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isLoteRow, mapLoteRow, type LoteRow } from "@/lib/supabase/lotes";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";

export function useRealtimeLotes() {
  const addOrUpdateLote = useTraceabilityStore((state) => state.addOrUpdateLote);
  const replaceLotes = useTraceabilityStore((state) => state.replaceLotes);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let initialLoadComplete = false;
    const queuedRows: LoteRow[] = [];
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      replaceLotes([]);
      setError("Configura Supabase para cargar y sincronizar los lotes.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const applyRealtimeRow = (value: unknown) => {
      if (!isLoteRow(value)) {
        setError("Supabase recibió un lote con un formato no válido.");
        return;
      }
      if (!initialLoadComplete) {
        queuedRows.push(value);
      } else {
        addOrUpdateLote(mapLoteRow(value));
      }
    };

    const channel = supabase
      .channel("lotes-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lotes" }, (payload: { new: unknown }) => {
        applyRealtimeRow(payload.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lotes" }, (payload: { new: unknown }) => {
        applyRealtimeRow(payload.new);
      })
      .subscribe((status: string, subscriptionError?: Error) => {
        if (!active) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError(subscriptionError?.message ?? "No se pudo conectar al canal Realtime de lotes.");
        }
      });

    async function loadLotes() {
      const { data, error: loadError } = await supabase
        .from("lotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (loadError) {
        initialLoadComplete = true;
        queuedRows.forEach((row) => addOrUpdateLote(mapLoteRow(row)));
        setError(`No se pudieron cargar los lotes: ${loadError.message}`);
        setLoading(false);
        return;
      }

      const rows = data.filter(isLoteRow);
      replaceLotes(rows.map(mapLoteRow));
      initialLoadComplete = true;
      queuedRows.forEach((row) => addOrUpdateLote(mapLoteRow(row)));

      if (rows.length !== data.length) {
        setError("Algunos lotes de Supabase tienen datos incompletos y no se mostraron.");
      } else {
        setError(null);
      }
      setLoading(false);
    }

    void loadLotes();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [addOrUpdateLote, replaceLotes]);

  return { loading, error };
}
