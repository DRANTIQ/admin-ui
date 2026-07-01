import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isSupabaseAuth } from "../../lib/config";
import { roleLabel } from "../../lib/auth";

export function AppShell() {
  const { email, role, signOut, mode } = useAuth();
  const navigate = useNavigate();
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${isActive ? "text-white" : "text-slate-400 hover:text-slate-200"}`;

  async function handleLogout() {
    await signOut();
    if (isSupabaseAuth()) {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-lg font-semibold tracking-tight text-white">
              Platform Admin
            </Link>
            <nav className="flex gap-5">
              <NavLink to="/" end className={navCls}>
                Overview
              </NavLink>
              <NavLink to="/analytics" className={navCls}>
                Analytics
              </NavLink>
              <NavLink to="/tenants" className={navCls}>
                Tenants
              </NavLink>
              <NavLink to="/ops" className={navCls}>
                Ops
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full bg-violet-900/50 px-2 py-1 font-medium text-violet-200">
              {roleLabel(role)}
            </span>
            {email && <span className="hidden sm:inline">{email}</span>}
            <span className="rounded-full bg-slate-800 px-2 py-1">{mode}</span>
            {mode === "supabase" && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
