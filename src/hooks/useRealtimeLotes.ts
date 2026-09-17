"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTraceabilityStore, type HarvestLotRecord } from "@/store/useTraceabilityStore";

type LoteRow = Partial<HarvestLotRecord> & {
  id: string;
  cultivo: string;
  agroquimico: string;
  dias: number;
  ppm: number;
  fundo: string;
  estado: HarvestLotRecord["estado"];
  status: HarvestLotRecord["status"];
  fecha_cosecha: string;
};

function mapRow(row: LoteRow): HarvestLotRecord {
  return {
    id: row.id,
    cultivo: row.cultivo,
    agroquimico: row.agroquimico,
    dias: row.dias,
    ppm: row.ppm,
    diasRequeridos: row.diasRequeridos ?? 14,
    estado: row.estado,
    fundo: row.fundo,
    status: row.status,
    fechaCosecha: row.fecha_cosecha,
  };
}

export function useRealtimeLotes() {
  const addOrUpdateLote = useTraceabilityStore((state) => state.addOrUpdateLote);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("lotes-cosecha-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lotes_cosecha" }, (payload: { new: unknown }) => {
        addOrUpdateLote(mapRow(payload.new as LoteRow));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lotes_cosecha" }, (payload: { new: unknown }) => {
        addOrUpdateLote(mapRow(payload.new as LoteRow));
      })
      .subscribe();

    // La suscripción se elimina al desmontar el componente para evitar
    // listeners duplicados y conexiones abiertas al cambiar de vista.
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [addOrUpdateLote]);
}
