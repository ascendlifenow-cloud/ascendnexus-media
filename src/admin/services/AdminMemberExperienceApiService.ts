import { adminApiBase } from "./AdminAuthApiService";

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Member experience request failed.");
  return payload.data as T;
};

export const adminMemberExperienceApiService = {
  async health() {
    return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/member-experience/health`, { credentials: "include" }));
  },
};
