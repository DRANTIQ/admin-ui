export type MeResponse = {
  tenant_id: string;
  role: string;
  subject: string;
  email: string | null;
  auth_mode: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  auth_issuer: string;
  auth_subject: string;
  status: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminScan = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  integration_id: string;
  provider?: string | null;
  account_id?: string | null;
  status: string;
  trace_id: string;
  error?: Record<string, unknown> | null;
  collection_status?: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminScanTimelineEvent = {
  event_type: string;
  created_at: string;
  payload?: Record<string, unknown> | null;
};

export type AdminScanDetail = AdminScan & {
  collection_error?: Record<string, unknown> | null;
  resource_count?: number | null;
  manifest_s3_uri?: string | null;
  role_arn?: string | null;
  azure_tenant_id?: string | null;
  azure_client_id?: string | null;
  timeline: AdminScanTimelineEvent[];
};

export type AdminOverview = {
  tenant_count: number;
  failed_scan_count: number;
  active_scan_count: number;
  collect_queue_depth: number;
  collect_azure_queue_depth?: number;
  events_queue_depth: number;
  policy_queue_depth?: number;
  api_status: string;
};

export type Integration = {
  id: string;
  tenant_id: string;
  provider: string;
  account_id: string;
  role_arn?: string | null;
  azure_tenant_id?: string | null;
  azure_client_id?: string | null;
  regions: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

export type AdminScanCreateResponse = {
  id: string;
  tenant_id: string;
  integration_id: string;
  status: string;
  trace_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
