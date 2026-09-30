import type {
  ArtistAdminRecord,
  MediaAssetRecord,
  PublishingAction,
  PublishingActionType,
  PublishingEntityType,
  PublishingPublicVisibility,
  PublishingReadinessState,
  PublishingStatus,
  SongReleaseAdminRecord,
} from "../../models/admin";
import { isSafePublicMediaUrl } from "../../utils/media/publicSafeUrlUtils";

export interface PublishingWorkflowContext {
  artist?: Pick<ArtistAdminRecord, "status" | "artistId" | "displayName" | "slug"> | null;
  release?: Pick<SongReleaseAdminRecord, "status" | "releaseId" | "title" | "slug"> | null;
}

type EntityRecord = Record<string, unknown>;

const asRecord = (entity: unknown): EntityRecord => (entity && typeof entity === "object" ? entity as EntityRecord : {});
const text = (record: EntityRecord, key: string): string => String(record[key] ?? "").trim();
const bool = (record: EntityRecord, key: string): boolean => Boolean(record[key]);
const nestedRecord = (record: EntityRecord, key: string): EntityRecord => {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as EntityRecord : {};
};
const statusOf = (entityType: PublishingEntityType, record: EntityRecord): string => {
  if (entityType === "homepage_section") return bool(record, "enabled") ? "enabled" : "disabled";
  if (entityType === "seo_metadata") return bool(record, "noIndex") ? "no_index" : text(record, "status") || "needs_review";
  return text(record, "status") || "draft";
};

export const formatPublishingStatusLabel = (status: string): string =>
  status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatPublicVisibilityLabel = (visibility: PublishingPublicVisibility): string =>
  formatPublishingStatusLabel(visibility);

export const validatePublishingStatusTransition = (
  entityType: PublishingEntityType,
  fromStatus: string,
  toStatus: string,
): boolean => {
  const transitions: Record<PublishingEntityType, Array<[string, string]>> = {
    artist: [["draft", "active"], ["active", "archived"], ["archived", "active"], ["draft", "archived"]],
    release: [["draft", "published"], ["published", "archived"], ["archived", "published"], ["draft", "archived"]],
    media_asset: [["draft", "published"], ["published", "archived"], ["archived", "published"], ["draft", "archived"]],
    gallery_item: [["draft", "published"], ["published", "archived"], ["archived", "published"], ["draft", "archived"]],
    homepage_section: [["disabled", "enabled"], ["enabled", "disabled"]],
    seo_metadata: [["needs_review", "complete"], ["complete", "needs_review"], ["complete", "no_index"], ["needs_review", "no_index"], ["missing_required", "no_index"]],
    site_config: [["draft", "published"], ["published", "draft"]],
    custom: [],
  };
  return transitions[entityType]?.some(([from, to]) => from === fromStatus && to === toStatus) ?? false;
};

export const getPublishingMissingFields = (
  entityType: PublishingEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
): string[] => {
  const record = asRecord(entity);
  const missing: string[] = [];
  if (entityType === "artist") {
    if (!text(record, "displayName")) missing.push("Display Name");
    if (!text(record, "slug")) missing.push("Slug");
    if (!text(record, "bio")) missing.push("Bio");
  }
  if (entityType === "release") {
    if (!text(record, "title")) missing.push("Title");
    if (!text(record, "slug")) missing.push("Slug");
    if (!text(record, "artistId")) missing.push("Artist");
    if (!text(record, "releaseDate")) missing.push("Release Date");
    if (context.artist && context.artist.status !== "active") missing.push("Active Artist");
  }
  if (entityType === "media_asset") {
    if (!text(record, "title")) missing.push("Title");
    if (!text(record, "url")) missing.push("URL");
    if (!text(record, "assetType")) missing.push("Asset Type");
  }
  if (entityType === "gallery_item") {
    if (!text(record, "title")) missing.push("Title");
    if (!text(record, "slug")) missing.push("Slug");
    if (!text(record, "imageUrl") && !text(record, "mediaAssetId")) missing.push("Image Source");
    if (!text(record, "altText")) missing.push("Alt Text");
    if (context.artist && context.artist.status !== "active") missing.push("Public Artist Source");
    if (context.release && context.release.status !== "published") missing.push("Published Release Source");
  }
  if (entityType === "homepage_section") {
    if (!text(record, "sectionId")) missing.push("Section ID");
    if (!text(record, "sectionType")) missing.push("Section Type");
    if (!text(record, "sortOrder")) missing.push("Sort Order");
  }
  if (entityType === "seo_metadata") {
    if (!text(record, "seoTitle") && !text(record, "seoMetadata.title")) missing.push("SEO Title");
    if (!text(record, "seoDescription") && !text(record, "seoMetadata.description")) missing.push("SEO Description");
    const recordMissing = record.missingFields;
    if (Array.isArray(recordMissing)) {
      recordMissing.forEach((field) => {
        if (typeof field === "string" && !missing.includes(field)) missing.push(field);
      });
    }
  }
  return missing;
};

export const getPublishingBlockingIssues = (
  entityType: PublishingEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
): string[] => {
  const record = asRecord(entity);
  const issues: string[] = [];
  if (entityType === "release" && text(record, "artistId") && (!context.artist || context.artist.status !== "active")) {
    issues.push("Release cannot be public without an active artist.");
  }
  if (entityType === "gallery_item") {
    if (!text(record, "imageUrl") && !text(record, "mediaAssetId")) issues.push("Gallery item needs a valid image source.");
    if (context.artist && context.artist.status !== "active") issues.push("Gallery artist source is not public.");
    if (context.release && context.release.status !== "published") issues.push("Gallery release source is not public.");
  }
  if (entityType === "media_asset") {
    const url = text(record, "url");
    if (url && !isSafePublicMediaUrl(url)) issues.push("Media asset URL is not public-safe.");
    if (text(record, "assetType") === "full_song") {
      const metadata = nestedRecord(record, "metadata");
      const audio = nestedRecord(metadata, "audio");
      if (audio.publicPlaybackAllowed !== true) issues.push("Full song public playback is disabled.");
    }
    const metadata = nestedRecord(record, "metadata");
    const storage = nestedRecord(metadata, "storage");
    if (storage.accessLevel === "admin_only" || storage.accessLevel === "private") issues.push("Media asset storage is admin-only.");
  }
  if (entityType === "homepage_section" && text(record, "sectionType") === "custom" && bool(record, "enabled") && !text(record, "rawConfiguration")) {
    issues.push("Enabled custom sections need configuration.");
  }
  if (entityType === "seo_metadata" && (bool(record, "noIndex") || text(record, "status") === "draft" || text(record, "status") === "archived")) {
    issues.push("Metadata is not public-ready while no-index, draft, or archived.");
  }
  return issues;
};

export const getPublishingWarnings = (entityType: PublishingEntityType, entity: unknown): string[] => {
  const record = asRecord(entity);
  const warnings: string[] = [];
  if (entityType === "artist" && !text(record, "profileImage")) warnings.push("Profile image is missing.");
  if (entityType === "release" && !text(record, "coverArtUrl")) warnings.push("Cover art is missing.");
  if (entityType === "release" && !text(record, "audioPreviewUrl")) warnings.push("Audio preview is missing.");
  if (entityType === "media_asset" && !text(record, "altText")) warnings.push("Alt text is recommended for image assets.");
  if (entityType === "media_asset" && text(record, "status") !== "published") warnings.push("Draft or archived media assets are hidden from the public site.");
  if (entityType === "seo_metadata" && bool(record, "noIndex")) warnings.push("No-index is enabled.");
  return warnings;
};

export const getPublicVisibilityState = (
  entityType: PublishingEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
): PublishingPublicVisibility => {
  const record = asRecord(entity);
  const missing = getPublishingMissingFields(entityType, entity, context);
  const blocking = getPublishingBlockingIssues(entityType, entity, context);
  if (!Object.keys(record).length) return "unknown";
  if (blocking.length) return "blocked";
  if (entityType === "homepage_section") return bool(record, "enabled") ? (missing.length ? "needs_setup" : "public") : "hidden";
  if (entityType === "seo_metadata") return text(record, "publicPath") && !bool(record, "noIndex") && !missing.length ? "public" : "not_public";
  const status = statusOf(entityType, record);
  const publicStatus =
    (entityType === "artist" && status === "active") ||
    (entityType !== "artist" && ["published", "active"].includes(status));
  if (!publicStatus) return "not_public";
  return missing.length ? "needs_setup" : "public";
};

export const getPublishingReadinessState = (
  entityType: PublishingEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
): PublishingReadinessState => {
  const missing = getPublishingMissingFields(entityType, entity, context);
  const blocking = getPublishingBlockingIssues(entityType, entity, context);
  if (blocking.length) return "blocked";
  if (missing.length) return "missing_required_fields";
  const warnings = getPublishingWarnings(entityType, entity);
  return warnings.length ? "needs_review" : "ready";
};

export const getPublishingStatus = (
  entityType: PublishingEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
): PublishingStatus => {
  const record = asRecord(entity);
  const entityId =
    text(record, "artistId") ||
    text(record, "releaseId") ||
    text(record, "assetId") ||
    text(record, "galleryItemId") ||
    text(record, "sectionId") ||
    text(record, "metadataRecordId") ||
    text(record, "entityId") ||
    "unknown";
  return {
    entityType,
    entityId,
    currentStatus: statusOf(entityType, record),
    publicVisibility: getPublicVisibilityState(entityType, entity, context),
    readinessState: getPublishingReadinessState(entityType, entity, context),
    missingFields: getPublishingMissingFields(entityType, entity, context),
    warnings: getPublishingWarnings(entityType, entity),
    blockingIssues: getPublishingBlockingIssues(entityType, entity, context),
    updatedAt: text(record, "updatedAt") || undefined,
  };
};

const action = (
  status: PublishingStatus,
  actionType: PublishingActionType,
  toStatus: string,
  label: string,
  disabled = false,
  disabledReason?: string,
): PublishingAction => ({
  actionId: `${status.entityType}-${status.entityId}-${actionType}`,
  entityType: status.entityType,
  entityId: status.entityId,
  actionType,
  fromStatus: status.currentStatus,
  toStatus,
  label,
  requiresConfirmation: ["publish", "activate", "archive", "restore", "disable", "enable"].includes(actionType),
  requiresValidation: ["publish", "activate", "enable"].includes(actionType),
  disabled,
  disabledReason,
});

export const getAvailablePublishingActions = (status: PublishingStatus): PublishingAction[] => {
  const cannotPublish = status.readinessState === "blocked" || status.readinessState === "missing_required_fields";
  const publishDisabledReason = cannotPublish ? "Resolve blocking issues and required fields before publishing." : undefined;
  if (status.entityType === "homepage_section") {
    return status.currentStatus === "enabled"
      ? [action(status, "disable", "disabled", "Disable Section")]
      : [action(status, "enable", "enabled", "Enable Section", cannotPublish, publishDisabledReason)];
  }
  if (status.currentStatus === "archived") return [action(status, "restore", status.entityType === "artist" ? "active" : "published", "Restore")];
  if (status.currentStatus === "active" || status.currentStatus === "published" || status.currentStatus === "complete") {
    return [action(status, "archive", "archived", "Archive")];
  }
  const publishType = status.entityType === "artist" ? "activate" : "publish";
  const publishLabel = status.entityType === "artist" ? "Activate" : "Publish";
  return [
    action(status, "save_draft", "draft", "Save Draft"),
    action(status, publishType, status.entityType === "artist" ? "active" : "published", publishLabel, cannotPublish, publishDisabledReason),
    action(status, "archive", "archived", "Archive"),
  ];
};
