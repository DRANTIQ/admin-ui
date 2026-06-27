import { type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isSupabaseAuth } from "../../lib/config";

function AccessBlocked({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { signOut, email } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="mx-auto max-w-md text-center text-slate-200">
        <h1 className="text-lg font-semibold">{title}</h1>
        {email && <p className="mt-2 text-sm text-slate-500">Signed in as {email}</p>}
        <div className="mt-4 text-sm text-slate-400">{children}</div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-8 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Sign out
        </button>
        <p className="mt-4 text-xs text-slate-600">
          Then sign in with an ops account (e.g. ops@drantiq.local)
        </p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, needsProvisioning, isSuperAdmin, me, authError } = useAuth();
  const location = useLocation();

  if (!isSupabaseAuth() && isAuthenticated) {
    return children;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading session…
      </div>
    );
  }

  if (needsProvisioning) {
    return (
      <AccessBlocked title="Account not provisioned">
        Run membership seed with <code className="rounded bg-slate-800 px-1">super_admin</code> role.
      </AccessBlocked>
    );
  }

  if (me && !isSuperAdmin) {
    return (
      <AccessBlocked title="Super admin required">
        <p>
          Your role is <code className="rounded bg-slate-800 px-1">{me.role}</code>. Admin console
          requires <code className="rounded bg-slate-800 px-1">super_admin</code>.
        </p>
        {authError && <p className="mt-3 text-sm text-red-400">{authError}</p>}
      </AccessBlocked>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
