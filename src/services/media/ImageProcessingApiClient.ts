import type { ImageProcessingJob } from "../../models/media";
import { safeJoinStoragePath } from "../../utils/media/storagePathUtils";

export interface ImageProcessingApiClientConfig {
  apiBaseUrl?: string;
  enabled?: boolean;
}

export class ImageProcessingApiClient {
  constructor(private readonly config: ImageProcessingApiClientConfig = {}) {}

  isConfigured(): boolean {
    return this.config.enabled === true && Boolean(this.config.apiBaseUrl);
  }

  async createProcessingJob(job: ImageProcessingJob): Promise<ImageProcessingJob> {
    if (!this.config.apiBaseUrl) throw new Error("Image processing API base URL is not configured.");
    const response = await fetch(safeJoinStoragePath(this.config.apiBaseUrl, "/api/admin/media/images/process"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (!response.ok) throw new Error(`Image processing API failed with status ${response.status}.`);
    return await response.json() as ImageProcessingJob;
  }

  async getProcessingJob(jobId: string): Promise<ImageProcessingJob | null> {
    if (!this.config.apiBaseUrl) return null;
    const response = await fetch(safeJoinStoragePath(this.config.apiBaseUrl, `/api/admin/media/images/jobs/${jobId}`));
    if (!response.ok) return null;
    return await response.json() as ImageProcessingJob;
  }

  async retryProcessingJob(jobId: string): Promise<ImageProcessingJob | null> {
    if (!this.config.apiBaseUrl) return null;
    const response = await fetch(safeJoinStoragePath(this.config.apiBaseUrl, `/api/admin/media/images/jobs/${jobId}/retry`), {
      method: "POST",
    });
    if (!response.ok) return null;
    return await response.json() as ImageProcessingJob;
  }
}
