import type {
  MediaAssetRecord,
  ReleasePublishReadiness,
  SongReleaseAdminRecord,
} from "../../models/admin";
import type { PublicSongRelease } from "../../models/release";
import { buildReleasePublishReadiness, validateReleasePublicMappingSafety } from "../../utils/admin/releasePublishingUtils";
import { createApiError, createApiSuccess, type ApiResult } from "../api/httpClient";
import { adminArtistService } from "./AdminArtistService";
import { adminMediaService } from "./AdminMediaService";
import { adminReleaseService } from "./AdminReleaseService";
import { recordPublishingAuditEvent } from "./AdminAuditService";
import { mediaAssetVisibilityService } from "../media";

export interface ReleasePublishOptions {
  updatedBy?: string;
  reason?: string;
  allowWarnings?: boolean;
}

export interface ReleasePublishResult {
  releaseId: string;
  readiness: ReleasePublishReadiness;
  release?: SongReleaseAdminRecord;
  publicPreview?: PublicSongRelease;
}

const getMetadataString = (release: SongReleaseAdminRecord, key: string): string | undefined => {
  const value = release.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

export class ReleasePublishingService {
  async validateReleasePublishReadiness(releaseOrId: string | SongReleaseAdminRecord): Promise<ReleasePublishReadiness> {
    const releaseResult = typeof releaseOrId === "string" ? await adminReleaseService.getRelease(releaseOrId) : createApiSuccess(releaseOrId);
    if (!releaseResult.ok) {
      return {
        releaseId: typeof releaseOrId === "string" ? releaseOrId : "missing-release",
        ready: false,
        publicVisibility: "blocked",
        blockingIssues: [releaseResult.error.message],
        warnings: [],
        missingFields: [],
        linkedAssetStates: {
          coverArt: this.missingAssetState("coverArt", "Cover Art", true),
          audioPreview: this.missingAssetState("audioPreview", "Audio Preview", false),
          fullSong: this.missingAssetState("fullSong", "Full Song", false),
          seoImage: this.missingAssetState("seoImage", "SEO Image", false),
          socialImage: this.missingAssetState("socialImage", "Social Image", false),
        },
        artistState: { exists: false, active: false, blockingIssues: ["Release was not found."] },
        metadataState: {
          seoTitlePresent: false,
          seoDescriptionPresent: false,
          seoImageSafe: false,
          socialTitlePresent: false,
          socialDescriptionPresent: false,
          socialImageSafe: false,
          warnings: [],
          blockingIssues: [],
        },
        checkedAt: new Date().toISOString(),
      };
    }

    const release = releaseResult.data;
    const [artistResult, mediaResult] = await Promise.all([
      release.artistId ? adminArtistService.getArtist(release.artistId) : Promise.resolve(createApiError("validation_error", "Artist is missing.", 400)),
      adminMediaService.listMediaAssets(),
    ]);
    const artist = artistResult.ok ? artistResult.data : null;
    const mediaAssets = mediaResult.ok ? mediaResult.data : [];
    const coverAsset = this.findReleaseAsset(release, mediaAssets, "coverArtAssetId", ["cover_art", "custom_image", "promo_graphic", "social_preview"]);
    const audioAsset = this.findReleaseAsset(release, mediaAssets, "audioPreviewAssetId", ["audio_preview", "custom_audio"]);
    const fullSongAsset = this.findReleaseAsset(release, mediaAssets, "fullSongAssetId", ["full_song", "custom_audio"]);
    const visibilityByKey = {
      coverArt: coverAsset ? mediaAssetVisibilityService.getAssetVisibility(coverAsset, { entityType: "release", entityId: release.releaseId, fieldKey: "coverArtUrl", requireAssignment: false, allowAdminAssignment: true }) : undefined,
      audioPreview: audioAsset ? mediaAssetVisibilityService.getAssetVisibility(audioAsset, { entityType: "release", entityId: release.releaseId, fieldKey: "audioPreviewUrl", requireAssignment: false, allowAdminAssignment: true }) : undefined,
      fullSong: fullSongAsset ? mediaAssetVisibilityService.getAssetVisibility(fullSongAsset, { entityType: "release", entityId: release.releaseId, fieldKey: "fullSongUrl", requireAssignment: false, publicPlaybackAllowed: release.metadata?.fullSongPublicPlaybackAllowed === true, allowAdminAssignment: true }) : undefined,
    };
    return buildReleasePublishReadiness(release, artist, mediaAssets, visibilityByKey);
  }

  async getReleasePublishBlockingIssues(release: SongReleaseAdminRecord): Promise<string[]> {
    return (await this.validateReleasePublishReadiness(release)).blockingIssues;
  }

  async getReleasePublishWarnings(release: SongReleaseAdminRecord): Promise<string[]> {
    return (await this.validateReleasePublishReadiness(release)).warnings;
  }

  async publishRelease(releaseId: string, options: ReleasePublishOptions = {}): Promise<ApiResult<ReleasePublishResult>> {
    const readiness = await this.validateReleasePublishReadiness(releaseId);
    const current = await adminReleaseService.getRelease(releaseId);
    if (!current.ok) return createApiError(current.error.code, current.error.message, current.error.status);
    if (!readiness.ready) {
      this.recordBlockedPublish(current.data, readiness);
      return createApiError("validation_error", readiness.blockingIssues.concat(readiness.missingFields.map((field) => `${field} is required.`)).join(" "), 400);
    }
    const publicPreview = this.buildPublicReleasePreview(current.data);
    const updated = await adminReleaseService.updateRelease(releaseId, {
      status: "published",
      updatedBy: options.updatedBy,
      metadata: {
        ...(current.data.metadata ?? {}),
        lastPublishReadinessCheckedAt: readiness.checkedAt,
        lastPublishReason: options.reason ?? null,
      },
    });
    if (!updated.ok) return createApiError(updated.error.code, updated.error.message, updated.error.status);
    recordPublishingAuditEvent("release", {
      actionType: "publish",
      entityId: updated.data.releaseId,
      entityLabel: updated.data.title,
      entitySlug: updated.data.slug,
      route: `/admin/releases/${updated.data.releaseId}/edit`,
      summary: `Published release "${updated.data.title}"`,
      before: current.data,
      after: updated.data,
      metadata: {
        readinessCheckedAt: readiness.checkedAt,
        warningCount: readiness.warnings.length,
      },
    });
    return createApiSuccess({ releaseId, readiness, release: updated.data, publicPreview: publicPreview ?? undefined });
  }

  async unpublishRelease(releaseId: string, options: ReleasePublishOptions = {}): Promise<ApiResult<ReleasePublishResult>> {
    const current = await adminReleaseService.getRelease(releaseId);
    if (!current.ok) return createApiError(current.error.code, current.error.message, current.error.status);
    const updated = await adminReleaseService.updateRelease(releaseId, {
      status: "draft",
      updatedBy: options.updatedBy,
      metadata: { ...(current.data.metadata ?? {}), lastUnpublishReason: options.reason ?? null },
    });
    if (!updated.ok) return createApiError(updated.error.code, updated.error.message, updated.error.status);
    const readiness = await this.validateReleasePublishReadiness(updated.data);
    recordPublishingAuditEvent("release", {
      actionType: "custom",
      entityId: releaseId,
      entityLabel: updated.data.title,
      summary: `Unpublished release "${updated.data.title}"`,
    });
    return createApiSuccess({ releaseId, readiness, release: updated.data });
  }

  async archiveRelease(releaseId: string, options: ReleasePublishOptions = {}) {
    const result = await adminReleaseService.archiveRelease(releaseId, { updatedBy: options.updatedBy, reason: options.reason });
    if (!result.ok) return createApiError(result.error.code, result.error.message, result.error.status);
    const readiness = await this.validateReleasePublishReadiness(result.data);
    return createApiSuccess({ releaseId, readiness, release: result.data });
  }

  async restoreRelease(releaseId: string, options: ReleasePublishOptions = {}) {
    const current = await adminReleaseService.getRelease(releaseId);
    if (!current.ok) return createApiError(current.error.code, current.error.message, current.error.status);
    const updated = await adminReleaseService.updateRelease(releaseId, {
      status: "draft",
      updatedBy: options.updatedBy,
      metadata: { ...(current.data.metadata ?? {}), lastRestoreReason: options.reason ?? null },
    });
    if (!updated.ok) return createApiError(updated.error.code, updated.error.message, updated.error.status);
    const readiness = await this.validateReleasePublishReadiness(updated.data);
    recordPublishingAuditEvent("release", {
      actionType: "restore",
      entityId: releaseId,
      entityLabel: updated.data.title,
      summary: `Restored release "${updated.data.title}"`,
    });
    return createApiSuccess({ releaseId, readiness, release: updated.data });
  }

  buildPublicReleasePreview(release: SongReleaseAdminRecord): PublicSongRelease | null {
    return validateReleasePublicMappingSafety(release, [release.artistId]).publicRelease;
  }

  validatePublicReleaseMapping(release: SongReleaseAdminRecord): string[] {
    return validateReleasePublicMappingSafety(release, [release.artistId]).blockingIssues;
  }

  private findReleaseAsset(
    release: SongReleaseAdminRecord,
    mediaAssets: readonly MediaAssetRecord[],
    metadataKey: string,
    assetTypes: readonly string[],
  ) {
    const assetId = getMetadataString(release, metadataKey);
    if (assetId) return mediaAssets.find((asset) => asset.assetId === assetId);
    return mediaAssets.find((asset) => asset.ownerType === "release" && asset.ownerId === release.releaseId && assetTypes.includes(asset.assetType));
  }

  private missingAssetState(key: "coverArt" | "audioPreview" | "fullSong" | "seoImage" | "socialImage", label: string, required: boolean) {
    return {
      key,
      label,
      present: false,
      required,
      publicAllowed: false,
      visibility: "missing",
      blockingIssues: required ? [`${label} is missing.`] : [],
      warnings: required ? [] : [`${label} is missing.`],
    };
  }

  private recordBlockedPublish(release: SongReleaseAdminRecord, readiness: ReleasePublishReadiness) {
    const summary = readiness.blockingIssues.some((issue) => issue.toLowerCase().includes("artist"))
      ? `Blocked publish for "${release.title}" because artist is not active`
      : readiness.blockingIssues.some((issue) => issue.toLowerCase().includes("media") || issue.toLowerCase().includes("asset") || issue.toLowerCase().includes("url"))
        ? `Blocked publish for "${release.title}" because media is not public-ready`
        : `Blocked publish for "${release.title}" because readiness checks failed`;
    recordPublishingAuditEvent("release", {
      actionType: "custom",
      entityId: release.releaseId,
      entityLabel: release.title,
      entitySlug: release.slug,
      route: `/admin/releases/${release.releaseId}/edit`,
      summary,
      metadata: {
        blockingIssueCount: readiness.blockingIssues.length,
        missingFieldCount: readiness.missingFields.length,
      },
    });
  }
}

export const releasePublishingService = new ReleasePublishingService();
