import { USER_ROLES, type UserRole } from "./types";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  gestao: "Gestão",
  comercial: "Comercial",
  logistica: "Logística",
  gerencia: "Gerência",
  financeiro: "Financeiro",
};

export const ROLE_MODULES: Record<UserRole, readonly string[] | "*"> = {
  gestao: "*",
  comercial: ["eventos", "comercial", "cadastros"],
  logistica: ["eventos", "cadastros", "logistica", "veiculos"],
  gerencia: ["eventos", "cozinha", "logistica", "veiculos", "administrativo"],
  financeiro: ["eventos", "administrativo", "financeiro"],
};

const MODULE_PREFIXES = [
  "eventos",
  "comercial",
  "cozinha",
  "logistica",
  "veiculos",
  "administrativo",
  "financeiro",
  "cadastros",
  "configuracoes",
] as const;

export type AppModuleId = (typeof MODULE_PREFIXES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function canAccessModule(role: UserRole, moduleId: string) {
  const allowed = ROLE_MODULES[role];
  if (allowed === "*") return true;
  return allowed.includes(moduleId);
}

export function moduleIdFromPath(pathname: string): AppModuleId | null {
  if (pathname.startsWith("/api/auth")) return null;
  if (pathname.startsWith("/api/users")) return "configuracoes";
  if (pathname.startsWith("/api/eventos")) return "eventos";
  if (pathname.startsWith("/api/cadastros")) return "cadastros";
  if (pathname.startsWith("/api/comercial")) return "comercial";
  if (pathname.startsWith("/api/logistica")) return "logistica";

  const first = pathname.split("/").filter(Boolean)[0];
  if (!first) return "eventos";
  if ((MODULE_PREFIXES as readonly string[]).includes(first)) {
    return first as AppModuleId;
  }
  return null;
}

export function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}
