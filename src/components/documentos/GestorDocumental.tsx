"use client";

import { useRef } from "react";
import { Download, FileCheck2, FileText, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTraceabilityStore, type DocumentRecord } from "@/store/useTraceabilityStore";

export function GestorDocumental({ readOnly, documentos }: { readOnly: boolean; documentos: DocumentRecord[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addDocumento = useTraceabilityStore((state) => state.addDocumento);
  const removeDocumento = useTraceabilityStore((state) => state.removeDocumento);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => addDocumento({ id: `DOC-${Date.now()}-${file.name}`, name: file.name, type: file.name.toLowerCase().includes("cert") ? "Certificado Fitosanitario" : "Guía de Remisión", size: `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB` }));
  }

  return <Card className="shadow-sm"><CardHeader className="border-b border-gray-100"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#C9603F]">Trazabilidad documental</p><CardTitle className="mt-2 text-lg">Guías y certificados</CardTitle></div><FileCheck2 className="text-[#1B4332]" size={21} /></div></CardHeader><CardContent className="space-y-4 p-5">
    {!readOnly && <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }} className="flex w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 bg-gray-50 px-5 py-7 text-center transition hover:border-[#1B4332] hover:bg-green-50"><Upload size={21} className="text-[#1B4332]" /><span className="text-sm font-bold text-gray-700">Arrastra aquí la guía o certificado</span><span className="text-xs text-gray-500">o haz clic para seleccionar un archivo</span><input ref={inputRef} type="file" accept=".pdf,image/*" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} /></button>}
    <div className="space-y-2">{documentos.length === 0 ? <p className="py-5 text-center text-xs text-gray-500">No hay documentos asociados a este lote.</p> : documentos.map((documento) => <div key={documento.id} className="flex items-center gap-3 border border-gray-100 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center bg-red-50 text-red-600"><FileText size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-gray-800">{documento.name}</p><p className="mt-1 text-[10px] text-gray-500">{documento.type} · {documento.size}</p></div>{readOnly ? <Button variant="ghost" className="h-8 min-h-8 px-2" aria-label={`Ver o descargar ${documento.name}`}><Download size={15} /></Button> : <Button variant="ghost" className="h-8 min-h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Eliminar ${documento.name}`} onClick={() => removeDocumento(documento.id)}><Trash2 size={15} /></Button>}</div>)}</div>
  </CardContent></Card>;
}
