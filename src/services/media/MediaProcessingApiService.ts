import type { MediaAssetProcessingSummary, MediaProcessingHealth, MediaProcessingJob } from "../../models/media";
import { mediaStorageService } from "../storage";

const getHeaders = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");

export class MediaProcessingApiService {
  async listJobs(): Promise<{ success: boolean; processingJobs: MediaProcessingJob[]; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: true, processingJobs: [], errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/processing/jobs`, { headers: getHeaders() });
    return response.json();
  }

  async getHealth(): Promise<{ success: boolean; health?: MediaProcessingHealth; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: true, health: undefined, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/processing/health`, { headers: getHeaders() });
    return response.json();
  }

  async getAssetSummary(assetId: string): Promise<{ success: boolean; summary?: MediaAssetProcessingSummary; processingJobs?: MediaProcessingJob[]; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/assets/${assetId}/processing`, { headers: getHeaders() });
    return response.json();
  }

  async getProcessingJob(processingJobId: string): Promise<{ success: boolean; processingJob?: MediaProcessingJob; errors?: string[] }> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/processing/jobs/${processingJobId}`, { headers: getHeaders() });
    return response.json();
  }

  async retryJob(processingJobId: string) {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/processing/jobs/${processingJobId}/retry`, {
      method: "POST",
      headers: getHeaders(true),
    });
    return response.json();
  }

  async cancelJob(processingJobId: string) {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/processing/jobs/${processingJobId}/cancel`, {
      method: "POST",
      headers: getHeaders(true),
    });
    return response.json();
  }

  async pauseQueue(queueName: string) {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/processing/queues/${encodeURIComponent(queueName)}/pause`, {
      method: "POST",
      headers: getHeaders(true),
    });
    return response.json();
  }

  async resumeQueue(queueName: string) {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/media/processing/queues/${encodeURIComponent(queueName)}/resume`, {
      method: "POST",
      headers: getHeaders(true),
    });
    return response.json();
  }
}

export const mediaProcessingApiService = new MediaProcessingApiService();
