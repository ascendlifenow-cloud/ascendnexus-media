import { adminApiBase } from "./AdminAuthApiService";

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Member CRM request failed.");
  return payload.data as T;
};

export const adminMemberCrmApiService = {
  async dashboard(signal?: AbortSignal) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/member-crm`, { credentials: "include", signal })); },
  async search(query = "", signal?: AbortSignal) { return parse<Array<Record<string, unknown>>>(await fetch(`${adminApiBase()}/api/admin/member-search?q=${encodeURIComponent(query)}`, { credentials: "include", signal })); },
  async detail(memberId: string, signal?: AbortSignal) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}`, { credentials: "include", signal })); },
  async grantMembership(memberId: string, tierKey: string) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/membership/grant`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tierKey }) })); },
  async revokeSessions(memberId: string) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/sessions`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })); },
  async resendVerification(memberId: string) { return parse<{ accepted: boolean; status: string; provider: string; sentAt?: string; errorCode?: string; errorMessage?: string }>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/resend-verification`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })); },
  async supportNote(memberId: string, input: { subject: string; body: string; status?: string }) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/support-notes`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })); },
  async moderate(memberId: string, input: { action: string; reason: string }) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/moderation`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })); },
  async report() { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/member-reports`, { credentials: "include" })); },
};
