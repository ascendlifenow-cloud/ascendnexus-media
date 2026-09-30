import type { MediaAssetRecord, MediaAssetType } from "../../models/admin";
import type {
  MediaAssignmentReviewItem,
  MediaAssignmentReviewState,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkIntendedUse,
  MediaCategory,
} from "../../models/media";
import { mediaAssetLinkingService } from "../../services/media/MediaAssetLinkingService";
import { getMediaCategoryFromAssetType } from "./mediaTypeUtils";

export type MediaReviewSortMode = "newest" | "oldest" | "asset_type" | "confidence" | "file_name";
export type MediaReviewStateFilter = "all" | MediaAssignmentReviewState;
export type MediaReviewCategoryFilter = "all" | MediaCategory;
export type MediaReviewAssetTypeFilter = "all" | MediaAssetType;

export interface MediaReviewFilters {
  searchQuery?: string;
  assignmentState?: MediaReviewStateFilter;
  mediaCategory?: MediaReviewCategoryFilter;
  assetType?: MediaReviewAssetTypeFilter;
  sortMode?: MediaReviewSortMode;
}

export interface MediaReviewQueueStats {
  pendingReview: number;
  suggestedAssignments: number;
  assignmentFailed: number;
  keptUnassigned: number;
  recentlyUploaded: number;
  audioAssets: number;
  imageAssets: number;
}

export interface MediaAssignmentSuggestion {
  suggestedEntityType?: MediaAssetLinkEntityType;
  suggestedEntityId?: string;
  suggestedFieldKey?: MediaAssetLinkFieldKey;
  suggestedIntendedUse?: MediaAssetLinkIntendedUse;
  confidence?: number;
  reason: string;
}

export interface MediaReviewAssignmentPayload {
  entityType: MediaAssetLinkEntityType;
  entityId: string;
  fieldKey: MediaAssetLinkFieldKey;
  intendedUse: MediaAssetLinkIntendedUse;
  replaceExisting: boolean;
}

const reviewItemId = (assetId: string): string => `media-review-${assetId}`;

const normalizeSearch = (value: string | null | undefined): string => (value ?? "").toLowerCase().trim();

const getOriginalFileName = (asset: MediaAssetRecord): string => {
  const original = asset.metadata?.originalFileName;
  return typeof original === "string" ? original : asset.title;
};

const slugish = (value: string): string => normalizeSearch(value).replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const getMediaAssignmentSuggestion = (asset: MediaAssetRecord): MediaAssignmentSuggestion => {
  const source = slugish(`${getOriginalFileName(asset)} ${asset.title} ${asset.assetType}`);
  if (asset.assetType === "cover_art" || source.includes("cover")) {
    return {
      suggestedEntityType: "release",
      suggestedEntityId: source.replace(/-?cover.*/, "") || undefined,
      suggestedFieldKey: "coverArtUrl",
      suggestedIntendedUse: "release_cover_art",
      confidence: source.includes("cover") ? 0.72 : 0.56,
      reason: "Filename or asset type looks like release cover art.",
    };
  }
  if (asset.assetType === "audio_preview" || source.includes("preview")) {
    return {
      suggestedEntityType: "release",
      suggestedEntityId: source.replace(/-?preview.*/, "") || undefined,
      suggestedFieldKey: "audioPreviewUrl",
      suggestedIntendedUse: "release_audio_preview",
      confidence: 0.68,
      reason: "Asset looks like an audio preview for a release.",
    };
  }
  if (asset.assetType === "full_song" || asset.assetType === "custom_audio") {
    return {
      suggestedEntityType: "release",
      suggestedEntityId: source.replace(/-?(full-song|song).*/, "") || undefined,
      suggestedFieldKey: "fullSongUrl",
      suggestedIntendedUse: "release_full_song",
      confidence: 0.62,
      reason: "Full song files usually attach to release records.",
    };
  }
  if (asset.assetType === "artist_profile" || source.includes("profile")) {
    return {
      suggestedEntityType: "artist",
      suggestedEntityId: source.replace(/-?profile.*/, "") || undefined,
      suggestedFieldKey: "profileImage",
      suggestedIntendedUse: "artist_profile_image",
      confidence: source.includes("profile") ? 0.74 : 0.58,
      reason: "Asset looks like an artist profile image.",
    };
  }
  if (asset.assetType === "artist_character_art" || source.includes("character")) {
    return {
      suggestedEntityType: "artist",
      suggestedEntityId: source.replace(/-?character.*/, "") || undefined,
      suggestedFieldKey: "characterArtUrl",
      suggestedIntendedUse: "artist_character_art",
      confidence: 0.66,
      reason: "Asset looks like artist character art.",
    };
  }
  if (asset.assetType === "artist_banner" || source.includes("banner")) {
    return {
      suggestedEntityType: "artist",
      suggestedEntityId: source.replace(/-?banner.*/, "") || undefined,
      suggestedFieldKey: "profileBannerUrl",
      suggestedIntendedUse: "artist_banner",
      confidence: 0.64,
      reason: "Asset looks like an artist banner.",
    };
  }
  if (asset.assetType === "gallery_image" || asset.assetType === "promo_graphic") {
    return {
      suggestedEntityType: "gallery_item",
      suggestedFieldKey: "imageUrl",
      suggestedIntendedUse: "gallery_image",
      confidence: 0.5,
      reason: "Image asset may belong in the public gallery.",
    };
  }
  if (asset.assetType === "logo") {
    return {
      suggestedEntityType: "site_config",
      suggestedEntityId: "site-settings",
      suggestedFieldKey: "brandLogoUrl",
      suggestedIntendedUse: "site_logo",
      confidence: 0.7,
      reason: "Logo assets usually attach to site settings.",
    };
  }
  if (asset.assetType === "social_preview") {
    return {
      suggestedEntityType: "social_metadata",
      suggestedFieldKey: "socialImageUrl",
      suggestedIntendedUse: "social_preview_image",
      confidence: 0.55,
      reason: "Social preview images can attach to metadata records.",
    };
  }
  return { confidence: 0.2, reason: "No confident assignment suggestion is available yet." };
};

export const getReviewItemStatus = (assignmentState: MediaAssignmentReviewState): MediaAssignmentReviewItem["status"] => {
  if (assignmentState === "assigned") return "resolved";
  if (assignmentState === "archived") return "archived";
  if (assignmentState === "kept_unassigned") return "ignored";
  return "pending";
};

export const buildReviewItemFromMediaAsset = (asset: MediaAssetRecord): MediaAssignmentReviewItem => {
  const suggestion = getMediaAssignmentSuggestion(asset);
  const assignmentState: MediaAssignmentReviewState = suggestion.suggestedEntityType ? "suggested_assignment" : "needs_review";
  return {
    reviewItemId: reviewItemId(asset.assetId),
    assetId: asset.assetId,
    asset,
    assignmentState,
    suggestedEntityType: suggestion.suggestedEntityType,
    suggestedEntityId: suggestion.suggestedEntityId,
    suggestedFieldKey: suggestion.suggestedFieldKey,
    suggestedIntendedUse: suggestion.suggestedIntendedUse,
    confidence: suggestion.confidence,
    status: getReviewItemStatus(assignmentState),
    reason: suggestion.reason,
    createdAt: asset.createdAt ?? new Date().toISOString(),
    updatedAt: asset.updatedAt,
    metadata: {
      originalFileName: getOriginalFileName(asset),
      mediaCategory: getMediaCategoryFromAssetType(asset.assetType),
      uploadedFrom: typeof asset.metadata?.uploadedFrom === "string" ? asset.metadata.uploadedFrom : null,
    },
  };
};

export const shouldIncludeAssetInReviewQueue = (asset: MediaAssetRecord): boolean => {
  if (String(asset.status) === "deleted") return false;
  if (asset.status === "archived") return false;
  if (asset.metadata?.assignmentStatus === "kept_unassigned" || asset.metadata?.assignmentReviewStatus === "resolved") return false;
  if (mediaAssetLinkingService.getAssetLinks(asset.assetId).some((link) => link.status === "active")) return false;
  const uploadedFrom = asset.metadata?.uploadedFrom;
  return (
    asset.metadata?.assignmentStatus === "unassigned" ||
    asset.status === "draft" ||
    uploadedFrom === "admin_media_library" ||
    uploadedFrom === "batch_upload" ||
    uploadedFrom === "admin_media_library_batch" ||
    asset.ownerType === "media_library" ||
    !asset.ownerId ||
    asset.ownerId === "unassigned" ||
    asset.metadata?.assignmentStatus === "assignment_failed" ||
    !asset.metadata?.intendedUse
  );
};

export const formatAssignmentState = (state: MediaAssignmentReviewState): string =>
  state.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatSuggestedAssignment = (item: MediaAssignmentReviewItem): string => {
  if (!item.suggestedEntityType || !item.suggestedFieldKey) return "No suggestion";
  const target = item.suggestedEntityId ? ` ${item.suggestedEntityId}` : "";
  return `${item.suggestedEntityType}${target} / ${item.suggestedFieldKey}`;
};

export const searchMediaReviewItems = (items: readonly MediaAssignmentReviewItem[], query: string): MediaAssignmentReviewItem[] => {
  const normalized = normalizeSearch(query);
  if (!normalized) return [...items];
  return items.filter((item) => {
    const category = getMediaCategoryFromAssetType(item.asset.assetType);
    return [
      item.asset.title,
      getOriginalFileName(item.asset),
      item.assetId,
      item.asset.assetType,
      category,
      item.suggestedEntityType,
      item.suggestedEntityId,
      item.suggestedIntendedUse,
    ].some((value) => normalizeSearch(value).includes(normalized));
  });
};

export const filterMediaReviewItems = (items: readonly MediaAssignmentReviewItem[], filters: MediaReviewFilters): MediaAssignmentReviewItem[] =>
  searchMediaReviewItems(items, filters.searchQuery ?? "")
    .filter((item) => filters.assignmentState && filters.assignmentState !== "all" ? item.assignmentState === filters.assignmentState : true)
    .filter((item) => filters.mediaCategory && filters.mediaCategory !== "all" ? getMediaCategoryFromAssetType(item.asset.assetType) === filters.mediaCategory : true)
    .filter((item) => filters.assetType && filters.assetType !== "all" ? item.asset.assetType === filters.assetType : true);

export const sortMediaReviewItems = (items: readonly MediaAssignmentReviewItem[], sortMode: MediaReviewSortMode = "newest"): MediaAssignmentReviewItem[] => {
  const sorted = [...items];
  if (sortMode === "oldest") return sorted.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (sortMode === "asset_type") return sorted.sort((a, b) => a.asset.assetType.localeCompare(b.asset.assetType));
  if (sortMode === "confidence") return sorted.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  if (sortMode === "file_name") return sorted.sort((a, b) => getOriginalFileName(a.asset).localeCompare(getOriginalFileName(b.asset)));
  return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
};

export const getMediaReviewQueueStats = (items: readonly MediaAssignmentReviewItem[]): MediaReviewQueueStats => ({
  pendingReview: items.filter((item) => item.status === "pending" || item.status === "in_review").length,
  suggestedAssignments: items.filter((item) => item.assignmentState === "suggested_assignment").length,
  assignmentFailed: items.filter((item) => item.assignmentState === "assignment_failed").length,
  keptUnassigned: items.filter((item) => item.assignmentState === "kept_unassigned").length,
  recentlyUploaded: items.filter((item) => Date.now() - Date.parse(item.createdAt) < 1000 * 60 * 60 * 24 * 7).length,
  audioAssets: items.filter((item) => getMediaCategoryFromAssetType(item.asset.assetType) === "audio").length,
  imageAssets: items.filter((item) => getMediaCategoryFromAssetType(item.asset.assetType) === "image").length,
});

export const buildReviewAssignmentPayload = (
  item: MediaAssignmentReviewItem,
  fallback: Partial<MediaReviewAssignmentPayload> = {},
): MediaReviewAssignmentPayload => ({
  entityType: fallback.entityType ?? item.suggestedEntityType ?? "custom",
  entityId: fallback.entityId ?? item.suggestedEntityId ?? "",
  fieldKey: fallback.fieldKey ?? item.suggestedFieldKey ?? "custom",
  intendedUse: fallback.intendedUse ?? item.suggestedIntendedUse ?? "custom",
  replaceExisting: fallback.replaceExisting ?? true,
});
