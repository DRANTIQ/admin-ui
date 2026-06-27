export type DevRole = "super_admin" | "tenant_admin" | "viewer";

const TENANT_KEY = "platform_admin_tenant_id";
const ROLE_KEY = "platform_admin_role";

export function loadTenantId(): string {
  return localStorage.getItem(TENANT_KEY) ?? import.meta.env.VITE_TENANT_ID ?? "";
}

export function loadRole(): DevRole {
  const raw = localStorage.getItem(ROLE_KEY) ?? import.meta.env.VITE_DEV_ROLE ?? "super_admin";
  if (raw === "super_admin" || raw === "tenant_admin" || raw === "viewer") return raw;
  return "super_admin";
}

export function saveDevAuth(tenantId: string, role: DevRole): void {
  localStorage.setItem(TENANT_KEY, tenantId);
  localStorage.setItem(ROLE_KEY, role);
}

export function defaultTenantId(): string {
  return import.meta.env.VITE_TENANT_ID ?? "";
}

export function roleLabel(role: string): string {
  if (role === "super_admin") return "Super admin";
  if (role === "tenant_admin") return "Tenant admin";
  return "Viewer";
}
