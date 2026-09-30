import type { MemberAccountResponse, MemberSessionResponse } from "../../../server/models/members/MemberModels";

const apiBase = () => {
  const value = import.meta.env.VITE_API_URL || "";
  return String(value).replace(/\/+$/, "");
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Scope": "member",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({ success: false, errors: [`Request failed with ${response.status}`] })) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? `Request failed with ${response.status}`);
  return payload.data;
};

export interface MemberAuthSession {
  authenticated: true;
  member: MemberAccountResponse;
  sessionId: string;
  sessionExpiresAt: string;
  redirectTo?: string;
  authorization?: {
    membership?: {
      tierKey: string;
      name: string;
      status: string;
      startsAt?: string;
      endsAt?: string;
    };
    entitlements?: string[];
    capabilities?: string[];
    authorizationVersion?: string;
  };
}

export class MemberAuthApiService {
  register(input: { email: string; password: string; displayName: string; acceptTerms: boolean; acceptPrivacy: boolean; newsletterOptIn?: boolean }) {
    return request<{ member: MemberAccountResponse; verificationRequired: boolean; verificationToken?: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
  }

  login(input: { email: string; password: string; rememberMe?: boolean }) {
    return request<MemberAuthSession>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  }

  logout() {
    return request<void>("/api/auth/logout", { method: "POST", body: "{}" });
  }

  session() {
    return request<MemberAuthSession>("/api/auth/session");
  }

  verifyEmail(token: string) {
    return request<{ verified: boolean; member: MemberAccountResponse }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
  }

  resendVerification(email: string) {
    return request<{ accepted: true; verificationToken?: string }>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
  }

  requestPasswordReset(email: string) {
    return request<{ accepted: true; resetToken?: string }>("/api/auth/password/request", { method: "POST", body: JSON.stringify({ email }) });
  }

  resetPassword(token: string, password: string) {
    return request<{ success: true }>("/api/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return request<{ member: MemberAccountResponse }>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
  }

  account() {
    return request<{ member: MemberAccountResponse; sessionId: string; sessionExpiresAt: string }>("/api/account");
  }

  updateProfile(input: { displayName?: string; avatar?: string; bio?: string }) {
    return request<{ member: MemberAccountResponse }>("/api/account/profile", { method: "PATCH", body: JSON.stringify(input) });
  }

  updatePreferences(input: Partial<MemberAccountResponse["preferences"]>) {
    return request<{ member: MemberAccountResponse }>("/api/account/preferences", { method: "PATCH", body: JSON.stringify(input) });
  }

  sessions() {
    return request<MemberSessionResponse[]>("/api/account/sessions");
  }

  revokeSession(sessionId: string) {
    return request<void>(`/api/account/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  }

  deleteAccount() {
    return request<{ deleted: true }>("/api/account", { method: "DELETE" });
  }
}

export const memberAuthApiService = new MemberAuthApiService();
