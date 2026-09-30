import { mediaStorageService } from "../../services/storage";

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");
const getHeaders = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { "Content-Type": "application/json" } : {}) };
};

type ApiResult<T = Record<string, unknown>> = { success: boolean; data?: T; errors?: string[] };

export class AdminIntelligenceApiService {
  private async request<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend intelligence API is not configured."] };
    const response = await fetch(`${base}${path}`, { credentials: "include", ...init });
    return response.json();
  }
  getOverview() { return this.request("/api/admin/intelligence/overview", { headers: getHeaders() }); }
  getAudience() { return this.request("/api/admin/intelligence/audience", { headers: getHeaders() }); }
  getPlatforms() { return this.request("/api/admin/intelligence/platform-comparison", { headers: getHeaders() }); }
  getForecasts() { return this.request<unknown[]>("/api/admin/intelligence/growth-forecast", { headers: getHeaders() }); }
  getReports() { return this.request<unknown[]>("/api/admin/intelligence/reports", { headers: getHeaders() }); }
  getContent() { return this.request("/api/admin/intelligence/content", { headers: getHeaders() }); }
  generateRecommendations() { return this.request("/api/admin/intelligence/recommendations", { method: "POST", headers: getHeaders(true), body: JSON.stringify({}) }); }
  generateForecasts() { return this.request("/api/admin/intelligence/growth-forecast", { method: "POST", headers: getHeaders(true), body: JSON.stringify({}) }); }
  generateReport(reportType = "monthly_growth") { return this.request("/api/admin/intelligence/reports", { method: "POST", headers: getHeaders(true), body: JSON.stringify({ reportType }) }); }
}

export const adminIntelligenceApiService = new AdminIntelligenceApiService();
