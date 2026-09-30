import type { MemberDashboardResponse, MemberPreferences, MemberAccountResponse, MemberSessionResponse } from "./memberPortalTypes";

const apiBase = () => String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

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
  if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? `Member portal request failed with ${response.status}`);
  return payload.data;
};

export const memberDashboardApiService = {
  dashboard: () => request<MemberDashboardResponse>("/api/member/dashboard"),
  profile: () => request<{ member: MemberAccountResponse }>("/api/member/profile"),
  updateProfile: (input: { displayName?: string; avatar?: string; bio?: string }) => request<{ member: MemberAccountResponse }>("/api/member/profile", { method: "PATCH", body: JSON.stringify(input) }),
  preferences: () => request<{ preferences: MemberPreferences }>("/api/member/preferences"),
  updatePreferences: (input: Partial<MemberPreferences>) => request<{ member: MemberAccountResponse; preferences: MemberPreferences }>("/api/member/preferences", { method: "PATCH", body: JSON.stringify(input) }),
  membership: () => request<Pick<MemberDashboardResponse, "membership" | "capabilities" | "membershipCta">>("/api/member/membership"),
  earlyAccess: () => request<{ items: MemberDashboardResponse["earlyAccess"] }>("/api/member/early-access"),
  exclusiveContent: () => request<{ items: MemberDashboardResponse["exclusiveContent"] }>("/api/member/exclusive-content"),
  recommendations: () => request<{ items: MemberDashboardResponse["recommendations"] }>("/api/member/recommendations"),
  announcements: () => request<{ items: MemberDashboardResponse["announcements"] }>("/api/member/announcements"),
  sessions: () => request<MemberSessionResponse[]>("/api/member/sessions"),
  revokeSession: (sessionId: string) => request<void>(`/api/member/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  revokeOtherSessions: () => request<{ revoked: number }>("/api/member/sessions/revoke-others", { method: "POST", body: "{}" }),
};
