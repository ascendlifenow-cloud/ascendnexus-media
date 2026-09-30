import type { MediaAssetRecord } from "../../models/admin";
import type {
  MediaAssetAssignmentStatus,
  MediaAssetLink,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkOptions,
} from "../../models/media";
import type { ApiResult } from "../api/httpClient";
import { createApiError, createApiSuccess } from "../api/httpClient";
import {
  SeedBackedAdminArtistService,
  SeedBackedAdminGalleryService,
  SeedBackedAdminMetadataService,
  SeedBackedAdminReleaseService,
  SeedBackedAdminSiteConfigService,
  adminMediaService,
  recordMediaAuditEvent,
} from "../admin";
import {
  buildLinkedAssetMetadata,
  buildMediaAssetLink,
  getAssignmentState,
  getEntityUrlFromAsset,
  getPublicReferenceState,
  isAssetCompatibleWithField,
  type MediaAssetCompatibilityResult,
} from "../../utils/media/mediaAssetLinkUtils";
import { isSafePublicMediaUrl } from "../../utils/media/publicSafeUrlUtils";
import { dispatchMediaAssignmentChanged } from "./MediaAssignmentEvents";

const defaultOptions: Required<Pick<MediaAssetLinkOptions, "replaceExisting" | "updateEntityField" | "preservePreviousLink" | "publicSafetyCheck">> = {
  replaceExisting: true,
  updateEntityField: true,
  preservePreviousLink: true,
  publicSafetyCheck: true,
};

const nowIso = () => new Date().toISOString();

const getAssetStorageObjectId = (asset: MediaAssetRecord | null): string | null => {
  if (!asset) return null;
  const direct = asset.metadata?.storageObjectId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const publicDirect = asset.metadata?.publicStorageObjectId;
  if (typeof publicDirect === "string" && publicDirect.trim()) return publicDirect.trim();
  const storage = asset.metadata?.storage;
  if (storage && typeof storage === "object" && !Array.isArray(storage)) {
    const storageObjectId = storage.storageObjectId;
    if (typeof storageObjectId === "string" && storageObjectId.trim()) return storageObjectId.trim();
  }
  return null;
};

const getAssetMetadataString = (asset: MediaAssetRecord | null, key: string): string | null => {
  const value = asset?.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getAssetMetadataNumber = (asset: MediaAssetRecord | null, key: string): number | null => {
  const value = asset?.metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const visualPublicFields = new Set<MediaAssetLinkFieldKey>([
  "profileImage",
  "profileThumbnailUrl",
  "profileBannerUrl",
  "characterArtUrl",
  "coverArtUrl",
  "coverArtThumbnailUrl",
  "coverArtLargeUrl",
  "imageUrl",
  "thumbnailUrl",
  "heroImageUrl",
  "socialImageUrl",
  "brandLogoUrl",
  "defaultCoverArtUrl",
  "defaultArtistImageUrl",
  "defaultSocialImageUrl",
]);

const shouldPromoteVisualAssetForPublicField = (asset: MediaAssetRecord, fieldKey: MediaAssetLinkFieldKey): boolean =>
  visualPublicFields.has(fieldKey) &&
  asset.assetType !== "full_song" &&
  Boolean(getAssetStorageObjectId(asset)) &&
  !isSafePublicMediaUrl(getEntityUrlFromAsset(asset));

export class MediaAssetLinkingService {
  private links: MediaAssetLink[] = [];

  constructor(
    private readonly artistService = new SeedBackedAdminArtistService(),
    private readonly releaseService = new SeedBackedAdminReleaseService(),
    private readonly galleryService = new SeedBackedAdminGalleryService(),
    private readonly siteConfigService = new SeedBackedAdminSiteConfigService(),
    private readonly metadataService = new SeedBackedAdminMetadataService(),
    private readonly mediaService = adminMediaService,
  ) {}

  async linkAssetToEntity(
    assetId: string,
    entityType: MediaAssetLinkEntityType,
    entityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    options: MediaAssetLinkOptions,
  ): Promise<ApiResult<MediaAssetLink>> {
    const resolvedOptions = { ...defaultOptions, ...options };
    const assetResult = await this.mediaService.getMediaAsset(assetId);
    if (!assetResult.ok) return createApiError("not_found", "Media asset was not found.", 404);
    const compatibility = this.validateAssetCompatibility(assetResult.data, entityType, fieldKey, resolvedOptions.intendedUse);
    if (resolvedOptions.publicSafetyCheck && !compatibility.compatible) {
      this.recordLinkAudit("blocked", assetResult.data, entityType, entityId, fieldKey, compatibility.blockingIssues);
      return createApiError("validation_error", compatibility.blockingIssues.join(" "), 400);
    }

    const existing = this.findActiveEntityFieldLink(entityType, entityId, fieldKey);
    if (existing && resolvedOptions.replaceExisting) {
      this.markLink(existing.linkId, "replaced");
    } else if (existing) {
      return createApiError("conflict", "An active media asset link already exists for this field.", 409);
    }

    const link = buildMediaAssetLink(assetId, entityType, entityId, fieldKey, resolvedOptions.intendedUse, {
      ...(resolvedOptions.metadata ?? {}),
      previousLinkId: existing?.linkId ?? null,
    });
    link.linkedBy = resolvedOptions.linkedBy;
    this.links = [...this.links, link];

    if (resolvedOptions.updateEntityField) {
      const updateResult = await this.applyLinkedAssetToEntity(assetResult.data, entityType, entityId, fieldKey, {
        ...resolvedOptions,
        metadata: { ...(resolvedOptions.metadata ?? {}), linkId: link.linkId, previousLinkId: existing?.linkId ?? null },
      });
      if (!updateResult.ok) {
        this.markLink(link.linkId, "detached");
        this.recordLinkAudit("failed", assetResult.data, entityType, entityId, fieldKey, [updateResult.error.message]);
        return createApiError(updateResult.error.code, updateResult.error.message, updateResult.error.status);
      }
    }

    this.recordLinkAudit(existing ? "replaced" : "linked", assetResult.data, entityType, entityId, fieldKey);
    dispatchMediaAssignmentChanged({ assetId, entityType, entityId, fieldKey, source: "asset_picker" });
    return createApiSuccess(link);
  }

  replaceEntityAsset(
    assetId: string,
    entityType: MediaAssetLinkEntityType,
    entityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    options: MediaAssetLinkOptions,
  ): Promise<ApiResult<MediaAssetLink>> {
    return this.linkAssetToEntity(assetId, entityType, entityId, fieldKey, { ...options, replaceExisting: true, preservePreviousLink: true });
  }

  async detachAssetFromEntity(linkId: string, options: Partial<MediaAssetLinkOptions> = {}): Promise<ApiResult<MediaAssetLink>> {
    const link = this.links.find((item) => item.linkId === linkId);
    if (!link) return createApiError("not_found", "Media asset link was not found.", 404);
    const detached = this.markLink(linkId, "detached");
    if (!detached) return createApiError("server_error", "Media asset link could not be detached.", 500);
    if (options.updateEntityField !== false) {
      await this.removeLinkedAssetFromEntity(link.entityType, link.entityId, link.fieldKey, options);
    }
    const asset = await this.mediaService.getMediaAsset(link.assetId);
    this.recordLinkAudit("detached", asset.ok ? asset.data : null, link.entityType, link.entityId, link.fieldKey);
    return createApiSuccess(detached);
  }

  async detachAssetFromField(
    entityType: MediaAssetLinkEntityType,
    entityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    options: Partial<MediaAssetLinkOptions> = {},
  ): Promise<ApiResult<MediaAssetLink>> {
    const link = this.findActiveEntityFieldLink(entityType, entityId, fieldKey);
    if (!link) return createApiError("not_found", "No active media asset link was found for this field.", 404);
    return this.detachAssetFromEntity(link.linkId, options);
  }

  getAssetLinks(assetId: string): MediaAssetLink[] {
    return this.links.filter((link) => link.assetId === assetId);
  }

  getEntityMediaLinks(entityType: MediaAssetLinkEntityType, entityId: string): MediaAssetLink[] {
    return this.links.filter((link) => link.entityType === entityType && link.entityId === entityId);
  }

  async getAssignmentStatus(assetId: string): Promise<MediaAssetAssignmentStatus> {
    const asset = await this.mediaService.getMediaAsset(assetId);
    const links = this.getAssetLinks(assetId);
    const activeLinks = links.filter((link) => link.status === "active");
    const previousLinks = links.filter((link) => link.status !== "active");
    const publicVisibility = getPublicReferenceState(asset.ok ? asset.data : null, activeLinks);
    return {
      assetId,
      assignmentState: getAssignmentState(activeLinks, previousLinks),
      activeLinks,
      previousLinks,
      isPubliclyReferenced: publicVisibility === "public",
      publicVisibility,
      warnings: publicVisibility === "admin_only" ? ["Asset is linked but storage is admin-only."] : [],
      blockingIssues: asset.ok ? [] : ["Media asset was not found."],
      metadata: {
        activeLinkCount: activeLinks.length,
        previousLinkCount: previousLinks.length,
      },
    };
  }

  validateAssetCompatibility(
    asset: MediaAssetRecord,
    entityType: MediaAssetLinkEntityType,
    fieldKey: MediaAssetLinkFieldKey,
    intendedUse: MediaAssetLinkOptions["intendedUse"],
  ): MediaAssetCompatibilityResult {
    return isAssetCompatibleWithField(asset, entityType, fieldKey, intendedUse);
  }

  async applyLinkedAssetToEntity(
    asset: MediaAssetRecord,
    entityType: MediaAssetLinkEntityType,
    entityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    options: MediaAssetLinkOptions,
  ): Promise<ApiResult<unknown>> {
    let resolvedAsset = asset;
    if (shouldPromoteVisualAssetForPublicField(asset, fieldKey)) {
      const promoted = await this.mediaService.promoteMediaAssetForPublicUse(asset);
      if (promoted.ok) resolvedAsset = promoted.data;
    }
    const url = getEntityUrlFromAsset(resolvedAsset);
    if (!url.trim()) return createApiError("validation_error", "Media asset does not have a usable URL.", 400);
    const link = this.findActiveEntityFieldLink(entityType, entityId, fieldKey);
    const metadata = link ? buildLinkedAssetMetadata(resolvedAsset, link, typeof options.metadata?.previousLinkId === "string" ? options.metadata.previousLinkId : undefined) : {};

    if (entityType === "artist") return this.applyArtistUpdate(entityId, fieldKey, url, resolvedAsset, metadata);
    if (entityType === "release") return this.applyReleaseUpdate(entityId, fieldKey, url, resolvedAsset, metadata);
    if (entityType === "gallery_item") return this.applyGalleryUpdate(entityId, fieldKey, url, resolvedAsset, metadata);
    if (entityType === "homepage_section") return this.applyHomepageSectionUpdate(entityId, fieldKey, url, resolvedAsset, metadata);
    if (entityType === "site_config") return this.applySiteConfigUpdate(fieldKey, url, resolvedAsset, metadata);
    if (entityType === "seo_metadata" || entityType === "social_metadata") return this.applyMetadataUpdate(entityType, entityId, fieldKey, url, resolvedAsset);
    return createApiSuccess({ entityType, entityId, fieldKey, url, metadata });
  }

  async removeLinkedAssetFromEntity(
    entityType: MediaAssetLinkEntityType,
    entityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    _options: Partial<MediaAssetLinkOptions> = {},
  ): Promise<ApiResult<unknown>> {
    if (entityType === "artist") return this.applyArtistUpdate(entityId, fieldKey, "", null, {});
    if (entityType === "release") return this.applyReleaseUpdate(entityId, fieldKey, "", null, {});
    if (entityType === "gallery_item") return this.applyGalleryUpdate(entityId, fieldKey, "", null, {});
    if (entityType === "homepage_section") return this.applyHomepageSectionUpdate(entityId, fieldKey, "", null, {});
    if (entityType === "site_config") return this.applySiteConfigUpdate(fieldKey, "", null, {});
    return createApiSuccess({ entityType, entityId, fieldKey, detached: true });
  }

  private findActiveEntityFieldLink(entityType: MediaAssetLinkEntityType, entityId: string, fieldKey: MediaAssetLinkFieldKey): MediaAssetLink | undefined {
    return this.links.find((link) => link.entityType === entityType && link.entityId === entityId && link.fieldKey === fieldKey && link.status === "active");
  }

  private markLink(linkId: string, status: MediaAssetLink["status"]): MediaAssetLink | null {
    let updated: MediaAssetLink | null = null;
    this.links = this.links.map((link) => {
      if (link.linkId !== linkId) return link;
      updated = { ...link, status, unlinkedAt: status === "active" ? undefined : nowIso() };
      return updated;
    });
    return updated;
  }

  private async applyArtistUpdate(entityId: string, fieldKey: MediaAssetLinkFieldKey, url: string, asset: MediaAssetRecord | null, metadata: Record<string, string | number | boolean | null>): Promise<ApiResult<unknown>> {
    const current = await this.artistService.getArtist(entityId);
    if (!current.ok) return current;
    const patch: Record<string, unknown> = { metadata: { ...(current.data.metadata ?? {}), ...metadata } };
    const storageObjectId = getAssetStorageObjectId(asset);
    if (fieldKey === "profileImage") {
      patch.profileImage = url;
      patch.metadata = { ...(patch.metadata as object), profileImageAssetId: asset?.assetId ?? null, profileImageStorageObjectId: storageObjectId };
    }
    if (fieldKey === "profileThumbnailUrl") {
      patch.profileThumbnailUrl = url;
      patch.metadata = { ...(patch.metadata as object), profileThumbnailAssetId: asset?.assetId ?? null, profileThumbnailStorageObjectId: storageObjectId };
    }
    if (fieldKey === "profileBannerUrl") {
      patch.profileBannerUrl = url;
      patch.metadata = { ...(patch.metadata as object), profileBannerAssetId: asset?.assetId ?? null, profileBannerStorageObjectId: storageObjectId };
    }
    if (fieldKey === "characterArtUrl") {
      patch.metadata = { ...(patch.metadata as object), characterArtUrl: url, characterArtAssetId: asset?.assetId ?? null, characterArtStorageObjectId: storageObjectId };
    }
    return this.artistService.updateArtist(entityId, patch);
  }

  private async applyReleaseUpdate(entityId: string, fieldKey: MediaAssetLinkFieldKey, url: string, asset: MediaAssetRecord | null, metadata: Record<string, string | number | boolean | null>): Promise<ApiResult<unknown>> {
    const current = await this.releaseService.getRelease(entityId);
    if (!current.ok) return current;
    const patch: Record<string, unknown> = { metadata: { ...(current.data.metadata ?? {}), ...metadata } };
    const storageObjectId = getAssetStorageObjectId(asset);
    const publicUrl = isSafePublicMediaUrl(url) ? url : "";
    if (fieldKey === "coverArtUrl") {
      patch.coverArtUrl = publicUrl;
      patch.metadata = { ...(patch.metadata as object), coverArtAssetId: asset?.assetId ?? null, coverArtStorageObjectId: storageObjectId, coverArtPendingPublicPromotion: publicUrl ? false : true };
    }
    if (fieldKey === "coverArtThumbnailUrl") {
      patch.coverArtThumbnailUrl = publicUrl;
      patch.metadata = { ...(patch.metadata as object), coverArtThumbnailAssetId: asset?.assetId ?? null, coverArtThumbnailStorageObjectId: storageObjectId, coverArtPendingPublicPromotion: publicUrl ? false : true };
    }
    if (fieldKey === "coverArtLargeUrl") {
      patch.coverArtLargeUrl = publicUrl;
      patch.metadata = { ...(patch.metadata as object), coverArtLargeAssetId: asset?.assetId ?? null, coverArtLargeStorageObjectId: storageObjectId, coverArtPendingPublicPromotion: publicUrl ? false : true };
    }
    if (fieldKey === "audioPreviewUrl") {
      patch.audioPreviewUrl = publicUrl;
      patch.metadata = { ...(patch.metadata as object), audioPreviewAssetId: asset?.assetId ?? null, audioPreviewStorageObjectId: storageObjectId, audioPreviewPendingPublicPromotion: publicUrl ? false : true };
    }
    if (fieldKey === "fullSongUrl") {
      patch.metadata = {
        ...(patch.metadata as object),
        fullSongAssetId: asset?.assetId ?? null,
        fullSongStorageObjectId: storageObjectId,
        fullSongOriginalFileName: getAssetMetadataString(asset, "originalFileName") ?? getAssetMetadataString(asset, "sourceFilename"),
        fullSongMimeType: getAssetMetadataString(asset, "mimeType"),
        fullSongFileSizeBytes: getAssetMetadataNumber(asset, "fileSizeBytes") ?? getAssetMetadataNumber(asset, "size"),
        fullSongPublicPlaybackAllowed: false,
      };
    }
    return this.releaseService.updateRelease(entityId, patch);
  }

  private async applyGalleryUpdate(entityId: string, fieldKey: MediaAssetLinkFieldKey, url: string, asset: MediaAssetRecord | null, metadata: Record<string, string | number | boolean | null>): Promise<ApiResult<unknown>> {
    const current = await this.galleryService.getGalleryItem(entityId);
    if (!current.ok) return current;
    const patch: Record<string, unknown> = { metadata: { ...(current.data.metadata ?? {}), ...metadata } };
    if (fieldKey === "imageUrl" || fieldKey === "heroImageUrl" || fieldKey === "socialImageUrl") patch.imageUrl = url;
    if (fieldKey === "thumbnailUrl") patch.thumbnailUrl = url;
    patch.metadata = { ...(patch.metadata as object), mediaAssetId: asset?.assetId ?? null };
    return this.galleryService.updateGalleryItem(entityId, patch);
  }

  private async applyHomepageSectionUpdate(entityId: string, fieldKey: MediaAssetLinkFieldKey, url: string, asset: MediaAssetRecord | null, metadata: Record<string, string | number | boolean | null>): Promise<ApiResult<unknown>> {
    const site = await this.siteConfigService.getSiteConfig();
    if (!site.ok) return site;
    const sections = site.data.homepageSections.map((section) => {
      if (section.sectionId !== entityId) return section;
      const configKey = fieldKey === "heroImageUrl" ? "heroImageUrl" : fieldKey === "imageUrl" ? "backgroundImageUrl" : fieldKey;
      return {
        ...section,
        configuration: { ...section.configuration, [configKey]: url, mediaAssetId: asset?.assetId ?? null },
        metadata: { ...(section.metadata ?? {}), ...metadata },
      };
    });
    return this.siteConfigService.updateSiteConfig({ homepageSections: sections });
  }

  private async applySiteConfigUpdate(fieldKey: MediaAssetLinkFieldKey, url: string, asset: MediaAssetRecord | null, metadata: Record<string, string | number | boolean | null>): Promise<ApiResult<unknown>> {
    const patch: Record<string, unknown> = { metadata: { ...metadata, mediaAssetId: asset?.assetId ?? null } };
    if (fieldKey === "brandLogoUrl") patch.brandLogoUrl = url;
    if (fieldKey === "defaultCoverArtUrl") patch.defaultCoverArtUrl = url;
    if (fieldKey === "defaultArtistImageUrl") patch.defaultArtistImageUrl = url;
    if (fieldKey === "defaultSocialImageUrl" || fieldKey === "socialImageUrl") patch.defaultSocialImageUrl = url;
    return this.siteConfigService.updateSiteConfig(patch);
  }

  private async applyMetadataUpdate(entityType: MediaAssetLinkEntityType, entityId: string, _fieldKey: MediaAssetLinkFieldKey, url: string, asset: MediaAssetRecord): Promise<ApiResult<unknown>> {
    const [metadataEntityType, metadataEntityId] = entityId.includes(":")
      ? entityId.split(":", 2)
      : ["site", entityId];
    const records = await this.metadataService.listMetadataRecords();
    if (!records.ok) return records;
    const current = records.data.find((record) => record.entityType === metadataEntityType && record.entityId === metadataEntityId);
    if (!current) return createApiError("not_found", "Metadata record was not found.", 404);
    if (!current.entityId) return createApiError("validation_error", "Metadata record does not have an entity ID.", 400);
    if (entityType === "seo_metadata") {
      return this.metadataService.updateSeoMetadata(current.entityType, current.entityId, {
        title: current.seoMetadata?.title ?? current.entityLabel,
        description: current.seoMetadata?.description ?? current.entityLabel,
        ...current.seoMetadata,
        imageUrl: url,
      });
    }
    return this.metadataService.updateSocialMetadata(current.entityType, current.entityId, {
      title: current.socialMetadata?.title ?? current.entityLabel,
      description: current.socialMetadata?.description ?? current.entityLabel,
      ...current.socialMetadata,
      imageUrl: url,
      imageAlt: asset.altText ?? current.socialMetadata?.imageAlt,
    });
  }

  private recordLinkAudit(
    state: "linked" | "replaced" | "detached" | "failed" | "blocked",
    asset: MediaAssetRecord | null,
    entityType: MediaAssetLinkEntityType,
    entityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    errors: string[] = [],
  ): void {
    recordMediaAuditEvent({
      actionType: state === "detached" ? "update" : state === "blocked" || state === "failed" ? "validate" : "upload",
      entityId: asset?.assetId ?? entityId,
      entityLabel: asset?.title ?? `${entityType} ${fieldKey}`,
      route: "/admin/media",
      summary: `Media asset ${state} for ${entityType} ${entityId} ${fieldKey}`,
      metadata: { state, entityType, entityId, fieldKey, assetId: asset?.assetId ?? null, errors },
    });
  }
}

export const mediaAssetLinkingService = new MediaAssetLinkingService();
