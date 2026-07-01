import type { Integration } from "../types/admin";

export function integrationLabel(integration: Integration): string {
  const provider = integration.provider === "azure" ? "Azure" : "AWS";
  return `${provider} · ${integration.account_id} (${integration.status})`;
}

export function providerBadge(provider: string): string {
  if (provider === "azure") return "Azure";
  if (provider === "aws") return "AWS";
  return provider.toUpperCase();
}

export function accountScopeLabel(provider?: string | null): string {
  if (provider === "azure") return "Subscription";
  return "Account";
}

export function integrationCredentialLine(integration: Integration): string {
  if (integration.provider === "azure") {
    const tenant = integration.azure_tenant_id ?? "—";
    const client = integration.azure_client_id ?? "—";
    return `Tenant ${tenant} · App ${client}`;
  }
  return integration.role_arn ?? "—";
}
