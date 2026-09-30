import type {
  ArtistAdminRecord,
  ArtistLinkedAssetKey,
  ArtistPublishReadiness,
  MediaAssetRecord,
} from "../../models/admin";
import type { ArtistPublicProfile } from "../../models/artist";
import { buildArtistPublishReadiness, validateArtistPublicMappingSafety } from "../../utils/admin/artistPublishingUtils";
import { createApiError, createApiSuccess, type ApiResult } from "../api/httpClient";
import { mediaAssetVisibilityService } from "../media";
import { recordPublishingAuditEvent } from "./AdminAuditService";
import { adminArtistService } from "./AdminArtistService";
import { adminMediaService } from "./AdminMediaService";

export interface ArtistPublishOptions {
  updatedBy?: string;
  reason?: string;
  allowWarnings?: boolean;
}

export interface ArtistPublishResult {
  artistId: string;
  readiness: ArtistPublishReadiness;
  artist?: ArtistAdminRecord;
  publicPreview?: ArtistPublicProfile;
}

const metadataString = (artist: ArtistAdminRecord, key: string): string | undefined => {
  const value = artist.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

export class ArtistPublishingService {
  async validateArtistPublishReadiness(artistOrId: string | ArtistAdminRecord): Promise<ArtistPublishReadiness> {
    const artistResult = typeof artistOrId === "string" ? await adminArtistService.getArtist(artistOrId) : createApiSuccess(artistOrId);
    if (!artistResult.ok) {
      return {
        artistId: typeof artistOrId === "string" ? artistOrId : "missing-artist",
        ready: false,
        publicVisibility: "blocked",
        blockingIssues: [artistResult.error.message],
        warnings: [],
        missingFields: [],
        linkedAssetStates: {
          profileImage: this.missingAssetState("profileImage", "Profile Image", true),
          characterArt: this.missingAssetState("characterArt", "Character Art", false),
          bannerImage: this.missingAssetState("bannerImage", "Banner Image", false),
          thumbnailImage: this.missingAssetState("thumbnailImage", "Thumbnail Image", false),
          seoImage: this.missingAssetState("seoImage", "SEO Image", false),
          socialImage: this.missingAssetState("socialImage", "Social Image", false),
        },
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

    const artist = artistResult.data;
    const mediaResult = await adminMediaService.listMediaAssets();
    const mediaAssets = mediaResult.ok ? mediaResult.data : [];
    const profileAsset = this.findArtistAsset(artist, mediaAssets, "profileImageAssetId", ["artist_profile"]);
    const thumbnailAsset = this.findArtistAsset(artist, mediaAssets, "profileThumbnailAssetId", ["artist_profile"]);
    const characterAsset = this.findArtistAsset(artist, mediaAssets, "characterArtAssetId", ["artist_character_art"]);
    const bannerAsset = this.findArtistAsset(artist, mediaAssets, "profileBannerAssetId", ["artist_banner"]);
    const visibilityByKey = {
      profileImage: profileAsset ? mediaAssetVisibilityService.getAssetVisibility(profileAsset, { entityType: "artist", entityId: artist.artistId, fieldKey: "profileImage", requireAssignment: false, allowAdminAssignment: true }) : undefined,
      thumbnailImage: thumbnailAsset ? mediaAssetVisibilityService.getAssetVisibility(thumbnailAsset, { entityType: "artist", entityId: artist.artistId, fieldKey: "profileThumbnailUrl", requireAssignment: false, allowAdminAssignment: true }) : undefined,
      characterArt: characterAsset ? mediaAssetVisibilityService.getAssetVisibility(characterAsset, { entityType: "artist", entityId: artist.artistId, fieldKey: "characterArtUrl", requireAssignment: false, allowAdminAssignment: true }) : undefined,
      bannerImage: bannerAsset ? mediaAssetVisibilityService.getAssetVisibility(bannerAsset, { entityType: "artist", entityId: artist.artistId, fieldKey: "profileBannerUrl", requireAssignment: false, allowAdminAssignment: true }) : undefined,
    };
    return buildArtistPublishReadiness(artist, mediaAssets, visibilityByKey);
  }

  async getArtistPublishBlockingIssues(artist: ArtistAdminRecord): Promise<string[]> {
    return (await this.validateArtistPublishReadiness(artist)).blockingIssues;
  }

  async getArtistPublishWarnings(artist: ArtistAdminRecord): Promise<string[]> {
    return (await this.validateArtistPublishReadiness(artist)).warnings;
  }

  async activateArtist(artistId: string, options: ArtistPublishOptions = {}): Promise<ApiResult<ArtistPublishResult>> {
    const readiness = await this.validateArtistPublishReadiness(artistId);
    const current = await adminArtistService.getArtist(artistId);
    if (!current.ok) return createApiError(current.error.code, current.error.message, current.error.status);
    if (!readiness.ready) {
      this.recordBlockedActivation(current.data, readiness);
      return createApiError("validation_error", readiness.blockingIssues.concat(readiness.missingFields.map((field) => `${field} is required.`)).join(" "), 400);
    }
    const publicPreview = this.buildPublicArtistPreview(current.data);
    const updated = await adminArtistService.updateArtist(artistId, {
      status: "active",
      updatedBy: options.updatedBy,
      metadata: {
        ...(current.data.metadata ?? {}),
        lastPublishReadinessCheckedAt: readiness.checkedAt,
        lastActivationReason: options.reason ?? null,
      },
    });
    if (!updated.ok) return createApiError(updated.error.code, updated.error.message, updated.error.status);
    recordPublishingAuditEvent("artist", {
      actionType: "activate",
      entityId: updated.data.artistId,
      entityLabel: updated.data.displayName,
      entitySlug: updated.data.slug,
      route: `/admin/artists/${updated.data.artistId}/edit`,
      summary: `Activated artist "${updated.data.displayName}"`,
      before: current.data,
      after: updated.data,
      metadata: {
        readinessCheckedAt: readiness.checkedAt,
        warningCount: readiness.warnings.length,
      },
    });
    return createApiSuccess({ artistId, readiness, artist: updated.data, publicPreview: publicPreview ?? undefined });
  }

  async archiveArtist(artistId: string, options: ArtistPublishOptions = {}): Promise<ApiResult<ArtistPublishResult>> {
    const result = await adminArtistService.archiveArtist(artistId);
    if (!result.ok) return createApiError(result.error.code, result.error.message, result.error.status);
    const readiness = await this.validateArtistPublishReadiness(result.data);
    if (options.reason) {
      await adminArtistService.updateArtist(artistId, { metadata: { ...(result.data.metadata ?? {}), archiveReason: options.reason } });
    }
    return createApiSuccess({ artistId, readiness, artist: result.data });
  }

  async restoreArtist(artistId: string, options: ArtistPublishOptions = {}): Promise<ApiResult<ArtistPublishResult>> {
    const current = await adminArtistService.getArtist(artistId);
    if (!current.ok) return createApiError(current.error.code, current.error.message, current.error.status);
    const updated = await adminArtistService.updateArtist(artistId, {
      status: "draft",
      updatedBy: options.updatedBy,
      metadata: { ...(current.data.metadata ?? {}), lastRestoreReason: options.reason ?? null },
    });
    if (!updated.ok) return createApiError(updated.error.code, updated.error.message, updated.error.status);
    const readiness = await this.validateArtistPublishReadiness(updated.data);
    recordPublishingAuditEvent("artist", {
      actionType: "restore",
      entityId: artistId,
      entityLabel: updated.data.displayName,
      summary: `Restored artist "${updated.data.displayName}"`,
    });
    return createApiSuccess({ artistId, readiness, artist: updated.data });
  }

  buildPublicArtistPreview(artist: ArtistAdminRecord): ArtistPublicProfile | null {
    return validateArtistPublicMappingSafety(artist).publicArtist;
  }

  validatePublicArtistMapping(artist: ArtistAdminRecord): string[] {
    return validateArtistPublicMappingSafety(artist).blockingIssues;
  }

  private findArtistAsset(
    artist: ArtistAdminRecord,
    mediaAssets: readonly MediaAssetRecord[],
    metadataKey: string,
    assetTypes: readonly string[],
  ) {
    const assetId = metadataString(artist, metadataKey);
    if (assetId) return mediaAssets.find((asset) => asset.assetId === assetId);
    return mediaAssets.find((asset) => asset.ownerType === "artist" && asset.ownerId === artist.artistId && assetTypes.includes(asset.assetType));
  }

  private missingAssetState(key: ArtistLinkedAssetKey, label: string, required: boolean) {
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

  private recordBlockedActivation(artist: ArtistAdminRecord, readiness: ArtistPublishReadiness) {
    const summary = readiness.blockingIssues.some((issue) => issue.toLowerCase().includes("media") || issue.toLowerCase().includes("asset") || issue.toLowerCase().includes("url"))
      ? `Blocked activation for "${artist.displayName}" because media is not public-ready`
      : `Blocked activation for "${artist.displayName}" because readiness checks failed`;
    recordPublishingAuditEvent("artist", {
      actionType: "custom",
      entityId: artist.artistId,
      entityLabel: artist.displayName,
      entitySlug: artist.slug,
      route: `/admin/artists/${artist.artistId}/edit`,
      summary,
      metadata: {
        blockingIssueCount: readiness.blockingIssues.length,
        missingFieldCount: readiness.missingFields.length,
      },
    });
  }
}

export const artistPublishingService = new ArtistPublishingService();
