import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getMe, type AuthHeaders } from "../lib/api";
import {
  defaultTenantId,
  loadRole,
  loadTenantId,
  saveDevAuth,
  type DevRole,
} from "../lib/auth";
import { isSupabaseAuth } from "../lib/config";
import { sleep } from "../lib/retry";
import { getSupabase } from "../lib/supabase";
import type { MeResponse } from "../types/admin";

type AuthContextValue = {
  mode: "dev_headers" | "supabase";
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  email: string | null;
  tenantId: string;
  role: DevRole;
  authHeaders: AuthHeaders;
  me: MeResponse | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setDevAuth: (tenantId: string, role: DevRole) => void;
  authError: string | null;
  needsProvisioning: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabaseMode = isSupabaseAuth();
  const [devTenantId, setDevTenantId] = useState(loadTenantId);
  const [devRole, setDevRole] = useState<DevRole>(loadRole);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(supabaseMode);
  const [authError, setAuthError] = useState<string | null>(null);
  const meRefreshRef = useRef<Promise<MeResponse> | null>(null);

  const refreshMe = useCallback(async (token: string) => {
    if (meRefreshRef.current) {
      return meRefreshRef.current;
    }

    const task = (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const profile = await getMe({ tenantId: "", role: "viewer", bearerToken: token });
          setMe(profile);
          setAuthError(null);
          return profile;
        } catch (e) {
          lastError = e;
          if (attempt < 3) {
            await sleep(250 * (attempt + 1));
          }
        }
      }
      const msg = lastError instanceof Error ? lastError.message : "Failed to load profile";
      setAuthError(msg);
      setMe(null);
      throw lastError instanceof Error ? lastError : new Error(msg);
    })();

    meRefreshRef.current = task;
    try {
      return await task;
    } finally {
      if (meRefreshRef.current === task) {
        meRefreshRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!supabaseMode) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.access_token) {
        try {
          await refreshMe(data.session.access_token);
        } catch (e) {
          setAuthError(e instanceof Error ? e.message : "Failed to load profile");
          setMe(null);
        }
      }
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.access_token) {
        setMe(null);
        return;
      }
      if (event === "INITIAL_SESSION") {
        return;
      }
      void refreshMe(nextSession.access_token).catch(() => undefined);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabaseMode, refreshMe]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session?.access_token) throw new Error("No session returned");
    setSession(data.session);
    await refreshMe(data.session.access_token);
  }, [refreshMe]);

  const signOut = useCallback(async () => {
    if (supabaseMode) {
      await getSupabase().auth.signOut();
    }
    setSession(null);
    setMe(null);
    setAuthError(null);
  }, [supabaseMode]);

  const setDevAuth = useCallback((tenantId: string, role: DevRole) => {
    saveDevAuth(tenantId, role);
    setDevTenantId(tenantId);
    setDevRole(role);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    if (supabaseMode) {
      const token = session?.access_token;
      const role = (me?.role as DevRole) ?? "viewer";
      const isSuperAdmin = role === "super_admin";
      const needsProvisioning =
        !!token && !me && !!authError?.toLowerCase().includes("provisioned");
      return {
        mode: "supabase",
        loading,
        isAuthenticated: !!token && !!me && isSuperAdmin,
        isSuperAdmin,
        needsProvisioning,
        email: me?.email ?? session?.user.email ?? null,
        tenantId: me?.tenant_id ?? "",
        role,
        authHeaders: {
          tenantId: me?.tenant_id ?? "",
          role,
          bearerToken: token,
        },
        me,
        signIn,
        signOut,
        setDevAuth,
        authError,
      };
    }

    const role = devRole;
    const isSuperAdmin = role === "super_admin";
    return {
      mode: "dev_headers",
      loading: false,
      isAuthenticated: !!devTenantId && isSuperAdmin,
      isSuperAdmin,
      needsProvisioning: false,
      email: null,
      tenantId: devTenantId || defaultTenantId(),
      role,
      authHeaders: {
        tenantId: devTenantId || defaultTenantId(),
        role,
      },
      me: null,
      signIn: async () => {
        throw new Error("Use dev headers or switch VITE_AUTH_MODE=supabase");
      },
      signOut: async () => undefined,
      setDevAuth,
      authError: null,
    };
  }, [
    supabaseMode,
    loading,
    session,
    me,
    devTenantId,
    devRole,
    signIn,
    signOut,
    setDevAuth,
    authError,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
