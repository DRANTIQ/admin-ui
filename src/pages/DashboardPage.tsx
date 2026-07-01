import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { checkHealth, getAdminOverview } from "../lib/api";
import type { AdminOverview } from "../types/admin";

export function DashboardPage() {
  const { authHeaders } = useAuth();
  const [health, setHealth] = useState("checking…");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth()
      .then((h) => setHealth(h.status))
      .catch(() => setHealth("unreachable"));
    getAdminOverview(authHeaders)
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load overview"));
  }, [authHeaders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-slate-400">Platform health and tenant activity</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="API health" value={health} />
        <StatCard label="Tenants" value={overview ? String(overview.tenant_count) : "…"} />
        <StatCard label="Failed scans" value={overview ? String(overview.failed_scan_count) : "…"} />
        <StatCard label="Active scans" value={overview ? String(overview.active_scan_count) : "…"} />
        <StatCard label="AWS collect queue" value={overview ? String(overview.collect_queue_depth) : "…"} />
        <StatCard
          label="Azure collect queue"
          value={overview ? String(overview.collect_azure_queue_depth ?? "—") : "…"}
        />
        <StatCard label="Events queue" value={overview ? String(overview.events_queue_depth) : "…"} />
        <StatCard label="Policy queue" value={overview ? String(overview.policy_queue_depth ?? "—") : "…"} />
      </div>

      <p className="text-sm text-slate-400">
        <Link to="/analytics" className="text-violet-400 hover:underline">
          Product funnel analytics →
        </Link>
        {" · "}
        <Link to="/ops" className="text-violet-400 hover:underline">
          Triage failed scans in Ops →
        </Link>
        {" · "}
        <Link to="/tenants" className="text-violet-400 hover:underline">
          Manage tenants →
        </Link>
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
