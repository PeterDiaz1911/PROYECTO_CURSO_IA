"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Bot, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Lote = { id: string; fundo: string; cultivo: string; agroquimico: string; diasCarencia: number; diasRequeridos: number; mercadoDestino: "USA" | "Unión Europea" | "China" };

const mockLotes: Lote[] = [
  { id: "LOT-24091", fundo: "Fundo Tate", cultivo: "Uva Sweet Globe", agroquimico: "Proclaim Opti 5 SG", diasCarencia: 18, diasRequeridos: 14, mercadoDestino: "USA" },
  { id: "LOT-24088", fundo: "San José", cultivo: "Palta Hass", agroquimico: "Lambda Cyhalothrin", diasCarencia: 9, diasRequeridos: 14, mercadoDestino: "Unión Europea" },
  { id: "LOT-24082", fundo: "Fundo Tate", cultivo: "Arándano Biloxi", agroquimico: "Sulfur 80 WG", diasCarencia: 21, diasRequeridos: 21, mercadoDestino: "China" },
  { id: "LOT-24079", fundo: "La Esperanza", cultivo: "Uva Red Globe", agroquimico: "Bacillus subtilis", diasCarencia: 25, diasRequeridos: 14, mercadoDestino: "USA" },
  { id: "LOT-24074", fundo: "San José", cultivo: "Mango Kent", agroquimico: "Abamectina", diasCarencia: 4, diasRequeridos: 10, mercadoDestino: "China" },
];

export function LotesDataTable({ data = mockLotes, onAskAi }: { data?: Lote[]; onAskAi?: (lote: Lote) => void }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo<ColumnDef<Lote>[]>(() => [
    { accessorKey: "id", header: "ID de Lote", cell: ({ getValue }) => <span className="font-bold text-forest">{String(getValue())}</span> },
    { accessorKey: "fundo", header: "Fundo", cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span> },
    { accessorKey: "cultivo", header: "Cultivo" },
    { accessorKey: "agroquimico", header: "Agroquímico Aplicado", cell: ({ getValue }) => <span className="text-ink/65">{String(getValue())}</span> },
    { accessorKey: "diasCarencia", header: "Días de Carencia", cell: ({ row }) => { const ready = row.original.diasCarencia >= row.original.diasRequeridos; return <Badge className={cn(ready ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{row.original.diasCarencia} / {row.original.diasRequeridos} días</Badge>; } },
    { accessorKey: "mercadoDestino", header: "Mercado Destino", cell: ({ getValue }) => <span className="text-xs font-semibold text-ink/65">{String(getValue())}</span> },
    { id: "actions", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center justify-end gap-1"><Button aria-label={`Ver detalles de ${row.original.id}`} variant="ghost" className="h-9 min-h-9 px-2"><Eye size={15} /></Button><Button aria-label={`Consultar IA sobre ${row.original.id}`} variant="secondary" className="h-9 min-h-9 px-2" onClick={() => onAskAi?.(row.original)}><Bot size={15} /></Button></div> },
  ], [onAskAi]);
  const table = useReactTable({ data, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), globalFilterFn: (row, _columnId, filterValue) => `${row.original.id} ${row.original.fundo}`.toLowerCase().includes(String(filterValue).toLowerCase()) });
  return <section className="border border-ink/10 bg-white shadow-sm shadow-ink/5" aria-labelledby="lotes-table-title"><div className="flex flex-col justify-between gap-4 border-b border-ink/10 p-5 sm:flex-row sm:items-start sm:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rust">Cadena agrícola</p><h2 id="lotes-table-title" className="mt-2 font-display text-2xl font-bold tracking-tight">Trazabilidad de lotes</h2><p className="mt-1 text-xs text-ink/50">Consulta el estado de carencia y destino de cada cosecha.</p></div><label className="relative block w-full sm:w-64"><span className="sr-only">Filtrar por ID de lote o fundo</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" /><Input value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="ID de lote o fundo" className="pl-9" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-ink/[.025] text-[10px] uppercase tracking-[.14em] text-ink/45"><tr>{table.getHeaderGroups()[0].headers.map((header) => <th key={header.id} className="px-5 py-3 font-bold">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr></thead><tbody className="divide-y divide-ink/10">{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id} className="text-sm transition hover:bg-lime/10">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-5 py-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-ink/50">No se encontraron lotes.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-ink/10 px-5 py-4"><p className="text-xs text-ink/50">Página <strong className="text-ink">{table.getState().pagination.pageIndex + 1}</strong> de {table.getPageCount() || 1}</p><div className="flex gap-1"><Button variant="outline" aria-label="Página anterior" className="h-9 min-h-9 px-2" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft size={15} /></Button><Button variant="outline" aria-label="Página siguiente" className="h-9 min-h-9 px-2" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight size={15} /></Button></div></div></section>;
}
