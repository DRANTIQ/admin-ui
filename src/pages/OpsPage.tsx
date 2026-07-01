import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listAdminScans } from "../lib/api";
import { formatDate } from "../lib/format";
import { providerBadge } from "../lib/integrationDisplay";
import { scanErrorSummary } from "../lib/scanDiagnostics";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { AdminScan } from "../types/admin";

export function OpsPage() {
  const { authHeaders } = useAuth();
  const [scans, setScans] = useState<AdminScan[]>([]);
  const [filter, setFilter] = useState<"failed" | "all">("failed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listAdminScans(authHeaders, {
      status: filter === "failed" ? "failed" : undefined,
      limit: 100,
    })
      .then(setScans)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load scans"))
      .finally(() => setLoading(false));
  }, [authHeaders, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ops</h1>
        <p className="text-sm text-slate-400">
          Cross-tenant scan status — open a failed scan for engineering errors and timeline
        </p>
      </div>

      <div className="flex gap-2">
        <FilterBtn active={filter === "failed"} onClick={() => setFilter("failed")}>
          Failed only
        </FilterBtn>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          All recent
        </FilterBtn>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading scans…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Scan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {scans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No scans
                  </td>
                </tr>
              )}
              {scans.map((s) => {
                const err = scanErrorSummary(s);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/tenants/${s.tenant_id}`}
                        className="text-white hover:text-violet-300"
                      >
                        {s.tenant_name}
                      </Link>
                      <div className="font-mono text-xs text-slate-500">{s.tenant_slug}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {s.provider ? providerBadge(s.provider) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/tenants/${s.tenant_id}/scans/${s.id}`}
                        className="font-mono text-xs text-violet-400 hover:underline"
                      >
                        {s.id.slice(0, 8)}…
                      </Link>
                      {s.account_id && (
                        <div className="mt-1 font-mono text-xs text-slate-600">{s.account_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-red-300">
                      {err ? (
                        <Link
                          to={`/tenants/${s.tenant_id}/scans/${s.id}`}
                          className="line-clamp-2 hover:underline"
                          title={err}
                        >
                          {err}
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(s.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm ${
        active ? "bg-violet-600 text-white" : "border border-slate-700 text-slate-400"
      }`}
    >
      {children}
    </button>
  );
}
