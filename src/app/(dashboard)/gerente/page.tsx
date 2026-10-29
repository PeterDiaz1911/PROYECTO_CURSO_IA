"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IAAuditorGerencia } from "@/components/ai/IA_AuditorGerencia";
import { GerenciaDashboard } from "@/features/gerencia/GerenciaDashboard";
import { UsuariosAdministracion } from "@/features/admin/UsuariosAdministracion";
import { SupervisionDespachos } from "@/features/dispatches/SupervisionDespachos";

function GerenteWorkspace() {
  const tab = useSearchParams().get("tab") ?? "panel";
  let content: React.ReactNode;

  switch (tab) {
    case "autorizacion":
      content = <SupervisionDespachos />;
      break;
    case "auditoria":
      content = <IAAuditorGerencia />;
      break;
    case "usuarios":
      content = <UsuariosAdministracion />;
      break;
    default:
      content = <GerenciaDashboard />;
  }

  const isDashboard = !["autorizacion", "auditoria", "usuarios"].includes(tab);
  return <div className="space-y-6">
    {!isDashboard && <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#2D6A4F]">Gerencia ejecutiva</p><h1 className="mt-2 text-3xl font-bold text-[#17251D]">Supervisión de operaciones</h1><p className="mt-2 text-sm text-[#526157]">Vista activa: {tab} · navegación sin recarga.</p></div>}
    {content}
  </div>;
}

export default function GerentePage() {
  return <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando gerencia...</div>}><GerenteWorkspace /></Suspense>;
}
