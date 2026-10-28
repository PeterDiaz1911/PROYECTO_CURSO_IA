export const dashboardStatuses = ["EN_CAMPO", "EN_PACKING", "PENDIENTE_FIRMA", "APROBADO", "RECHAZADO"] as const;
export type DashboardStatus = typeof dashboardStatuses[number];
export type DashboardPeriod = "7d" | "30d" | "90d" | "all";

export type DashboardLot = {
  id: string;
  fundo: string;
  cultivo: string;
  agroquimico: string;
  estado: DashboardStatus;
  fecha_cosecha: string;
  created_at: string;
};

export type GerenciaDashboardData = {
  lotes: DashboardLot[];
  documentos: number;
};

export function dashboardSinceDate(period: DashboardPeriod, now = new Date()): string | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return since.toISOString().slice(0, 10);
}

export function parseGerenciaDashboard(value: unknown): GerenciaDashboardData {
  if (!value || typeof value !== "object") throw new Error("Formato de panel no válido.");
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.lotes) || typeof record.documentos !== "number" || !Number.isSafeInteger(record.documentos) || record.documentos < 0) {
    throw new Error("Formato de panel no válido.");
  }

  const lotes = record.lotes.map((value): DashboardLot => {
    if (!value || typeof value !== "object") throw new Error("Formato de lote no válido.");
    const row = value as Record<string, unknown>;
    if (
      typeof row.id !== "string"
      || typeof row.fundo !== "string"
      || typeof row.cultivo !== "string"
      || typeof row.agroquimico !== "string"
      || typeof row.estado !== "string"
      || !dashboardStatuses.includes(row.estado as DashboardStatus)
      || typeof row.fecha_cosecha !== "string"
      || typeof row.created_at !== "string"
      || Number.isNaN(Date.parse(row.created_at))
    ) {
      throw new Error("Formato de lote no válido.");
    }
    return {
      id: row.id,
      fundo: row.fundo,
      cultivo: row.cultivo,
      agroquimico: row.agroquimico,
      estado: row.estado as DashboardStatus,
      fecha_cosecha: row.fecha_cosecha,
      created_at: row.created_at,
    };
  });
  return { lotes, documentos: record.documentos };
}

export function getStatusCounts(lotes: DashboardLot[]) {
  return dashboardStatuses.map((estado) => ({
    estado,
    total: lotes.filter((lote) => lote.estado === estado).length,
  }));
}
