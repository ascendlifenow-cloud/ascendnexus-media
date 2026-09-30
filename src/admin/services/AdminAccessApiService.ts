import { adminApiBase } from "./AdminAuthApiService";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.join(" ") || `Access request failed with ${response.status}.`);
  return payload.data;
};

export const adminAccessApiService = {
  async catalogData() {
    return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/membership-tiers`, { credentials: "include" }));
  },
  async health() {
    return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/access-health`, { credentials: "include" }));
  },
  async simulate(input: Record<string, unknown>) {
    return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/access-simulator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    }));
  },
};
