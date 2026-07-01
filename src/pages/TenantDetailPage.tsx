import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  createMembership,
  createTenantScan,
  getTenant,
  listMemberships,
  listTenantIntegrations,
  listTenantScans,
  updateTenant,
} from "../lib/api";
import { supabaseAuthIssuer } from "../lib/supabase";
import { formatDate } from "../lib/format";
import {
  integrationCredentialLine,
  integrationLabel,
  providerBadge,
} from "../lib/integrationDisplay";
import { scanErrorSummary } from "../lib/scanDiagnostics";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { AdminScan, Integration, Membership, Tenant } from "../types/admin";

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [scans, setScans] = useState<AdminScan[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [scansError, setScansError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runningScan, setRunningScan] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [authSubject, setAuthSubject] = useState("");
  const [role, setRole] = useState("tenant_admin");

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    setError(null);
    setIntegrationsError(null);
    setScansError(null);

    const t = await getTenant(authHeaders, tenantId);
    setTenant(t);

    const [membershipResult, integrationsResult, scansResult] = await Promise.allSettled([
      listMemberships(authHeaders, tenantId),
      listTenantIntegrations(authHeaders, tenantId),
      listTenantScans(authHeaders, tenantId),
    ]);

    if (membershipResult.status === "fulfilled") {
      setMemberships(membershipResult.value);
    } else {
      const msg =
        membershipResult.reason instanceof Error
          ? membershipResult.reason.message
          : "Failed to load memberships";
      setError(msg);
      setMemberships([]);
    }

    if (integrationsResult.status === "fulfilled") {
      const ints = integrationsResult.value;
      setIntegrations(ints);
      setSelectedIntegrationId((current) => {
        if (current && ints.some((row) => row.id === current)) return current;
        return ints[0]?.id ?? "";
      });
    } else {
      const msg =
        integrationsResult.reason instanceof Error
          ? integrationsResult.reason.message
          : "Failed to load integrations";
      setIntegrationsError(msg);
      setIntegrations([]);
    }

    if (scansResult.status === "fulfilled") {
      setScans(scansResult.value);
    } else {
      const msg =
        scansResult.reason instanceof Error ? scansResult.reason.message : "Failed to load scans";
      setScansError(msg);
      setScans([]);
    }
  }, [authHeaders, tenantId]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tenant"))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function handleSuspend() {
    if (!tenantId || !tenant) return;
    const next = tenant.status === "active" ? "suspended" : "active";
    try {
      const updated = await updateTenant(authHeaders, tenantId, { status: next });
      setTenant(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update tenant");
    }
  }

  async function handleRunScan() {
    if (!tenantId || !selectedIntegrationId) {
      setError("Select a cloud integration to scan");
      return;
    }
    setRunningScan(true);
    setError(null);
    setScanResult(null);
    try {
      const scan = await createTenantScan(authHeaders, tenantId, {
        integration_id: selectedIntegrationId,
      });
      setScanResult(`Scan started — ${scan.id.slice(0, 8)}… (${scan.status})`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start scan");
    } finally {
      setRunningScan(false);
    }
  }

  async function handleMembershipSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createMembership(authHeaders, tenantId, {
        auth_issuer: supabaseAuthIssuer(),
        auth_subject: authSubject.trim(),
        email: email.trim() || undefined,
        role,
      });
      setEmail("");
      setAuthSubject("");
      setRole("tenant_admin");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add membership");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading tenant…</p>;
  if (!tenant) {
    return (
      <div className="space-y-3">
        <div className="text-red-300">{error || "Tenant not found"}</div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const latestScan = scans[0];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/tenants" className="text-sm text-violet-400 hover:underline">
          ← Tenants
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">{tenant.name}</h1>
          <StatusBadge status={tenant.status} />
          <button
            type="button"
            onClick={handleSuspend}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
          >
            {tenant.status === "active" ? "Suspend" : "Activate"}
          </button>
        </div>
        <p className="mt-1 font-mono text-sm text-slate-500">{tenant.slug}</p>
        <p className="font-mono text-xs text-slate-600">{tenant.id}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {scanResult && latestScan && (
        <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {scanResult}{" "}
          <Link
            to={`/tenants/${tenantId}/scans/${latestScan.id}`}
            className="font-medium text-emerald-200 underline hover:text-white"
          >
            View scan
          </Link>
          {" · "}
          <button
            type="button"
            onClick={() => navigate("/ops")}
            className="font-medium text-emerald-200 underline hover:text-white"
          >
            Ops
          </button>
        </p>
      )}
      {scanResult && !latestScan && (
        <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {scanResult}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Integrations</p>
          <p className="mt-1 text-lg font-semibold text-white">{integrations.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Members</p>
          <p className="mt-1 text-lg font-semibold text-white">{memberships.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Recent scans</p>
          <p className="mt-1 text-lg font-semibold text-white">{scans.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Latest scan</p>
          <p className="mt-1 font-semibold text-white">
            {latestScan ? <StatusBadge status={latestScan.status} /> : "—"}
          </p>
          {latestScan && (
            <p className="mt-1 text-xs text-slate-500">{formatDate(latestScan.updated_at)}</p>
          )}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-white">Cloud integrations</h2>
          {integrations.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedIntegrationId}
                onChange={(e) => setSelectedIntegrationId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                {integrations.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integrationLabel(integration)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleRunScan}
                disabled={runningScan || !selectedIntegrationId}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {runningScan ? "Starting scan…" : "Run scan"}
              </button>
            </div>
          )}
        </div>

        {integrationsError && (
          <div className="rounded-lg border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            {integrationsError}
            <span className="ml-2 text-amber-400">
              Restart the platform API if this endpoint was recently added.
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Credentials</th>
                <th className="px-4 py-3">Regions / locations</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {integrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No integrations registered for this tenant
                  </td>
                </tr>
              )}
              {integrations.map((integration) => (
                <tr key={integration.id}>
                  <td className="px-4 py-3 text-slate-300">{providerBadge(integration.provider)}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{integration.account_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {integrationCredentialLine(integration)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{integration.regions.join(", ")}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={integration.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(integration.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-white">Recent scans</h2>
        {scansError && (
          <div className="rounded-lg border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            {scansError}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Scan</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {scans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No scans yet
                  </td>
                </tr>
              )}
              {scans.map((scan) => {
                const err = scanErrorSummary(scan);
                return (
                  <tr key={scan.id}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/tenants/${tenantId}/scans/${scan.id}`}
                        className="font-mono text-xs text-violet-400 hover:underline"
                      >
                        {scan.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {scan.provider ? providerBadge(scan.provider) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={scan.status} />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-red-300">
                      {err ? (
                        <span className="line-clamp-2" title={err}>
                          {err}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(scan.started_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(scan.completed_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Memberships</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
          >
            {showForm ? "Cancel" : "Add user"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleMembershipSubmit}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-xs text-slate-500">
              Issuer: <code className="text-slate-400">{supabaseAuthIssuer()}</code>
            </p>
            <label className="block text-sm">
              <span className="text-slate-300">Supabase user UID (sub)</span>
              <input
                required
                value={authSubject}
                onChange={(e) => setAuthSubject(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="tenant_admin">tenant_admin</option>
                <option value="viewer">viewer</option>
                <option value="super_admin">super_admin</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add membership"}
            </button>
          </form>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {memberships.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No memberships
                  </td>
                </tr>
              )}
              {memberships.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">{m.email ?? "—"}</td>
                  <td className="px-4 py-3">{m.role}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.auth_subject}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
