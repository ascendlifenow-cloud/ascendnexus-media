import { mediaStorageService } from "../storage";
import type { ConsentCategory, PublicConsentAvailability, PublicConsentPolicy, PublicConsentRecord } from "./publicConsentTypes";

interface PublicApiResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");

export class PublicConsentApiService {
  async getPolicy(): Promise<PublicConsentPolicy> {
    return this.get("/api/public/consent/policy");
  }

  async getAvailability(): Promise<PublicConsentAvailability> {
    return this.get("/api/public/consent/availability");
  }

  async saveConsent(choices: Record<ConsentCategory, boolean>, source: "banner" | "preference_center"): Promise<PublicConsentRecord> {
    return this.post("/api/public/consent", { choices, source });
  }

  async withdrawConsent(consentReference?: string): Promise<PublicConsentRecord> {
    return this.post("/api/public/consent/withdraw", { consentReference });
  }

  async postAnalyticsEvents(events: Array<Record<string, unknown>>): Promise<{ acceptedCount: number; rejectedCount: number; checkedAt: string }> {
    return this.post("/api/public/analytics/events", { events });
  }

  private async get<T>(path: string): Promise<T> {
    const base = apiBase();
    if (!base) throw new Error("Public API base URL is not configured.");
    const response = await fetch(`${base}${path}`);
    const payload = await response.json() as PublicApiResponse<T>;
    if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? "Public consent request failed.");
    return payload.data;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const base = apiBase();
    if (!base) throw new Error("Public API base URL is not configured.");
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json() as PublicApiResponse<T>;
    if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? "Public consent request failed.");
    return payload.data;
  }
}

export const publicConsentApiService = new PublicConsentApiService();
