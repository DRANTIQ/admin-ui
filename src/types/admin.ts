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
  status: string;
  trace_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminOverview = {
  tenant_count: number;
  failed_scan_count: number;
  active_scan_count: number;
  collect_queue_depth: number;
  events_queue_depth: number;
  api_status: string;
};

export type Integration = {
  id: string;
  tenant_id: string;
  provider: string;
  account_id: string;
  role_arn: string;
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
