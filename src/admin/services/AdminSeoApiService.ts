import { mediaStorageService } from "../../services/storage";

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");

const getHeaders = (): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface AdminSeoHealthPayload {
  overallStatus: "healthy" | "warning" | "blocked";
  urlCount: number;
  metadataIssueCount: number;
  structuredDataIssueCount: number;
  socialImageIssueCount: number;
  searchEngineVerificationCount: number;
  deploymentDecision?: string;
  blockingIssues: string[];
  warnings: string[];
  checkedAt: string;
}

export class AdminSeoApiService {
  async getHealth(): Promise<{ success: boolean; data?: AdminSeoHealthPayload; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend SEO API is not configured."] };
    const response = await fetch(`${base}/api/admin/seo`, { headers: getHeaders(), credentials: "include" });
    return response.json();
  }
}

export const adminSeoApiService = new AdminSeoApiService();
