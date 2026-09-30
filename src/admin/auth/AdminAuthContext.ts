import { createContext } from "react";
import type { AdminAuthSession } from "../services/AdminAuthApiService";

export interface AdminAuthContextValue {
  session: AdminAuthSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: readonly string[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
