export type UserRole = "ADMIN" | "SUPERVISOR" | "OPERADOR";
export type UserProfile = { id: string; nombre: string; email: string; rol: UserRole; is_active: boolean };
export const roleHome: Record<UserRole, "/gerente" | "/packing" | "/campo"> = { ADMIN: "/gerente", SUPERVISOR: "/packing", OPERADOR: "/campo" };
export const roleLabels: Record<UserRole, string> = { ADMIN: "Gerencia", SUPERVISOR: "Supervisor de Packing", OPERADOR: "Operador de Campo" };
export function isUserRole(value: unknown): value is UserRole { return value === "ADMIN" || value === "SUPERVISOR" || value === "OPERADOR"; }
export function routeRole(path: string): UserRole | null {
  return path === "/gerente" || path === "/gerente/" ? "ADMIN" : path === "/packing" || path === "/packing/" ? "SUPERVISOR" : path === "/campo" || path === "/campo/" ? "OPERADOR" : null;
}
