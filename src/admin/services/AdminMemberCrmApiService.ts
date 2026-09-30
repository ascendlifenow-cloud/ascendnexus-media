import { adminApiBase } from "./AdminAuthApiService";

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Member CRM request failed.");
  return payload.data as T;
};

export const adminMemberCrmApiService = {
  async dashboard() { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/member-crm`, { credentials: "include" })); },
  async search(query = "") { return parse<Array<Record<string, unknown>>>(await fetch(`${adminApiBase()}/api/admin/member-search?q=${encodeURIComponent(query)}`, { credentials: "include" })); },
  async detail(memberId: string) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}`, { credentials: "include" })); },
  async grantMembership(memberId: string, tierKey: string) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/membership/grant`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tierKey }) })); },
  async revokeSessions(memberId: string) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/sessions`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })); },
  async supportNote(memberId: string, input: { subject: string; body: string; status?: string }) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/support-notes`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })); },
  async moderate(memberId: string, input: { action: string; reason: string }) { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}/moderation`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })); },
  async report() { return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/member-reports`, { credentials: "include" })); },
};
