import type {
  ArtistAdminRecord,
  MediaAssetRecord,
  PublicSiteConfig,
  SongReleaseAdminRecord,
} from "../../models/admin";
import type { PublicGalleryItem } from "../../models/gallery";
import type {
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetVisibilityState,
  MediaStorageObject,
  PublicAssetPolicy,
} from "../../models/media";
import { getMediaCategoryFromAssetType } from "../../utils/media/mediaTypeUtils";
import {
  createVisibilityState,
  getAssetVisibilityBlockingIssues,
  getAssetVisibilityWarnings,
} from "../../utils/media/mediaVisibilityUtils";
import { getPublicAssetPolicy } from "../../utils/media/publicAssetPolicyUtils";
import { getFallbackOrPublicAssetUrl, getPublicSafeMediaUrl, isSafePublicMediaUrl } from "../../utils/media/publicSafeUrlUtils";
import { adminMediaService } from "../admin";
import { mediaAssetLinkingService } from "./MediaAssetLinkingService";

export interface MediaAssetVisibilityContext {
  entityType?: MediaAssetLinkEntityType;
  entityId?: string;
  fieldKey?: MediaAssetLinkFieldKey;
  entity?: unknown;
  linkedEntityPublic?: boolean;
  isAdminPreview?: boolean;
  allowFallback?: boolean;
  fallbackUrl?: string;
  publicPlaybackAllowed?: boolean;
  requireAssignment?: boolean;
  allowAdminAssignment?: boolean;
}

const getStorageAccessLevel = (asset: MediaAssetRecord): string | undefined => {
  const storage = asset.metadata?.storage;
  if (!storage || typeof storage !== "object" || Array.isArray(storage)) return undefined;
  const accessLevel = storage.accessLevel;
  return typeof accessLevel === "string" ? accessLevel : undefined;
};

const getPublicationState = (asset: MediaAssetRecord): string | undefined => {
  const state = asset.metadata?.publicationState;
  return typeof state === "string" ? state : undefined;
};

const isFullSongPublicPlaybackAllowed = (asset: MediaAssetRecord, context: MediaAssetVisibilityContext): boolean => {
  if (context.publicPlaybackAllowed) return true;
  const audio = asset.metadata?.audio;
  if (!audio || typeof audio !== "object" || Array.isArray(audio)) return false;
  return audio.publicPlaybackAllowed === true;
};

const getPolicyCompatibilityIssues = (asset: MediaAssetRecord, policy: PublicAssetPolicy | undefined): string[] => {
  const category = getMediaCategoryFromAssetType(asset.assetType);
  const issues: string[] = [];
  if (policy?.allowedMediaCategories.length && !policy.allowedMediaCategories.includes(category)) {
    issues.push(`Media asset category ${category} is not allowed for this field.`);
  }
  if (policy?.allowedAssetTypes.length && !policy.allowedAssetTypes.includes(asset.assetType)) {
    issues.push(`Media asset type ${asset.assetType} is not allowed for this field.`);
  }
  return issues;
};

const entityIsPublicSafe = (entityType: MediaAssetLinkEntityType | undefined, entity: unknown): boolean => {
  if (!entityType) return true;
  if (!entity || typeof entity !== "object") return false;
  const record = entity as Record<string, unknown>;
  if (entityType === "artist") return record.status === "active" && Boolean(record.slug) && Boolean(record.displayName);
  if (entityType === "release") return record.status === "published" && Boolean(record.slug) && Boolean(record.title) && Boolean(record.releaseDate);
  if (entityType === "gallery_item") return record.status === "published" && Boolean(record.imageUrl || record.thumbnailUrl);
  if (entityType === "homepage_section") return record.enabled === true && Boolean(record.sectionType);
  if (entityType === "seo_metadata") return record.noIndex !== true && record.status !== "draft" && record.status !== "archived";
  return true;
};

export class MediaAssetVisibilityService {
  getAssetVisibility(asset: MediaAssetRecord | null | undefined, context: MediaAssetVisibilityContext = {}): MediaAssetVisibilityState {
    const policy = context.entityType && context.fieldKey ? getPublicAssetPolicy(context.entityType, context.fieldKey) : undefined;
    if (!asset) {
      return createVisibilityState({
        assetId: "missing",
        entityType: context.entityType,
        entityId: context.entityId,
        fieldKey: context.fieldKey,
        visibility: "missing",
        publicAllowed: false,
        reason: "Media asset is missing.",
        blockingIssues: ["Media asset is missing."],
        warnings: [],
      });
    }

    if (context.allowAdminAssignment) {
      const blockingIssues = [
        ...(asset.metadata?.deletedAt ? ["Media asset is soft-deleted."] : []),
        ...(asset.status === "archived" ? ["Media asset is archived."] : []),
        ...getPolicyCompatibilityIssues(asset, policy),
      ];
      const category = getMediaCategoryFromAssetType(asset.assetType);
      const adminOnly = !isSafePublicMediaUrl(asset.url) || getStorageAccessLevel(asset) === "admin_only" || getStorageAccessLevel(asset) === "private" || asset.assetType === "full_song";
      return createVisibilityState({
        assetId: asset.assetId,
        entityType: context.entityType,
        entityId: context.entityId,
        fieldKey: context.fieldKey,
        visibility: blockingIssues.length ? "blocked" : adminOnly ? "admin_only" : "public",
        publicAllowed: blockingIssues.length === 0,
        reason: blockingIssues[0] ?? "Media asset is assignable by admin.",
        blockingIssues,
        warnings: [],
        metadata: {
          assetType: asset.assetType,
          mediaCategory: category,
          storageAccessLevel: getStorageAccessLevel(asset) ?? null,
          publicationState: getPublicationState(asset) ?? null,
          adminAssignmentNote: asset.status === "draft" || adminOnly ? "Draft and private assets are assignable by admins; public exposure remains controlled by publish/protected-delivery rules." : null,
          activeLinkCount: mediaAssetLinkingService.getAssetLinks(asset.assetId).filter((link) => link.status === "active").length,
        },
      });
    }

    const blockingIssues = getAssetVisibilityBlockingIssues(asset, policy);
    const warnings = getAssetVisibilityWarnings(asset, policy);
    const storageAccessLevel = getStorageAccessLevel(asset);
    const publicationState = getPublicationState(asset);
    const activeLinks = mediaAssetLinkingService.getAssetLinks(asset.assetId).filter((link) => link.status === "active");
    const requireAssignment = context.requireAssignment ?? Boolean(context.entityType);
    if (requireAssignment && !activeLinks.length) blockingIssues.push("Media asset is not linked to a public entity.");
    if (policy?.requiresStoragePublic && (storageAccessLevel === "admin_only" || storageAccessLevel === "private")) blockingIssues.push("Media asset storage is admin-only.");
    if (policy?.requiresEntityPublic && context.entity && !entityIsPublicSafe(context.entityType, context.entity)) blockingIssues.push("Linked entity is not public-safe.");
    if (policy?.requiresEntityPublic && context.linkedEntityPublic === false) blockingIssues.push("Linked entity is not public-safe.");
    if (!isSafePublicMediaUrl(asset.url)) blockingIssues.push("Media asset URL is unsafe.");
    if (publicationState && !["published", "public", "legacy_public"].includes(publicationState)) blockingIssues.push(`Media asset publication state is ${publicationState}.`);
    if (asset.thumbnailUrl && !isSafePublicMediaUrl(asset.thumbnailUrl)) blockingIssues.push("Media asset thumbnail URL is unsafe.");
    if (asset.largeUrl && !isSafePublicMediaUrl(asset.largeUrl)) blockingIssues.push("Media asset large URL is unsafe.");
    if (asset.assetType === "full_song" && !isFullSongPublicPlaybackAllowed(asset, context)) blockingIssues.push("Full song public playback is disabled.");

    const adminPreviewAllowed = Boolean(context.isAdminPreview && policy?.allowAdminPreview);
    const publicAllowed = blockingIssues.length === 0 || adminPreviewAllowed;
    const visibility = publicAllowed
      ? "public"
      : asset.status === "archived"
        ? "archived"
        : asset.status === "draft"
          ? "draft"
          : storageAccessLevel === "admin_only" || storageAccessLevel === "private"
            ? "admin_only"
            : publicationState && !["published", "public", "legacy_public"].includes(publicationState)
              ? "blocked"
              : !activeLinks.length && requireAssignment
                ? "unassigned"
                : "blocked";

    return createVisibilityState({
      assetId: asset.assetId,
      entityType: context.entityType,
      entityId: context.entityId,
      fieldKey: context.fieldKey,
      visibility,
      publicAllowed,
      reason: publicAllowed ? "Media asset is public-safe." : blockingIssues[0] ?? "Media asset is not public-safe.",
      blockingIssues,
      warnings,
      metadata: {
        assetType: asset.assetType,
        mediaCategory: getMediaCategoryFromAssetType(asset.assetType),
        storageAccessLevel: storageAccessLevel ?? null,
        publicationState: publicationState ?? null,
        activeLinkCount: activeLinks.length,
      },
    });
  }

  getStorageVisibility(storageObject: MediaStorageObject | null | undefined): MediaAssetVisibilityState {
    if (!storageObject) {
      return createVisibilityState({
        assetId: "missing-storage",
        visibility: "missing",
        publicAllowed: false,
        reason: "Storage object is missing.",
        blockingIssues: ["Storage object is missing."],
        warnings: [],
      });
    }
    const issues: string[] = [];
    if (storageObject.status === "archived" || storageObject.status === "deleted") issues.push("Storage object is not ready.");
    if (storageObject.accessLevel === "admin_only" || storageObject.accessLevel === "private") issues.push("Storage object is admin-only.");
    if (storageObject.publicUrl && !isSafePublicMediaUrl(storageObject.publicUrl)) issues.push("Storage public URL is unsafe.");
    return createVisibilityState({
      assetId: storageObject.assetId ?? storageObject.storageObjectId,
      visibility: issues.length ? "admin_only" : "public",
      publicAllowed: issues.length === 0,
      reason: issues[0] ?? "Storage object is public-safe.",
      blockingIssues: issues,
      warnings: [],
      metadata: {
        storageObjectId: storageObject.storageObjectId,
        accessLevel: storageObject.accessLevel,
      },
    });
  }

  async getLinkedAssetVisibility(
    assetId: string,
    entityType: MediaAssetLinkEntityType,
    entityId: string,
    fieldKey: MediaAssetLinkFieldKey,
  ): Promise<MediaAssetVisibilityState> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    return this.getAssetVisibility(asset.ok ? asset.data : null, { entityType, entityId, fieldKey, requireAssignment: true, allowAdminAssignment: true });
  }

  canDisplayAssetPublicly(asset: MediaAssetRecord | null | undefined, context: MediaAssetVisibilityContext = {}): boolean {
    return this.getAssetVisibility(asset, context).publicAllowed;
  }

  canUseAssetForField(asset: MediaAssetRecord, entityType: MediaAssetLinkEntityType, fieldKey: MediaAssetLinkFieldKey, context: MediaAssetVisibilityContext = {}): boolean {
    return this.getAssetVisibility(asset, { ...context, entityType, fieldKey, allowAdminAssignment: context.allowAdminAssignment ?? true }).publicAllowed;
  }

  getPublicSafeAssetUrl(asset: MediaAssetRecord | null | undefined, context: MediaAssetVisibilityContext = {}): string | undefined {
    const visibility = this.getAssetVisibility(asset, context);
    return getPublicSafeMediaUrl(asset, {
      publicAllowed: visibility.publicAllowed,
      allowFallback: context.allowFallback,
      fallbackUrl: context.fallbackUrl,
      allowAdminPreview: true,
      isAdminPreview: context.isAdminPreview,
      publicPlaybackAllowed: context.publicPlaybackAllowed,
    });
  }

  getFallbackOrPublicAssetUrl(asset: MediaAssetRecord | null | undefined, fallbackUrl: string | undefined, context: MediaAssetVisibilityContext = {}): string | undefined {
    return getFallbackOrPublicAssetUrl(asset, fallbackUrl, {
      publicAllowed: this.canDisplayAssetPublicly(asset, context),
      isAdminPreview: context.isAdminPreview,
      publicPlaybackAllowed: context.publicPlaybackAllowed,
    });
  }

  validateEntityAssetVisibility(entityType: MediaAssetLinkEntityType, entity: unknown, linkedAssets: MediaAssetRecord[] = []): MediaAssetVisibilityState[] {
    return linkedAssets.map((asset) => this.getAssetVisibility(asset, { entityType, entity, linkedEntityPublic: entityIsPublicSafe(entityType, entity) }));
  }

  validatePublicPageAssets(pageType: string, pageData: { assets?: MediaAssetRecord[] }): MediaAssetVisibilityState[] {
    return (pageData.assets ?? []).map((asset) => this.getAssetVisibility(asset, { entityType: "custom", entityId: pageType }));
  }

  getVisibilityBlockingIssues(asset: MediaAssetRecord | null | undefined, context: MediaAssetVisibilityContext = {}): string[] {
    return this.getAssetVisibility(asset, context).blockingIssues;
  }

  getVisibilityWarnings(asset: MediaAssetRecord | null | undefined, context: MediaAssetVisibilityContext = {}): string[] {
    return this.getAssetVisibility(asset, context).warnings;
  }

  getEntityPublicContext(entityType: MediaAssetLinkEntityType, entity: ArtistAdminRecord | SongReleaseAdminRecord | PublicGalleryItem | PublicSiteConfig | unknown): boolean {
    return entityIsPublicSafe(entityType, entity);
  }
}

export const mediaAssetVisibilityService = new MediaAssetVisibilityService();
