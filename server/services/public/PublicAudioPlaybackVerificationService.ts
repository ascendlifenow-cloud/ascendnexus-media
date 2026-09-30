import { publicReleaseService } from "./PublicReleaseService";
import type { PublicSongRelease } from "../../../src/models/release";

export interface PublicAudioPlaybackVerificationReport {
  releaseId: string;
  previewAvailable: boolean;
  urlPublicSafe: boolean;
  headSucceeded: boolean;
  rangeSupported: boolean;
  mimeValid: boolean;
  durationValid: boolean;
  waveformValid: boolean;
  fullSongAbsent: boolean;
  cdnReachable: boolean;
  status: "ok" | "warning" | "failed";
  warnings: string[];
  errors: string[];
  checkedAt: string;
}

const supportedMimeTypes = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/x-m4a", "audio/ogg", "audio/wav", "audio/wave"]);
const forbiddenPatterns = [/full.?song/i, /private\//i, /signed/i, /token=/i, /signature=/i, /X-Amz-/i, /blob:/i, /file:/i, /storagePath/i];

const getPreviewUrl = (release: PublicSongRelease): string | undefined => {
  const maybeDto = (release as unknown as { audioPreview?: { url?: string } | string }).audioPreview;
  if (typeof maybeDto === "string") return maybeDto;
  return maybeDto?.url ?? release.audioPreviewUrl;
};

const getMimeType = (release: PublicSongRelease): string | undefined => {
  const maybeDto = (release as unknown as { audioPreview?: { mimeType?: string } }).audioPreview;
  return maybeDto?.mimeType;
};

const getDuration = (release: PublicSongRelease): number | undefined => {
  const maybeDto = (release as unknown as { audioPreview?: { durationSeconds?: number } }).audioPreview;
  const metadataDuration = (release as unknown as { durationSeconds?: number }).durationSeconds;
  return maybeDto?.durationSeconds ?? metadataDuration;
};

const isPublicSafeUrl = (url?: string): boolean => {
  if (!url || forbiddenPatterns.some((pattern) => pattern.test(url))) return false;
  if (url.startsWith("/")) return !url.startsWith("/admin") && !url.startsWith("/api") && !url.includes("..");
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(parsed.hostname);
  } catch {
    return false;
  }
};

export class PublicAudioPlaybackVerificationService {
  async verifyPreviewContract(releaseId: string) {
    return this.buildVerificationReport(releaseId);
  }

  async verifyPreviewUrl(releaseId: string) {
    return this.buildVerificationReport(releaseId);
  }

  async verifyHeadRequest(releaseId: string) {
    return this.buildVerificationReport(releaseId);
  }

  async verifyRangeRequest(releaseId: string) {
    return this.buildVerificationReport(releaseId);
  }

  async verifyMimeType(releaseId: string) {
    return this.buildVerificationReport(releaseId);
  }

  async verifyWaveform(releaseId: string) {
    return this.buildVerificationReport(releaseId);
  }

  async verifyNoFullSongExposure(releaseId: string) {
    return this.buildVerificationReport(releaseId);
  }

  async buildVerificationReport(releaseId: string): Promise<PublicAudioPlaybackVerificationReport> {
    const release = (await publicReleaseService.listPublishedReleases()).find((item) => item.releaseId === releaseId || item.slug === releaseId);
    if (!release) return this.failed(releaseId, ["Published release was not found."]);
    return this.verifyRelease(release);
  }

  async verifySampleOfPublishedReleases(limit = 10): Promise<PublicAudioPlaybackVerificationReport[]> {
    const releases = (await publicReleaseService.listPublishedReleases()).slice(0, limit);
    return Promise.all(releases.map((release) => this.verifyRelease(release)));
  }

  private async verifyRelease(release: PublicSongRelease): Promise<PublicAudioPlaybackVerificationReport> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const url = getPreviewUrl(release);
    const previewAvailable = Boolean(url);
    const urlPublicSafe = isPublicSafeUrl(url);
    if (!previewAvailable) warnings.push("Release has no public audio preview.");
    if (previewAvailable && !urlPublicSafe) errors.push("Preview URL is not public-safe.");

    const mimeType = getMimeType(release);
    const mimeValid = !mimeType || supportedMimeTypes.has(mimeType.toLowerCase().split(";")[0].trim());
    if (!mimeValid) errors.push("Preview MIME type is not supported.");

    const duration = getDuration(release);
    const durationValid = duration === undefined || (Number.isFinite(duration) && duration > 0);
    if (!durationValid) warnings.push("Preview duration metadata is missing or invalid.");

    const text = JSON.stringify(release);
    const fullSongAbsent = !/fullSong|full-song|full_song|private\/|signedUrl|storagePath/.test(text);
    if (!fullSongAbsent) errors.push("Public release payload contains forbidden full-song/private fields.");

    const waveform = (release as unknown as { audioPreview?: { waveformData?: number[]; waveformUrl?: string } }).audioPreview;
    const waveformValid = !waveform?.waveformData || (waveform.waveformData.length <= 5000 && waveform.waveformData.every((peak) => Number.isFinite(peak) && peak >= 0 && peak <= 1));
    if (!waveformValid) errors.push("Waveform data is invalid.");

    const header = await this.verifyHeaders(url);
    warnings.push(...header.warnings);
    errors.push(...header.errors);

    const status = errors.length ? "failed" : warnings.length ? "warning" : "ok";
    return {
      releaseId: release.releaseId,
      previewAvailable,
      urlPublicSafe,
      headSucceeded: header.headSucceeded,
      rangeSupported: header.rangeSupported,
      mimeValid,
      durationValid,
      waveformValid,
      fullSongAbsent,
      cdnReachable: header.cdnReachable,
      status,
      warnings,
      errors,
      checkedAt: new Date().toISOString(),
    };
  }

  private async verifyHeaders(url?: string): Promise<{ headSucceeded: boolean; rangeSupported: boolean; cdnReachable: boolean; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    if (!url) return { headSucceeded: false, rangeSupported: false, cdnReachable: false, warnings, errors };
    if (url.startsWith("/")) {
      warnings.push("Preview URL is relative; CDN/header verification requires an absolute public URL.");
      return { headSucceeded: false, rangeSupported: false, cdnReachable: false, warnings, errors };
    }
    try {
      const head = await fetch(url, { method: "HEAD" });
      const headSucceeded = head.ok;
      if (!headSucceeded) warnings.push(`HEAD request returned ${head.status}.`);
      const contentType = head.headers.get("content-type") ?? "";
      if (contentType && !contentType.startsWith("audio/")) warnings.push(`HEAD content-type is ${contentType}.`);
      const range = await fetch(url, { headers: { Range: "bytes=0-1" } });
      const rangeSupported = range.status === 206 && Boolean(range.headers.get("content-range"));
      if (!rangeSupported) warnings.push(`Range request returned ${range.status}; browser seeking may still work for short previews but CDN range support is not confirmed.`);
      await range.body?.cancel();
      return { headSucceeded, rangeSupported, cdnReachable: head.ok || range.ok, warnings, errors };
    } catch {
      warnings.push("Preview URL could not be reached from this environment.");
      return { headSucceeded: false, rangeSupported: false, cdnReachable: false, warnings, errors };
    }
  }

  private failed(releaseId: string, errors: string[]): PublicAudioPlaybackVerificationReport {
    return {
      releaseId,
      previewAvailable: false,
      urlPublicSafe: false,
      headSucceeded: false,
      rangeSupported: false,
      mimeValid: false,
      durationValid: false,
      waveformValid: false,
      fullSongAbsent: true,
      cdnReachable: false,
      status: "failed",
      warnings: [],
      errors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const publicAudioPlaybackVerificationService = new PublicAudioPlaybackVerificationService();

