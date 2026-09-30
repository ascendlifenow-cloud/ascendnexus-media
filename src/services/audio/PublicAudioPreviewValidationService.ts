import type { PublicAudioPreviewContract } from "../../state/audio/audioPlayerTypes";

export interface PublicAudioPreviewValidationReport {
  valid: boolean;
  playable: boolean;
  blockingIssues: string[];
  warnings: string[];
  preferredSource?: string;
  waveformReady: boolean;
  checkedAt: string;
}

const supportedMimeTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/x-m4a", "audio/ogg", "audio/wav", "audio/wave"]);
const forbiddenPatterns = [/full.?song/i, /private\//i, /signed/i, /token=/i, /signature=/i, /X-Amz-/i, /blob:/i, /file:/i, /storagePath/i];

export class PublicAudioPreviewValidationService {
  validatePreview(preview?: PublicAudioPreviewContract | null): PublicAudioPreviewValidationReport {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    if (!preview?.url) blockingIssues.push("Audio preview URL is missing.");
    if (preview?.url && !this.validateUrl(preview.url)) blockingIssues.push("Audio preview URL is not public-safe.");
    if (preview?.mimeType && !this.validateMimeType(preview.mimeType)) warnings.push("Audio preview MIME type is not a preferred browser format.");
    if (preview?.durationSeconds !== undefined && !this.validateDuration(preview.durationSeconds)) warnings.push("Audio preview duration metadata is invalid.");
    if (preview && !this.validateNoFullSongReference(preview)) blockingIssues.push("Audio preview contains a forbidden full-song or private reference.");
    const waveformReady = this.validateWaveform(preview);
    return {
      valid: blockingIssues.length === 0,
      playable: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      preferredSource: blockingIssues.length === 0 ? preview?.url : undefined,
      waveformReady,
      checkedAt: new Date().toISOString(),
    };
  }

  validateUrl(url: string): boolean {
    const value = url.trim();
    if (!value || forbiddenPatterns.some((pattern) => pattern.test(value))) return false;
    if (value.startsWith("/")) return !value.startsWith("/admin") && !value.startsWith("/api") && !value.includes("..");
    try {
      const parsed = new URL(value);
      if (!["https:", "http:"].includes(parsed.protocol)) return false;
      if (import.meta.env.PROD && parsed.protocol !== "https:") return false;
      return !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(parsed.hostname);
    } catch {
      return false;
    }
  }

  validateMimeType(mimeType?: string): boolean {
    return !mimeType || supportedMimeTypes.has(mimeType.toLowerCase().split(";")[0].trim());
  }

  validateDuration(duration?: number): boolean {
    return duration === undefined || (Number.isFinite(duration) && duration > 0 && duration < 60 * 60 * 6);
  }

  validateWaveform(preview?: PublicAudioPreviewContract | null): boolean {
    if (!preview) return false;
    if (preview.waveformUrl && !this.validateUrl(preview.waveformUrl)) return false;
    if (!preview.waveformData) return Boolean(preview.waveformUrl);
    return preview.waveformData.length <= 5000 && preview.waveformData.every((peak) => Number.isFinite(peak) && peak >= 0 && peak <= 1);
  }

  validateNoFullSongReference(preview: PublicAudioPreviewContract): boolean {
    return !forbiddenPatterns.some((pattern) => pattern.test(JSON.stringify(preview)));
  }
}

export const publicAudioPreviewValidationService = new PublicAudioPreviewValidationService();

