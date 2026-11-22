import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminAuthRequestError, adminAuthApiService, type AdminAuthSession } from "../services/AdminAuthApiService";
import { AdminAuthContext } from "./AdminAuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { adminLogoutEventKey, announceAdminLogout } from "./adminLogoutEvents";
import { mediaAssignmentReviewService } from "../../services/media/MediaAssignmentReviewService";

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const queryClient = useQueryClient();
  const initialSession = adminAuthApiService.getCachedSession();
  const [session, setSession] = useState<AdminAuthSession | null>(initialSession);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(initialSession ? "authenticated" : "loading");
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const clearAdminState = useCallback(() => {
    requestVersion.current++;
    adminAuthApiService.invalidateSession();
    setSession(null);
    setStatus("unauthenticated");
    setError(null);
    void queryClient.cancelQueries({ queryKey: ["admin"] }).catch(() => undefined);
    queryClient.removeQueries({ queryKey: ["admin"] });
    mediaAssignmentReviewService.reset();
  }, [queryClient]);

  useEffect(() => {
    const signedOut = (event: StorageEvent) => {
      if (event.key === adminLogoutEventKey && event.newValue !== null) clearAdminState();
    };
    window.addEventListener("storage", signedOut);
    return () => { requestVersion.current++; window.removeEventListener("storage", signedOut); };
  }, [clearAdminState]);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    const currentSession = adminAuthApiService.getCachedSession();
    if (!currentSession) setStatus("loading");
    setError(null);
    try {
      const next = await adminAuthApiService.getSession();
      if (version !== requestVersion.current) return;
      setSession(next);
      setStatus("authenticated");
    } catch (err) {
      if (version !== requestVersion.current) return;
      const isAuthorizationFailure = err instanceof AdminAuthRequestError && (err.status === 401 || err.status === 403);
      if (currentSession && !isAuthorizationFailure) {
        setSession(currentSession);
        setStatus("authenticated");
        setError("The admin session could not be refreshed. Existing access remains available while the connection recovers.");
        return;
      }
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
    clearAdminState();
    announceAdminLogout();
    await adminAuthApiService.logout();
  }, [clearAdminState]);

  const value = useMemo(() => {
    const permissions = new Set(session?.permissions ?? session?.user?.permissions ?? []);
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
