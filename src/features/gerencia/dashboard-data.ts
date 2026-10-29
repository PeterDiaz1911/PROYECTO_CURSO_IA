export const dashboardStatuses = ["EN_CAMPO", "EN_PACKING", "PENDIENTE_FIRMA", "APROBADO", "RECHAZADO"] as const;
export type DashboardStatus = typeof dashboardStatuses[number];
export type DashboardPeriod = "7d" | "30d" | "90d" | "all" | "custom";

export type DashboardLot = {
  id: string;
  fundo: string;
  cultivo: string;
  agroquimico: string;
  estado: DashboardStatus;
  fecha_cosecha: string;
  created_at: string;
  destino?: string | null;
  creado_por?: string;
};

export type GerenciaDashboardData = {
  lotes: DashboardLot[];
  documentos: number;
};

const limaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dateKeyInLima(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha no válida.");
  const parts = limaDate.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("No se pudo calcular la fecha local.");
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function dashboardSinceDate(period: DashboardPeriod, now = new Date()): string | null {
  if (period === "all" || period === "custom") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return shiftDateKey(dateKeyInLima(now), -(days - 1));
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
      destino: typeof row.destino === "string" ? row.destino : null,
      creado_por: typeof row.creado_por === "string" ? row.creado_por : undefined,
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

export type RegistrationBucket = { key: string; label: string; fullLabel: string; total: number };

export function getRegistrationSeries(
  lotes: DashboardLot[],
  startDate: string | null,
  endDate: string,
  granularity: "day" | "week",
  coverageStart?: string | null,
): RegistrationBucket[] {
  const observedDates = lotes.map((lote) => dateKeyInLima(lote.created_at)).sort();
  const firstObserved = coverageStart ?? observedDates[0];
  if (!firstObserved) return [];
  const start = startDate && startDate > firstObserved ? startDate : firstObserved;
  if (start > endDate) return [];

  const counts = new Map<string, number>();
  for (const lote of lotes) {
    const date = dateKeyInLima(lote.created_at);
    if (date < start || date > endDate) continue;
    const [year, month, day] = date.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const bucket = granularity === "day" ? date : shiftDateKey(date, -((weekday + 6) % 7));
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const output: RegistrationBucket[] = [];
  let cursor = granularity === "week"
    ? shiftDateKey(start, -((new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7))
    : start;
  const formatter = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "short",
  });
  while (cursor <= endDate) {
    const timestamp = new Date(`${cursor}T12:00:00Z`);
    const endOfBucket = granularity === "week" ? shiftDateKey(cursor, 6) : cursor;
    const coveredStart = cursor < start ? start : cursor;
    const coveredEnd = endOfBucket > endDate ? endDate : endOfBucket;
    const labelTimestamp = new Date(`${coveredStart}T12:00:00Z`);
    const fullLabel = granularity === "week"
      ? `${coveredStart !== cursor || coveredEnd !== endOfBucket ? "Semana parcial · " : ""}${formatter.format(labelTimestamp)} – ${formatter.format(new Date(`${coveredEnd}T12:00:00Z`))}`
      : formatter.format(labelTimestamp);
    output.push({
      key: cursor,
      label: formatter.format(labelTimestamp),
      fullLabel,
      total: counts.get(cursor) ?? 0,
    });
    cursor = shiftDateKey(cursor, granularity === "week" ? 7 : 1);
  }
  return output;
}

export function comparePeriodCounts(current: number, previous: number) {
  const difference = current - previous;
  return {
    difference,
    label: previous === 0
      ? `Sin base de comparación · ${difference >= 0 ? "+" : ""}${difference}`
      : `${difference >= 0 ? "+" : ""}${difference} vs. período anterior`,
  };
}
