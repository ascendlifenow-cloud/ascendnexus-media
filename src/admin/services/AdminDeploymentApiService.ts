import { mediaStorageService } from "../../services/storage";

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");

const getHeaders = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export class AdminDeploymentApiService {
  async getOverview(): Promise<{ success: boolean; data?: Record<string, unknown>; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend deployment API is not configured."] };
    const response = await fetch(`${base}/api/admin/deployment/overview`, { headers: getHeaders(), credentials: "include" });
    return response.json();
  }

  async verify(): Promise<{ success: boolean; data?: Record<string, unknown>; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend deployment API is not configured."] };
    const response = await fetch(`${base}/api/admin/deployment/verify`, { method: "POST", headers: getHeaders(true), credentials: "include" });
    return response.json();
  }
}

export const adminDeploymentApiService = new AdminDeploymentApiService();
