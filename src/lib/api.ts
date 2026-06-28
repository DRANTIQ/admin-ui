import type {
  AdminOverview,
  AdminScan,
  AdminScanCreateResponse,
  Integration,
  MeResponse,
  Membership,
  Tenant,
} from "../types/admin";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type AuthHeaders = {
  tenantId: string;
  role: string;
  bearerToken?: string;
};

function parseApiError(text: string, fallback: string): string {
  try {
    const data = JSON.parse(text) as { detail?: unknown };
    const detail = data.detail;
    if (typeof detail === "string") return detail;
  } catch {
    /* plain text */
  }
  return text || fallback;
}

async function request<T>(
  auth: AuthHeaders,
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
  },
): Promise<T> {
  const base = import.meta.env.VITE_API_URL.replace(/\/$/, "");
  const url = new URL(path, `${base}/`);
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth.bearerToken) {
    headers.Authorization = `Bearer ${auth.bearerToken}`;
  } else {
    headers["X-Tenant-ID"] = auth.tenantId;
    headers["X-Role"] = auth.role;
  }

  const res = await fetch(url.toString(), {
    method: options?.method ?? "GET",
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(parseApiError(text, res.statusText), res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function checkHealth(): Promise<{ status: string }> {
  const base = import.meta.env.VITE_API_URL.replace(/\/$/, "");
  return fetch(`${base}/health`).then((r) => r.json());
}

export function getMe(auth: AuthHeaders): Promise<MeResponse> {
  return request(auth, "/v1/me");
}

export function getAdminOverview(auth: AuthHeaders): Promise<AdminOverview> {
  return request(auth, "/v1/admin/overview");
}

export function listTenants(auth: AuthHeaders): Promise<Tenant[]> {
  return request(auth, "/v1/admin/tenants");
}

export function createTenant(auth: AuthHeaders, body: { name: string; slug: string }): Promise<Tenant> {
  return request(auth, "/v1/admin/tenants", { method: "POST", body });
}

export function getTenant(auth: AuthHeaders, tenantId: string): Promise<Tenant> {
  return request(auth, `/v1/admin/tenants/${tenantId}`);
}

export function updateTenant(
  auth: AuthHeaders,
  tenantId: string,
  body: { name?: string; status?: string },
): Promise<Tenant> {
  return request(auth, `/v1/admin/tenants/${tenantId}`, { method: "PATCH", body });
}

export function listMemberships(auth: AuthHeaders, tenantId: string): Promise<Membership[]> {
  return request(auth, `/v1/admin/tenants/${tenantId}/memberships`);
}

export function createMembership(
  auth: AuthHeaders,
  tenantId: string,
  body: {
    auth_issuer: string;
    auth_subject: string;
    email?: string;
    role: string;
  },
): Promise<Membership> {
  return request(auth, `/v1/admin/tenants/${tenantId}/memberships`, { method: "POST", body });
}

export function listAdminScans(
  auth: AuthHeaders,
  filters?: { status?: string; limit?: number },
): Promise<AdminScan[]> {
  return request(auth, "/v1/admin/scans", { params: filters });
}

export function listTenantIntegrations(auth: AuthHeaders, tenantId: string): Promise<Integration[]> {
  return request(auth, `/v1/admin/tenants/${tenantId}/integrations`);
}

export function listTenantScans(
  auth: AuthHeaders,
  tenantId: string,
  limit = 20,
): Promise<AdminScan[]> {
  return request(auth, `/v1/admin/tenants/${tenantId}/scans`, { params: { limit } });
}

export function createTenantScan(
  auth: AuthHeaders,
  tenantId: string,
  body: { integration_id: string },
): Promise<AdminScanCreateResponse> {
  return request(auth, `/v1/admin/tenants/${tenantId}/scans`, { method: "POST", body });
}
