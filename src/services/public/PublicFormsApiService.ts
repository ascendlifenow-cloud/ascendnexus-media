import { mediaStorageService } from "../storage";
import type { ContactSubmissionPayload, NewsletterSubscribePayload, PublicFormAvailability, PublicFormSubmissionResult } from "./publicFormTypes";

interface PublicApiResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");

export class PublicFormsApiService {
  async getContactAvailability(): Promise<PublicFormAvailability> {
    return this.get("/api/public/contact/availability");
  }

  async submitContact(payload: ContactSubmissionPayload, signal?: AbortSignal): Promise<PublicFormSubmissionResult> {
    return this.post("/api/public/contact", payload, signal);
  }

  async getNewsletterAvailability(): Promise<PublicFormAvailability> {
    return this.get("/api/public/newsletter/availability");
  }

  async subscribeNewsletter(payload: NewsletterSubscribePayload, signal?: AbortSignal): Promise<PublicFormSubmissionResult> {
    return this.post("/api/public/newsletter/subscribe", payload, signal);
  }

  async confirmNewsletter(token: string, signal?: AbortSignal): Promise<PublicFormSubmissionResult> {
    return this.post("/api/public/newsletter/confirm", { token }, signal);
  }

  async unsubscribeNewsletter(token: string, signal?: AbortSignal): Promise<PublicFormSubmissionResult> {
    return this.post("/api/public/newsletter/unsubscribe", { token }, signal);
  }

  private async get<T>(path: string): Promise<T> {
    const base = apiBase();
    if (!base) throw new Error("Public API base URL is not configured.");
    const response = await fetch(`${base}${path}`);
    const payload = await response.json() as PublicApiResponse<T>;
    if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? "Public form request failed.");
    return payload.data;
  }

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const base = apiBase();
    if (!base) throw new Error("Public API base URL is not configured.");
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const payload = await response.json() as PublicApiResponse<T>;
    if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? "Public form request failed.");
    return payload.data;
  }
}

export const publicFormsApiService = new PublicFormsApiService();
