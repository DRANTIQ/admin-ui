import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  createMembership,
  getTenant,
  listMemberships,
  updateTenant,
} from "../lib/api";
import { supabaseAuthIssuer } from "../lib/supabase";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { Membership, Tenant } from "../types/admin";

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { authHeaders } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [authSubject, setAuthSubject] = useState("");
  const [role, setRole] = useState("tenant_admin");

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const [t, m] = await Promise.all([
      getTenant(authHeaders, tenantId),
      listMemberships(authHeaders, tenantId),
    ]);
    setTenant(t);
    setMemberships(m);
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
    return <div className="text-red-300">{error || "Tenant not found"}</div>;
  }

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {memberships.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
