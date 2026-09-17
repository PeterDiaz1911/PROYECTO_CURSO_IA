import type { HarvestLotRecord } from "@/store/useTraceabilityStore";

type LoteWorkflowState = "EN_CAMPO" | "EN_PACKING" | "PENDIENTE_FIRMA" | "APROBADO" | "RECHAZADO";

export type LoteRow = {
  id: string;
  fundo: string;
  cultivo: string;
  agroquimico: string;
  ppm: number | string;
  dias_transcurridos: number | string;
  dias_carencia: number | string;
  fecha_cosecha: string;
  estado: LoteWorkflowState;
};

const workflowStatus: Record<LoteWorkflowState, HarvestLotRecord["status"]> = {
  EN_CAMPO: "En tránsito a Packing",
  EN_PACKING: "Recibido",
  PENDIENTE_FIRMA: "Procesando",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

function isWorkflowState(value: unknown): value is LoteWorkflowState {
  return value === "EN_CAMPO"
    || value === "EN_PACKING"
    || value === "PENDIENTE_FIRMA"
    || value === "APROBADO"
    || value === "RECHAZADO";
}

function finiteNumber(value: unknown): number | null {
  if ((typeof value !== "number" && typeof value !== "string") || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function isLoteRow(value: unknown): value is LoteRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string"
    && typeof row.fundo === "string"
    && typeof row.cultivo === "string"
    && typeof row.agroquimico === "string"
    && finiteNumber(row.ppm) !== null
    && finiteNumber(row.dias_transcurridos) !== null
    && finiteNumber(row.dias_carencia) !== null
    && typeof row.fecha_cosecha === "string"
    && isWorkflowState(row.estado);
}

export function mapLoteRow(row: LoteRow): HarvestLotRecord {
  return {
    id: row.id,
    fundo: row.fundo,
    cultivo: row.cultivo,
    agroquimico: row.agroquimico,
    ppm: finiteNumber(row.ppm) ?? 0,
    dias: finiteNumber(row.dias_transcurridos) ?? 0,
    diasRequeridos: finiteNumber(row.dias_carencia) ?? 0,
    fechaCosecha: row.fecha_cosecha,
    estado: "Revisión",
    status: workflowStatus[row.estado],
  };
}
