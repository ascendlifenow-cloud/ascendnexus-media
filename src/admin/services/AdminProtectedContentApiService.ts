import { adminApiBase } from "./AdminAuthApiService";

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Protected content request failed.");
  return payload.data as T;
};

export const adminProtectedContentApiService = {
  async overviewData() {
    return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/protected-content/overview`, { credentials: "include" }));
  },
  async profiles() {
    return parse<Array<Record<string, unknown>>>(await fetch(`${adminApiBase()}/api/admin/protected-content/delivery-profiles`, { credentials: "include" }));
  },
  async assets() {
    return parse<Array<Record<string, unknown>>>(await fetch(`${adminApiBase()}/api/admin/protected-content/assets`, { credentials: "include" }));
  },
  async sessions() {
    return parse<Array<Record<string, unknown>>>(await fetch(`${adminApiBase()}/api/admin/protected-content/playback-sessions`, { credentials: "include" }));
  },
};
