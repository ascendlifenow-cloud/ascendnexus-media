import { mediaStorageService } from "../../services/storage";

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");
const getHeaders = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { "Content-Type": "application/json" } : {}) };
};

type ApiResult<T = Record<string, unknown>> = { success: boolean; data?: T; errors?: string[] };

export class AdminDistributionApiService {
  private async request<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend distribution API is not configured."] };
    const response = await fetch(`${base}${path}`, { credentials: "include", ...init });
    return response.json();
  }

  getOverview() { return this.request("/api/admin/distribution/overview", { headers: getHeaders() }); }
  getJobs() { return this.request<unknown[]>("/api/admin/distribution/jobs", { headers: getHeaders() }); }
  getConnectors() { return this.request<unknown[]>("/api/admin/distribution/connectors", { headers: getHeaders() }); }
  getQueues() { return this.request("/api/admin/distribution/queues", { headers: getHeaders() }); }
  getAnalytics() { return this.request<unknown[]>("/api/admin/distribution/analytics", { headers: getHeaders() }); }
  getHistory() { return this.request<unknown[]>("/api/admin/distribution/history", { headers: getHeaders() }); }
  retryFailures() { return this.request("/api/admin/distribution/retry", { method: "POST", headers: getHeaders(true), body: JSON.stringify({}) }); }
}

export const adminDistributionApiService = new AdminDistributionApiService();
