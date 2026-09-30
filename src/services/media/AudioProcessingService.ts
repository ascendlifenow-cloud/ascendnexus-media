import type {
  CreateMediaAssetDto,
  MediaAssetMetadataValue,
  MediaAssetRecord,
} from "../../models/admin";
import type {
  AudioAssetMetadata,
  AudioProcessedOutput,
  AudioProcessingJob,
  AudioProcessingPlan,
  MediaStorageObject,
  WaveformMetadata,
} from "../../models/media";
import { defaultStorageProviderConfig } from "../../config/mediaStorageConfig";
import { adminMediaService } from "../admin";
import { analyzeAudioFile, createFallbackAudioMetadata, type AudioAnalysisResult } from "../../utils/media/audioAnalysisUtils";
import { createAudioProcessingPlan, createMockAudioOutputs, createWaveformMetadata, getStreamableAudioUrl } from "../../utils/media/audioProcessingUtils";
import { AudioProcessingApiClient } from "./AudioProcessingApiClient";
import { mediaProcessingJobStatusService } from "./MediaProcessingJobStatusService";

export interface AudioProcessingOptions {
  file?: File;
  mockOutputsReady?: boolean;
  useBackendProcessing?: boolean;
  publicPlaybackAllowed?: boolean;
  uploadJobId?: string;
}

export interface MediaAssetAudioProcessingResult {
  mediaAsset: MediaAssetRecord;
  job: AudioProcessingJob;
  waveform: WaveformMetadata;
  warnings: string[];
}

const createJobId = (): string => `audio-job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getAssetSourceUrl = (mediaAsset: MediaAssetRecord | CreateMediaAssetDto, storageObject?: MediaStorageObject): string =>
  storageObject?.publicUrl ?? storageObject?.signedUrl ?? mediaAsset.url;

const asMetadataValueRecord = (
  value: Record<string, unknown>,
): Record<string, MediaAssetMetadataValue> => value as Record<string, MediaAssetMetadataValue>;

export class AudioProcessingService {
  private readonly jobs = new Map<string, AudioProcessingJob>();

  constructor(
    private readonly apiClient: AudioProcessingApiClient = new AudioProcessingApiClient({
      apiBaseUrl: defaultStorageProviderConfig.uploadApiBaseUrl,
      enabled: Boolean(defaultStorageProviderConfig.uploadApiBaseUrl),
    }),
  ) {}

  async analyzeAudio(fileOrUrl: File | string | null | undefined, options: AudioProcessingOptions & { assetType?: MediaAssetRecord["assetType"] } = {}): Promise<AudioAnalysisResult> {
    if (fileOrUrl instanceof File) {
      return analyzeAudioFile(fileOrUrl, {
        assetType: options.assetType,
        publicPlaybackAllowed: options.publicPlaybackAllowed,
      });
    }
    if (typeof fileOrUrl === "string") {
      return {
        success: true,
        metadata: createFallbackAudioMetadata(fileOrUrl, options.assetType ?? "custom_audio", options.publicPlaybackAllowed),
        warnings: ["Duration requires client file metadata or future backend analysis."],
      };
    }
    return { success: false, errors: ["Audio file or URL is required."] };
  }

  createAudioProcessingPlan(assetType: MediaAssetRecord["assetType"], metadata?: AudioAssetMetadata | null): AudioProcessingPlan {
    return createAudioProcessingPlan(assetType, metadata);
  }

  async createProcessingJob(
    mediaAsset: MediaAssetRecord | CreateMediaAssetDto | null | undefined,
    storageObject: MediaStorageObject | null | undefined,
    options: AudioProcessingOptions = {},
  ): Promise<AudioProcessingJob> {
    if (!mediaAsset) throw new Error("Media asset is required for audio processing.");
    const assetId = "assetId" in mediaAsset && mediaAsset.assetId ? mediaAsset.assetId : `pending-${Date.now()}`;
    const sourceUrl = getAssetSourceUrl(mediaAsset, storageObject ?? undefined);
    if (!sourceUrl) throw new Error("Audio source URL is required for audio processing.");

    const analysis = await this.analyzeAudio(options.file ?? sourceUrl, {
      ...options,
      assetType: mediaAsset.assetType,
      publicPlaybackAllowed: options.publicPlaybackAllowed,
    });
    const metadata = analysis.metadata ?? createFallbackAudioMetadata(sourceUrl, mediaAsset.assetType, options.publicPlaybackAllowed);
    const plan = this.createAudioProcessingPlan(mediaAsset.assetType, metadata);
    const generatedOutputs = createMockAudioOutputs(
      plan,
      sourceUrl,
      storageObject?.storagePath,
      metadata,
      options.mockOutputsReady ?? false,
    );
    const job: AudioProcessingJob = {
      jobId: createJobId(),
      assetId,
      storageObjectId: storageObject?.storageObjectId,
      sourceUrl,
      sourceStoragePath: storageObject?.storagePath,
      status: analysis.success ? "pending" : "skipped",
      requestedOutputs: plan.outputs,
      generatedOutputs,
      metadata,
      errors: analysis.errors,
      warnings: [
        ...(analysis.warnings ?? []),
        ...(analysis.success ? ["Audio waveform/transcode outputs are planned for future backend processing."] : ["Audio analysis did not complete; upload remains valid."]),
      ],
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.jobId, job);
    mediaProcessingJobStatusService.createProcessingStatus(job, "audio_processing", options.uploadJobId);
    return job;
  }

  async processAudioOutputs(job: AudioProcessingJob): Promise<AudioProcessingJob> {
    const started: AudioProcessingJob = { ...job, status: "processing", updatedAt: new Date().toISOString() };
    this.jobs.set(started.jobId, started);
    mediaProcessingJobStatusService.updateProcessingStatus(started.jobId, { status: "processing", progress: 35, message: "Audio processing started." });
    if (this.apiClient.isConfigured()) {
      try {
        const processed = await this.apiClient.createProcessingJob(started);
        this.jobs.set(processed.jobId, processed);
        mediaProcessingJobStatusService.markProcessingCompleted(processed.jobId, processed.generatedOutputs);
        return processed;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Audio processing API failed.";
        const failed: AudioProcessingJob = {
          ...started,
          status: "failed",
          errors: [...(started.errors ?? []), message],
          warnings: [...(started.warnings ?? []), "Backend audio processing is unavailable; planned outputs remain as fallback metadata."],
          updatedAt: new Date().toISOString(),
        };
        this.jobs.set(failed.jobId, failed);
        mediaProcessingJobStatusService.markProcessingFailed(failed.jobId, failed.errors ?? [message]);
        return failed;
      }
    }

    const completed: AudioProcessingJob = {
      ...started,
      status: started.errors?.length ? "skipped" : "completed",
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(completed.jobId, completed);
    if (completed.status === "completed") {
      mediaProcessingJobStatusService.markProcessingCompleted(completed.jobId, completed.generatedOutputs);
    } else {
      mediaProcessingJobStatusService.markProcessingSkipped(completed.jobId, "Audio processing skipped; waveform metadata remains planned.");
    }
    return completed;
  }

  async updateMediaAssetWithAudioMetadata(
    assetId: string,
    audioMetadata: AudioAssetMetadata,
    outputs: AudioProcessedOutput[],
    waveform: WaveformMetadata,
    job?: AudioProcessingJob,
  ): Promise<MediaAssetRecord | null> {
    const current = await adminMediaService.getMediaAsset(assetId);
    if (!current.ok) return null;
    const streamableUrl = audioMetadata.publicPlaybackAllowed ? getStreamableAudioUrl(outputs, current.data.url) : current.data.url;
    const metadata = asMetadataValueRecord({
      ...(current.data.metadata ?? {}),
      audio: audioMetadata,
      audioOutputs: outputs,
      waveform,
      processing: job ? {
        jobId: job.jobId,
        status: job.status,
        type: "audio",
        requestedOutputCount: job.requestedOutputs.length,
        generatedOutputCount: job.generatedOutputs.length,
        updatedAt: job.updatedAt ?? job.createdAt,
      } : undefined,
    });
    const updated = await adminMediaService.updateMediaAsset(assetId, {
      url: streamableUrl,
      metadata,
    });
    return updated.ok ? updated.data : null;
  }

  async processMediaAssetAudio(
    mediaAsset: MediaAssetRecord,
    storageObject: MediaStorageObject,
    options: AudioProcessingOptions = {},
  ): Promise<MediaAssetAudioProcessingResult> {
    const job = await this.createProcessingJob(mediaAsset, storageObject, options);
    const processedJob = await this.processAudioOutputs(job);
    const waveform = createWaveformMetadata(processedJob.generatedOutputs);
    const updatedAsset = await this.updateMediaAssetWithAudioMetadata(
      mediaAsset.assetId,
      processedJob.metadata,
      processedJob.generatedOutputs,
      waveform,
      processedJob,
    );
    return {
      mediaAsset: updatedAsset ?? mediaAsset,
      job: processedJob,
      waveform,
      warnings: processedJob.warnings ?? [],
    };
  }

  getAudioProcessingJob(jobId: string): AudioProcessingJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  async retryAudioProcessing(jobId: string): Promise<AudioProcessingJob | null> {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    if (this.apiClient.isConfigured()) {
      const retried = await this.apiClient.retryProcessingJob(jobId);
      if (retried) {
        this.jobs.set(retried.jobId, retried);
        return retried;
      }
    }
    const next: AudioProcessingJob = {
      ...existing,
      status: "pending",
      errors: undefined,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, next);
    return this.processAudioOutputs(next);
  }

  skipAudioProcessing(jobId: string): AudioProcessingJob | null {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    const skipped: AudioProcessingJob = {
      ...existing,
      status: "skipped",
      updatedAt: new Date().toISOString(),
      warnings: [...(existing.warnings ?? []), "Audio processing was skipped."],
    };
    this.jobs.set(jobId, skipped);
    return skipped;
  }
}

export const audioProcessingService = new AudioProcessingService();
