import { create } from "zustand";

export type UserRole = "ADMIN" | "SUPERVISOR" | "OPERADOR";
export type Destination = "USA" | "UE" | "China";
export type PhytosanitaryStatus = "Óptimo" | "Revisión" | "Aprobado" | "Bloqueado";

export type ActiveLote = {
  id: string;
  cultivo: string;
  agroquimico: string;
  dias: number;
  ppm: number;
  diasRequeridos: number;
  estado: PhytosanitaryStatus;
  fundo: string;
};

export type PackingOrder = {
  id: string;
  tipo: string;
  cajas: number;
  peso: string;
  estado: "Pendiente" | "En revisión" | "Validada";
};

export type HarvestLotRecord = ActiveLote & {
  status: "En tránsito a Packing" | "Recibido" | "Procesando";
  fechaCosecha: string;
};

export type DocumentRecord = {
  id: string;
  name: string;
  type: "Guía de Remisión" | "Certificado Fitosanitario" | "Certificado de Empaque";
  size: string;
  url?: string;
};

type TraceabilityState = {
  activeLote: ActiveLote;
  selectedDestination: Destination;
  orders: PackingOrder[];
  lotesCosecha: HarvestLotRecord[];
  documentos: DocumentRecord[];
  aiContext: { lote: ActiveLote; destino: Destination };
  setDestination: (destination: Destination) => void;
  setActiveLote: (lote: ActiveLote) => void;
  validateOrders: () => void;
  addOrUpdateLote: (lote: HarvestLotRecord) => void;
  addDocumento: (documento: DocumentRecord) => void;
  removeDocumento: (id: string) => void;
  clearStore: () => void;
};

const initialLote: ActiveLote = {
  id: "LOT-24091",
  cultivo: "Arándano Biloxi",
  agroquimico: "Proclaim Opti 5 SG",
  dias: 18,
  ppm: 0.42,
  diasRequeridos: 14,
  estado: "Revisión",
  fundo: "Valle Azul · Ica",
};

export const useTraceabilityStore = create<TraceabilityState>((set) => ({
  activeLote: initialLote,
  selectedDestination: "USA",
  orders: [
    { id: "ORD-7831", tipo: "Exportación marítima", cajas: 420, peso: "8,400 kg", estado: "Pendiente" },
    { id: "ORD-7827", tipo: "Retail premium", cajas: 180, peso: "3,600 kg", estado: "En revisión" },
    { id: "ORD-7819", tipo: "Consolidado aéreo", cajas: 96, peso: "1,920 kg", estado: "Validada" },
  ],
  lotesCosecha: [{ ...initialLote, status: "En tránsito a Packing", fechaCosecha: "2026-09-17" }],
  documentos: [
    { id: "DOC-001", name: "guia-remision-LOT-24091.pdf", type: "Guía de Remisión", size: "1.2 MB" },
    { id: "DOC-002", name: "certificado-fitosanitario.pdf", type: "Certificado Fitosanitario", size: "840 KB" },
  ],
  aiContext: { lote: initialLote, destino: "USA" },
  setDestination: (destination) => set((state) => ({ selectedDestination: destination, aiContext: { lote: state.activeLote, destino: destination } })),
  setActiveLote: (lote) => set((state) => ({ activeLote: lote, aiContext: { lote, destino: state.selectedDestination } })),
  validateOrders: () => set((state) => {
    const destinationFactor = state.selectedDestination === "UE" ? 0.8 : 1;
    const approved = state.activeLote.dias >= state.activeLote.diasRequeridos && state.activeLote.ppm <= 0.5 * destinationFactor;
    const estado: PhytosanitaryStatus = approved ? "Aprobado" : "Revisión";
    const lote = { ...state.activeLote, estado };
    return { activeLote: lote, aiContext: { lote, destino: state.selectedDestination } };
  }),
  addOrUpdateLote: (lote) => set((state) => ({
    lotesCosecha: state.lotesCosecha.some((current) => current.id === lote.id)
      ? state.lotesCosecha.map((current) => current.id === lote.id ? lote : current)
      : [lote, ...state.lotesCosecha],
    activeLote: lote,
    aiContext: { lote, destino: state.selectedDestination },
  })),
  addDocumento: (documento) => set((state) => ({ documentos: [documento, ...state.documentos] })),
  removeDocumento: (id) => set((state) => ({ documentos: state.documentos.filter((documento) => documento.id !== id) })),
  clearStore: () => set({ activeLote: initialLote, selectedDestination: "USA", orders: [], lotesCosecha: [], documentos: [], aiContext: { lote: initialLote, destino: "USA" } }),
}));
