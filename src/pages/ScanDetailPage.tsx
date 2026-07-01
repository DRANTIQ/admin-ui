import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getTenantScanDetail } from "../lib/api";
import { formatDate } from "../lib/format";
import { accountScopeLabel, providerBadge } from "../lib/integrationDisplay";
import { formatEngineeringError, primaryFailureMessage } from "../lib/scanDiagnostics";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { AdminScanDetail } from "../types/admin";

export function ScanDetailPage() {
  const { tenantId, scanId } = useParams<{ tenantId: string; scanId: string }>();
  const { authHeaders } = useAuth();
  const [detail, setDetail] = useState<AdminScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !scanId) return;
    let cancelled = false;
    setLoading(true);
    getTenantScanDetail(authHeaders, tenantId, scanId)
      .then((row) => {
        if (!cancelled) {
          setDetail(row);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load scan");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authHeaders, tenantId, scanId]);

  if (loading) return <p className="text-slate-400">Loading scan diagnostics…</p>;
  if (error || !detail) {
    return (
      <div className="space-y-3">
        <div className="text-red-300">{error || "Scan not found"}</div>
        {tenantId && (
          <Link to={`/tenants/${tenantId}`} className="text-sm text-violet-400 hover:underline">
            ← Back to tenant
          </Link>
        )}
      </div>
    );
  }

  const failure = primaryFailureMessage(detail);
  const scanError = formatEngineeringError(detail.error);
  const collectionError = formatEngineeringError(detail.collection_error);

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/tenants/${detail.tenant_id}`} className="text-sm text-violet-400 hover:underline">
          ← {detail.tenant_name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Scan diagnostics</h1>
          <StatusBadge status={detail.status} />
          {detail.provider && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
              {providerBadge(detail.provider)}
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-slate-500">{detail.id}</p>
        <p className="text-sm text-slate-400">
          Trace <span className="font-mono text-slate-300">{detail.trace_id}</span>
        </p>
      </div>

      {failure && (
        <section className="rounded-xl border border-red-900 bg-red-950/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">
            Engineering failure
          </h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-sm text-red-100">
            {failure}
          </pre>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Status" value={detail.status} />
        <Metric label="Collection" value={detail.collection_status ?? "—"} />
        <Metric label="Resources collected" value={String(detail.resource_count ?? 0)} />
        <Metric label="Updated" value={formatDate(detail.updated_at)} />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium text-white">Integration</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Provider" value={detail.provider ? providerBadge(detail.provider) : "—"} />
          <Field
            label={accountScopeLabel(detail.provider)}
            value={detail.account_id ?? "—"}
            mono
          />
          <Field label="Integration ID" value={detail.integration_id} mono />
          <Field
            label="Credentials"
            value={
              detail.provider === "azure"
                ? `Tenant ${detail.azure_tenant_id ?? "—"} · App ${detail.azure_client_id ?? "—"}`
                : detail.role_arn ?? "—"
            }
            mono
          />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium text-white">Error payloads</h2>
        <div className="mt-4 space-y-4">
          <ErrorBlock title="Scan error" value={scanError} />
          <ErrorBlock title="Collection run error" value={collectionError} />
          {detail.manifest_s3_uri && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Manifest URI</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-300">{detail.manifest_s3_uri}</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-white">Event timeline</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {detail.timeline.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    No events recorded
                  </td>
                </tr>
              )}
              {detail.timeline.map((event, index) => (
                <tr key={`${event.event_type}-${event.created_at}-${index}`}>
                  <td className="px-4 py-3 text-slate-400">{formatDate(event.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-violet-300">{event.event_type}</td>
                  <td className="px-4 py-3">
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-400">
                      {event.payload ? JSON.stringify(event.payload, null, 2) : "—"}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-600">
        Ops-only view — share sanitized messages with customers; raw payloads may include internal paths.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-1 text-slate-200 ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</dd>
    </div>
  );
}

function ErrorBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{title}</p>
      {value ? (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-xs text-amber-200">
          {value}
        </pre>
      ) : (
        <p className="mt-1 text-slate-500">—</p>
      )}
    </div>
  );
}
