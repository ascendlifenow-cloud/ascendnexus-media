import { mediaStorageService } from "../../services/storage";

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");
const getHeaders = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { "Content-Type": "application/json" } : {}) };
};

type ApiResult<T = Record<string, unknown>> = { success: boolean; data?: T; errors?: string[] };

export class AdminOperationsApiService {
  private async request<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend operations API is not configured."] };
    const response = await fetch(`${base}${path}`, { credentials: "include", ...init });
    return response.json();
  }

  getOverview() { return this.request("/api/admin/operations/overview", { headers: getHeaders() }); }
  getCalendar() { return this.request<unknown[]>("/api/admin/operations/calendar", { headers: getHeaders() }); }
  getWorkflows() { return this.request<unknown[]>("/api/admin/operations/workflows", { headers: getHeaders() }); }
  getVerification() { return this.request<unknown[]>("/api/admin/operations/verification", { headers: getHeaders() }); }
  getCampaigns() { return this.request<unknown[]>("/api/admin/operations/campaigns", { headers: getHeaders() }); }
  getContentHealth() { return this.request("/api/admin/operations/content-health", { headers: getHeaders() }); }
  getRecommendations() { return this.request<unknown[]>("/api/admin/operations/recommendations", { headers: getHeaders() }); }
  getGrowth() { return this.request("/api/admin/operations/growth", { headers: getHeaders() }); }
  getReports() { return this.request<unknown[]>("/api/admin/operations/reports", { headers: getHeaders() }); }
  runVerification(payload: Record<string, unknown> = {}) {
    return this.request("/api/admin/operations/verification", { method: "POST", headers: getHeaders(true), body: JSON.stringify(payload) });
  }
  generateReport(reportType = "daily") {
    return this.request("/api/admin/operations/reports", { method: "POST", headers: getHeaders(true), body: JSON.stringify({ reportType }) });
  }
}

export const adminOperationsApiService = new AdminOperationsApiService();
