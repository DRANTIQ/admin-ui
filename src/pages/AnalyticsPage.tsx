import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getProductFunnel } from "../lib/api";
import type { FunnelStep, TenantFunnelRow } from "../types/admin";

const STAGE_LABELS: Record<string, string> = {
  signup: "Signup",
  workspace_created: "Workspace",
  cloud_connected: "Cloud connected",
  first_scan: "First scan",
  second_scan: "Second scan",
  returning_user: "Returning",
  invited_teammate: "Invited teammate",
  paid: "Paid",
};

export function AnalyticsPage() {
  const { authHeaders } = useAuth();
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [tenants, setTenants] = useState<TenantFunnelRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    getProductFunnel(authHeaders)
      .then((data) => {
        setSteps(data.steps);
        setTenants(data.tenants);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load funnel"))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const maxCount = useMemo(() => Math.max(...steps.map((s) => s.count), 1), [steps]);

  const filteredTenants = useMemo(() => {
    if (stageFilter === "all") return tenants;
    return tenants.filter((row) => row.stage === stageFilter);
  }, [tenants, stageFilter]);

  if (loading) return <p className="text-slate-400">Loading product analytics…</p>;

  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Product funnel</h1>
        <p className="text-sm text-slate-400">
          Workspace activation from signup through paid conversion. Derived from live platform data.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">Activation funnel</h2>
        <p className="mt-1 text-sm text-slate-400">
          Conversion rate is relative to the previous step.
        </p>
        <div className="mt-6 space-y-4">
          {steps.map((step, index) => (
            <FunnelBar
              key={step.key}
              step={step}
              maxCount={maxCount}
              showArrow={index < steps.length - 1}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Workspaces by stage</h2>
            <p className="text-sm text-slate-400">Highest funnel stage reached per tenant</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <span>Stage</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
            >
              <option value="all">All</option>
              {Object.entries(STAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Workspace</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Integrations</th>
              <th className="px-4 py-3 font-medium">Scans</th>
              <th className="px-4 py-3 font-medium">Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredTenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No workspaces match this filter.
                </td>
              </tr>
            )}
            {filteredTenants.map((row) => (
              <tr key={row.tenant_id} className="hover:bg-slate-950/40">
                <td className="px-4 py-3">
                  <Link
                    to={`/tenants/${row.tenant_id}`}
                    className="font-medium text-violet-400 hover:underline"
                  >
                    {row.tenant_name}
                  </Link>
                  <p className="font-mono text-xs text-slate-500">{row.tenant_slug}</p>
                </td>
                <td className="px-4 py-3">
                  <StageBadge stage={row.stage} />
                </td>
                <td className="px-4 py-3 capitalize text-slate-300">{row.plan}</td>
                <td className="px-4 py-3 text-slate-300">{row.integration_count}</td>
                <td className="px-4 py-3 text-slate-300">{row.scan_count}</td>
                <td className="px-4 py-3 text-slate-300">{row.member_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-500">
        <p className="font-medium text-slate-400">Definitions</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Signup — total users in platform.users</li>
          <li>Returning user — assessments run on 2+ separate calendar days</li>
          <li>Invited teammate — accepted invitation or more than one active member</li>
          <li>Paid — plan is starter, growth, or enterprise (not trial)</li>
        </ul>
      </div>
    </div>
  );
}

function FunnelBar({
  step,
  maxCount,
  showArrow,
}: {
  step: FunnelStep;
  maxCount: number;
  showArrow: boolean;
}) {
  const width = Math.max(4, Math.round((step.count / maxCount) * 100));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-medium text-slate-100">{step.label}</p>
          <p className="text-xs text-slate-500">{step.description}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-white">{step.count}</p>
          {step.conversion_rate != null && (
            <p className="text-xs text-slate-400">{step.conversion_rate}% from previous</p>
          )}
        </div>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-violet-500"
          style={{ width: `${width}%` }}
        />
      </div>
      {showArrow && <p className="mt-2 text-center text-slate-600">↓</p>}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const label = STAGE_LABELS[stage] ?? stage;
  const tone =
    stage === "paid"
      ? "bg-emerald-900/40 text-emerald-300"
      : stage === "first_scan" || stage === "second_scan" || stage === "returning_user"
        ? "bg-violet-900/40 text-violet-200"
        : stage === "cloud_connected"
          ? "bg-blue-900/40 text-blue-200"
          : "bg-slate-800 text-slate-300";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}
