export interface AdminUserSession {
  userId: string;
  email: string;
  displayName: string;
  status: string;
  roles: string[];
  permissions?: string[];
  emailVerified: boolean;
  lastLoginAt?: string;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuthSession {
  authenticated?: boolean;
  requiresMfa?: boolean;
  user: AdminUserSession;
  roles?: string[];
  permissions: string[];
  sessionId?: string;
  sessionExpiresAt?: string;
  redirectTo?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

const envValue = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export const adminApiBase = () => (envValue("VITE_MEDIA_UPLOAD_API_BASE_URL") ?? "").replace(/\/+$/, "");

const adminUrl = (path: string) => `${adminApiBase()}${path}`;

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.join(" ") || `Admin request failed with ${response.status}.`);
  return payload.data as T;
};

export class AdminAuthApiService {
  async getAvailability(): Promise<{ available: boolean; temporarilyUnavailable: boolean; setupIncomplete: boolean; mfaRequiredByPolicy: boolean }> {
    const response = await fetch(adminUrl("/api/auth/admin/availability"), { credentials: "include" });
    return parse(response);
  }

  async login(email: string, password: string): Promise<AdminAuthSession> {
    const response = await fetch(adminUrl("/api/auth/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    return parse<AdminAuthSession>(response);
  }

  async getSession(): Promise<AdminAuthSession> {
    const response = await fetch(adminUrl("/api/auth/session"), { credentials: "include" });
    return parse<AdminAuthSession>(response);
  }

  async logout(): Promise<void> {
    await fetch(adminUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
  }

  async requestPasswordReset(email: string): Promise<{ accepted: true; resetToken?: string }> {
    const response = await fetch(adminUrl("/api/auth/admin/password-reset/request"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    return parse(response);
  }

  async completePasswordReset(token: string, password: string): Promise<void> {
    const response = await fetch(adminUrl("/api/auth/admin/password-reset/complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, newPassword: password }),
    });
    await parse(response);
  }

  async activateAdmin(setupToken: string, newPassword: string, displayName?: string): Promise<{ activated: boolean; user: AdminUserSession; redirectTo: string }> {
    const response = await fetch(adminUrl("/api/auth/admin/activate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ setupToken, newPassword, displayName }),
    });
    return parse(response);
  }
}

export const adminAuthApiService = new AdminAuthApiService();
