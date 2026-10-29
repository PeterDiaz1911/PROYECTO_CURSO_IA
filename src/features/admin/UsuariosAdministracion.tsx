"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownWideNarrow, ChevronLeft, ChevronRight, RefreshCw, Search, ShieldCheck, UserCog, UserRoundPlus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthProvider";
import { roleLabels, type UserRole } from "@/features/auth/roles";

type UsuarioListado = {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  is_active: boolean;
  telefono: string | null;
  descripcion: string | null;
  created_at: string;
};

const roleOptions: UserRole[] = ["ADMIN", "SUPERVISOR", "OPERADOR"];
const pageSize = 10;

export function UsuariosAdministracion() {
  const { client, profile } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioListado[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dateOrder, setDateOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const isAdmin = profile?.rol === "ADMIN";

  const loadUsuarios = useCallback(async () => {
    if (!client) {
      setError("No está disponible la conexión con Supabase.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, error: requestError } = await client
        .from("usuarios")
        .select("id, email, nombre, rol, is_active, telefono, descripcion, created_at")
        .order("created_at", { ascending: false });

      if (requestError) throw new Error(requestError.message);
      setUsuarios((data ?? []) as UsuarioListado[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la lista de usuarios.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadUsuarios();
  }, [loadUsuarios]);

  const canEditUser = (usuario: UsuarioListado) => usuario.id !== profile?.id;

  async function updateRole(usuario: UsuarioListado, nextRole: UserRole) {
    if (!client || !isAdmin) return;
    if (!canEditUser(usuario) && nextRole !== "ADMIN") {
      setError("No puedes quitarte el rol de administrador a tu propia cuenta.");
      return;
    }

    setSavingId(usuario.id);
    setError("");
    setNotice("");
    try {
      const { error: requestError } = await client.rpc("admin_set_usuario_rol", {
        p_user_id: usuario.id,
        p_rol: nextRole,
      });

      if (requestError) throw new Error(requestError.message);
      setUsuarios((items) => items.map((item) => (item.id === usuario.id ? { ...item, rol: nextRole } : item)));
      setNotice(`Rol actualizado para ${usuario.nombre} a ${roleLabels[nextRole]}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el rol.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleUserState(usuario: UsuarioListado) {
    if (!client || !isAdmin) return;
    if (!canEditUser(usuario)) {
      setError("No puedes desactivar tu propia cuenta desde la administración.");
      return;
    }

    setSavingId(usuario.id);
    setError("");
    setNotice("");
    try {
      const { error: requestError } = await client.rpc("admin_set_usuario_estado", {
        p_user_id: usuario.id,
        p_is_active: !usuario.is_active,
      });

      if (requestError) throw new Error(requestError.message);
      setUsuarios((items) => items.map((item) => (item.id === usuario.id ? { ...item, is_active: !item.is_active } : item)));
      setNotice(`${usuario.nombre} quedó ${!usuario.is_active ? "activo" : "inactivo"}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar el estado del usuario.");
    } finally {
      setSavingId(null);
    }
  }

  const summary = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((usuario) => usuario.is_active).length;
    const corteReciente = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recientes = usuarios.filter((usuario) => {
      const createdAt = Date.parse(usuario.created_at);
      return Number.isFinite(createdAt) && createdAt >= corteReciente;
    }).length;
    const porRol = roleOptions.map((rol) => ({
      rol,
      total: usuarios.filter((usuario) => usuario.rol === rol).length,
    }));
    return { total, activos, inactivos: total - activos, recientes, porRol };
  }, [usuarios]);

  const filteredUsuarios = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return usuarios.filter((usuario) => {
      const matchesQuery = !normalizedQuery || [usuario.nombre, usuario.email, usuario.telefono, usuario.descripcion]
        .some((value) => value?.toLocaleLowerCase("es").includes(normalizedQuery));
      const matchesRole = roleFilter === "all" || usuario.rol === roleFilter;
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" ? usuario.is_active : !usuario.is_active);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [usuarios, query, roleFilter, statusFilter]);

  const sortedUsuarios = useMemo(() => [...filteredUsuarios].sort((left, right) => {
    const difference = Date.parse(left.created_at) - Date.parse(right.created_at);
    return dateOrder === "newest" ? -difference : difference;
  }), [filteredUsuarios, dateOrder]);

  useEffect(() => { setPage(1); }, [query, roleFilter, statusFilter, dateOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredUsuarios.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleUsuarios = sortedUsuarios.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!isAdmin) {
    return <Card className="rounded-2xl border-red-200 bg-red-50 shadow-none"><CardContent className="flex items-start gap-3 p-5 text-red-950"><AlertCircle size={20} className="mt-0.5 shrink-0" /><div><p className="font-bold">Acceso restringido</p><p className="mt-1 text-sm">Esta vista solo está disponible para administradores activos.</p></div></CardContent></Card>;
  }

  return (
    <section className="space-y-5" aria-labelledby="usuarios-admin-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2D6A4F]">Administración</p>
          <h1 id="usuarios-admin-title" className="mt-2 text-2xl font-bold text-[#17251D]">Usuarios del sistema</h1>
          <p className="mt-2 text-sm text-[#526157]">Control de acceso, estado activo y distribución de roles.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11 self-start rounded-xl sm:self-auto" onClick={() => void loadUsuarios()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Actualizar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuarios registrados" value={summary.total.toLocaleString("es-PE")} detail="Cuentas en el sistema" accent="bg-[#E8EEE7] text-[#1B4332]" />
        <StatCard label="Cuentas activas" value={summary.activos.toLocaleString("es-PE")} detail={`${summary.total ? Math.round((summary.activos / summary.total) * 100) : 0}% del total`} accent="bg-[#DCF4E4] text-[#1B4332]" />
        <StatCard label="Cuentas inactivas" value={summary.inactivos.toLocaleString("es-PE")} detail="Sin acceso habilitado" accent="bg-[#F5E7D1] text-[#7A4A14]" />
        <StatCard label="Altas últimos 30 días" value={summary.recientes.toLocaleString("es-PE")} detail="Según fecha de registro" accent="bg-[#E8EEF3] text-[#31556F]" />
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><UserRoundPlus size={18} /> Distribución por rol</CardTitle><p className="mt-1 text-xs text-[#526157]">Cuentas registradas por nivel de acceso.</p></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {summary.porRol.map(({ rol, total }) => {
            const percentage = summary.total ? (total / summary.total) * 100 : 0;
            return <div key={rol}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-[#17251D]">{roleLabels[rol]}</span><span className="tabular-nums text-[#526157]">{total} · {Math.round(percentage)}%</span></div>
              <div role="img" aria-label={`${roleLabels[rol]}: ${total} de ${summary.total} usuarios`} className="h-2 overflow-hidden rounded-full bg-[#E8EEE7]"><div className="h-full rounded-full bg-[#2D6A4F]" style={{ width: `${percentage}%` }} /></div>
            </div>;
          })}
        </CardContent>
      </Card>

      {error && <Card className="rounded-2xl border-red-200 bg-red-50 shadow-none"><CardContent className="p-4 text-sm text-red-950">{error}</CardContent></Card>}
      {notice && <Card className="rounded-2xl border-green-200 bg-green-50 shadow-none"><CardContent className="p-4 text-sm text-green-950">{notice}</CardContent></Card>}

      <Card className="rounded-2xl">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><UserCog size={18} /> Listado de usuarios</CardTitle><p className="mt-1 text-xs text-[#526157]">Busca por nombre, correo, teléfono o descripción, y filtra por rol o estado.</p></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-5 pb-5 text-sm text-[#526157]">Cargando usuarios…</p>
          ) : usuarios.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[#526157]">No hay usuarios registrados aún.</p>
          ) : (
            <>
            <div className="grid gap-3 border-y border-[#17251D]/10 bg-[#F5F8F4]/60 p-4 sm:grid-cols-[minmax(220px,1fr)_180px_170px_190px]">
              <label className="relative block">
                <span className="sr-only">Buscar usuarios</span>
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuarios…" className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3 text-sm text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" />
              </label>
              <label className="block text-sm font-semibold text-[#526157]">
                <span className="sr-only">Filtrar por rol</span>
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserRole | "all")} className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm font-medium text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20">
                  <option value="all">Todos los roles</option>
                  {roleOptions.map((rol) => <option key={rol} value={rol}>{roleLabels[rol]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-[#526157]">
                <span className="sr-only">Filtrar por estado</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")} className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm font-medium text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20">
                  <option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
                </select>
              </label>
              <label className="relative block">
                <span className="sr-only">Ordenar usuarios por fecha de registro</span>
                <ArrowDownWideNarrow size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526157]" />
                <select value={dateOrder} onChange={(event) => setDateOrder(event.target.value as "newest" | "oldest")} className="min-h-11 w-full rounded-xl border border-[#17251D]/15 bg-white pl-10 pr-3 text-sm font-medium text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20">
                  <option value="newest">Registro más reciente</option><option value="oldest">Registro más antiguo</option>
                </select>
              </label>
            </div>
            {filteredUsuarios.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#526157]">No hay usuarios que coincidan con la búsqueda y los filtros.</p>
            ) : <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-[#17251D]/10 bg-[#F5F8F4] text-[10px] uppercase tracking-wider text-[#526157]">
                  <tr>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Rol</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Registro</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17251D]/10">
                  {visibleUsuarios.map((usuario) => (
                    <tr key={usuario.id} className="align-top hover:bg-[#F5F8F4]/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#17251D]">{usuario.nombre}</div>
                        {usuario.telefono && <div className="mt-1 text-xs text-[#526157]">{usuario.telefono}</div>}
                      </td>
                      <td className="px-3 py-4 text-[#17251D]">
                        <span className="block">{usuario.email}</span>
                        {usuario.descripcion && <span className="mt-1 block max-w-xs text-xs text-[#526157]">{usuario.descripcion}</span>}
                      </td>
                      <td className="px-3 py-4">
                        <label className="sr-only" htmlFor={`rol-${usuario.id}`}>Cambiar rol de {usuario.nombre}</label>
                        <select
                          id={`rol-${usuario.id}`}
                          value={usuario.rol}
                          disabled={savingId === usuario.id || !canEditUser(usuario)}
                          onChange={(event) => void updateRole(usuario, event.target.value as UserRole)}
                          className="min-h-10 w-full rounded-xl border border-[#17251D]/15 bg-white px-3 text-sm text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 disabled:cursor-not-allowed disabled:bg-[#F6F8F7]"
                        >
                          {roleOptions.map((rol) => (
                            <option key={rol} value={rol}>{roleLabels[rol]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${usuario.is_active ? "bg-[#DCF4E4] text-[#1B4332]" : "bg-[#F5E7D1] text-[#7A4A14]"}`}>
                          {usuario.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-[#526157]">{Number.isFinite(Date.parse(usuario.created_at)) ? new Date(usuario.created_at).toLocaleDateString("es-PE") : "Sin fecha"}</td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          type="button"
                          variant={usuario.is_active ? "outline" : "primary"}
                          className="min-h-10 rounded-xl"
                          disabled={savingId === usuario.id || !canEditUser(usuario)}
                          onClick={() => void toggleUserState(usuario)}
                        >
                          {usuario.is_active ? <UserX size={15} /> : <ShieldCheck size={15} />}
                          <span className="ml-2">{usuario.is_active ? "Desactivar" : "Activar"}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
            {filteredUsuarios.length > 0 && <div className="flex flex-col gap-3 border-t border-[#17251D]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#526157]">Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsuarios.length)} de {filteredUsuarios.length} usuarios</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" aria-label="Página anterior" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /> Anterior</Button>
                <span className="min-w-16 text-center text-xs tabular-nums text-[#526157]">{currentPage} / {pageCount}</span>
                <Button type="button" variant="outline" className="min-h-9 rounded-lg px-3" aria-label="Página siguiente" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount}>Siguiente <ChevronRight size={16} /></Button>
              </div>
            </div>}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StatCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${accent}`}>{label}</div>
        <p className="mt-4 text-3xl font-bold tabular-nums text-[#17251D]">{value}</p>
        <p className="mt-2 text-xs text-[#526157]">{detail}</p>
      </CardContent>
    </Card>
  );
}
