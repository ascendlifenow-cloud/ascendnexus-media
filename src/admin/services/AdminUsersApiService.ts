import { adminApiBase, type AdminUserSession } from "./AdminAuthApiService";

export interface AdminRoleSummary {
  roleId: string;
  displayName: string;
  description: string;
  permissions: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.join(" ") || `Admin request failed with ${response.status}.`);
  return payload.data as T;
};

const url = (path: string) => `${adminApiBase()}${path}`;

export class AdminUsersApiService {
  async listUsers(): Promise<AdminUserSession[]> {
    return parse(await fetch(url("/api/admin/users"), { credentials: "include" }));
  }

  async listRoles(): Promise<AdminRoleSummary[]> {
    return parse(await fetch(url("/api/admin/roles"), { credentials: "include" }));
  }

  async createUser(input: { email: string; displayName: string; password: string; roles: string[] }): Promise<AdminUserSession> {
    return parse(await fetch(url("/api/admin/users"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    }));
  }

  async disableUser(userId: string): Promise<AdminUserSession> {
    return parse(await fetch(url(`/api/admin/users/${userId}/disable`), { method: "POST", credentials: "include" }));
  }

  async restoreUser(userId: string): Promise<AdminUserSession> {
    return parse(await fetch(url(`/api/admin/users/${userId}/restore`), { method: "POST", credentials: "include" }));
  }
}

export const adminUsersApiService = new AdminUsersApiService();
