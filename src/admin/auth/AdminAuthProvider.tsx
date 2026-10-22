import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { adminAuthApiService, type AdminAuthSession } from "../services/AdminAuthApiService";
import { AdminAuthContext } from "./AdminAuthContext";

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [session, setSession] = useState<AdminAuthSession | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setStatus("loading");
    setError(null);
    try {
      const next = await adminAuthApiService.getSession();
      if (version !== requestVersion.current) return;
      setSession(next);
      setStatus("authenticated");
    } catch (err) {
      if (version !== requestVersion.current) return;
      setSession(null);
      setStatus("unauthenticated");
      setError(err instanceof Error ? err.message : "Admin session check failed.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const version = ++requestVersion.current;
    setStatus("loading");
    setError(null);
    try {
      const next = await adminAuthApiService.login(email, password);
      if (version !== requestVersion.current) return;
      setSession(next);
      setStatus("authenticated");
    } catch (err) {
      if (version !== requestVersion.current) return;
      setSession(null);
      setStatus("unauthenticated");
      setError(err instanceof Error ? err.message : "Admin login failed.");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    requestVersion.current += 1;
    await adminAuthApiService.logout();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(() => {
    const permissions = new Set(session?.permissions ?? session?.user.permissions ?? []);
    return {
      session,
      status,
      error,
      isAuthenticated: status === "authenticated",
      isAdmin: permissions.has("admin.access"),
      isSuperAdmin: session?.user.roles.includes("super_admin") ?? false,
      hasPermission: (permission: string) => permissions.has(permission),
      hasAnyPermission: (items: readonly string[]) => items.some((permission) => permissions.has(permission)),
      login,
      logout,
      refresh,
    };
  }, [error, login, logout, refresh, session, status]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
