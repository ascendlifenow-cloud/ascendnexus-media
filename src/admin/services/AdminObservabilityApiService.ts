import { mediaStorageService } from "../../services/storage";

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");
const getHeaders = (): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export class AdminObservabilityApiService {
  async getOverview(): Promise<{ success: boolean; data?: Record<string, unknown>; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend observability API is not configured."] };
    const response = await fetch(`${base}/api/admin/observability/overview`, { headers: getHeaders(), credentials: "include" });
    return response.json();
  }

  async getCertification(): Promise<{ success: boolean; data?: Record<string, unknown>; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend certification API is not configured."] };
    const response = await fetch(`${base}/api/admin/certification/launch`, { headers: getHeaders(), credentials: "include" });
    return response.json();
  }
}

export const adminObservabilityApiService = new AdminObservabilityApiService();
