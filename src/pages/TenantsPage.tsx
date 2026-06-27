import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createTenant, listTenants } from "../lib/api";
import { formatDate } from "../lib/format";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { Tenant } from "../types/admin";

export function TenantsPage() {
  const { authHeaders } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const refresh = useCallback(async () => {
    setTenants(await listTenants(authHeaders));
  }, [authHeaders]);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tenants"))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createTenant(authHeaders, { name: name.trim(), slug: slug.trim().toLowerCase() });
      setName("");
      setSlug("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading tenants…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tenants</h1>
          <p className="text-sm text-slate-400">Create and manage customer tenants</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          {showForm ? "Cancel" : "Create tenant"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <label className="block text-sm">
            <span className="font-medium text-slate-300">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-300">Slug</span>
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-corp"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No tenants
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3">
                  <Link to={`/tenants/${t.id}`} className="font-medium text-violet-400 hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">{t.slug}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-slate-400">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
