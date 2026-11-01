import type { DashboardLot } from "./dashboard-data";

const exportStatusLabels: Record<DashboardLot["estado"], string> = {
  EN_CAMPO: "En campo",
  EN_PACKING: "En Packing",
  PENDIENTE_FIRMA: "Pendiente de firma",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

function csvCell(value: string) {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function formatLimaTimestamp(value: string) {
  return new Date(value).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function dashboardLotsCsv(lots: DashboardLot[]) {
  const rows = [
    ["Lote", "Fundo", "Cultivo", "Agroquímico", "Estado", "Destino", "Fecha de cosecha", "Registrado (America/Lima)", "Origen"],
    ...lots.map((lot) => [
      lot.id,
      lot.fundo,
      lot.cultivo,
      lot.agroquimico,
      exportStatusLabels[lot.estado],
      lot.destino === "USA" ? "Estados Unidos" : lot.destino === "UE" ? "Unión Europea" : lot.destino ?? "Sin destino",
      lot.fecha_cosecha,
      formatLimaTimestamp(lot.created_at),
      lot.fundo.startsWith("DEMO") ? "DEMO" : "No marcado DEMO",
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function dashboardCsvFilename(date: string) {
  return `lotes-filtrados-${date}.csv`;
}
