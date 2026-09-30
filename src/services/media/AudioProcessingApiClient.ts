import type { AudioProcessingJob, WaveformMetadata } from "../../models/media";
import { safeJoinStoragePath } from "../../utils/media/storagePathUtils";

export interface AudioProcessingApiClientConfig {
  apiBaseUrl?: string;
  enabled?: boolean;
}

export class AudioProcessingApiClient {
  constructor(private readonly config: AudioProcessingApiClientConfig = {}) {}

  isConfigured(): boolean {
    return this.config.enabled === true && Boolean(this.config.apiBaseUrl);
  }

  async createProcessingJob(job: AudioProcessingJob): Promise<AudioProcessingJob> {
    if (!this.config.apiBaseUrl) throw new Error("Audio processing API base URL is not configured.");
    const response = await fetch(safeJoinStoragePath(this.config.apiBaseUrl, "/api/admin/media/audio/process"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (!response.ok) throw new Error(`Audio processing API failed with status ${response.status}.`);
    return await response.json() as AudioProcessingJob;
  }

  async getProcessingJob(jobId: string): Promise<AudioProcessingJob | null> {
    if (!this.config.apiBaseUrl) return null;
    const response = await fetch(safeJoinStoragePath(this.config.apiBaseUrl, `/api/admin/media/audio/jobs/${jobId}`));
    if (!response.ok) return null;
    return await response.json() as AudioProcessingJob;
  }

  async retryProcessingJob(jobId: string): Promise<AudioProcessingJob | null> {
    if (!this.config.apiBaseUrl) return null;
    const response = await fetch(safeJoinStoragePath(this.config.apiBaseUrl, `/api/admin/media/audio/jobs/${jobId}/retry`), {
      method: "POST",
    });
    if (!response.ok) return null;
    return await response.json() as AudioProcessingJob;
  }

  async getWaveform(jobId: string): Promise<WaveformMetadata | null> {
    if (!this.config.apiBaseUrl) return null;
    const response = await fetch(safeJoinStoragePath(this.config.apiBaseUrl, `/api/admin/media/audio/jobs/${jobId}/waveform`));
    if (!response.ok) return null;
    return await response.json() as WaveformMetadata;
  }
}
