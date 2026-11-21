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
const authRequest = (path: string, init?: RequestInit) => fetch(adminUrl(path), {
  ...init,
  credentials: "include",
  signal: AbortSignal.timeout(12_000),
});

export class AdminAuthRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AdminAuthRequestError";
  }
}

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok || payload.success === false) {
    throw new AdminAuthRequestError(payload.errors?.join(" ") || `Admin request failed with ${response.status}.`, response.status);
  }
  return payload.data as T;
};

const validateAdminSession = (session: AdminAuthSession): AdminAuthSession => {
  if (!session?.user || !Array.isArray(session.user.roles) || !Array.isArray(session.permissions)) {
    throw new AdminAuthRequestError("The server returned an invalid admin session.", 401);
  }
  return session;
};

export class AdminAuthApiService {
  private cachedSession: AdminAuthSession | null = null;
  private sessionRequest: Promise<AdminAuthSession> | null = null;
  private sessionVersion = 0;

  getCachedSession(): AdminAuthSession | null {
    return this.cachedSession;
  }

  async getAvailability(): Promise<{ available: boolean; temporarilyUnavailable: boolean; setupIncomplete: boolean; mfaRequiredByPolicy: boolean }> {
    const response = await fetch(adminUrl("/api/auth/admin/availability"), { credentials: "include" });
    return parse(response);
  }

  async login(email: string, password: string): Promise<AdminAuthSession> {
    const version = ++this.sessionVersion;
    this.cachedSession = null;
    this.sessionRequest = null;
    const response = await authRequest("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const session = validateAdminSession(await parse<AdminAuthSession>(response));
    if (version !== this.sessionVersion) throw new AdminAuthRequestError("Admin session changed. Please sign in again.", 401);
    this.cachedSession = session;
    return session;
  }

  async getSession(): Promise<AdminAuthSession> {
    if (this.sessionRequest) return this.sessionRequest;
    const version = this.sessionVersion;
    this.sessionRequest = (async () => {
      try {
        const session = validateAdminSession(await parse<AdminAuthSession>(await authRequest("/api/admin/auth/session")));
        if (version !== this.sessionVersion) throw new AdminAuthRequestError("Admin session changed. Please sign in again.", 401);
        this.cachedSession = session;
        return session;
      } catch (error) {
        if (version === this.sessionVersion && error instanceof AdminAuthRequestError && (error.status === 401 || error.status === 403)) {
          this.cachedSession = null;
        }
        throw error;
      } finally {
        if (version === this.sessionVersion) this.sessionRequest = null;
      }
    })();
    return this.sessionRequest;
  }

  async logout(): Promise<void> {
    this.sessionVersion++;
    this.cachedSession = null;
    this.sessionRequest = null;
    await authRequest("/api/admin/auth/logout", { method: "POST" });
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
