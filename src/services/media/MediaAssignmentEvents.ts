import type { MediaAssetRecord } from "../../models/admin";
import type { MediaAssetLinkEntityType, MediaAssetLinkFieldKey } from "../../models/media";

export const mediaAssignmentChangedEventName = "anm:media-asset-assignment-changed";
export const mediaReviewCountChangedEventName = "anm:media-review-count-changed";

export const countPendingMediaReviewItems = (items: Iterable<{ status: string }>): number =>
  [...items].filter((item) => item.status === "pending" || item.status === "in_review").length;

export const dispatchMediaReviewCountChanged = (items: Iterable<{ status: string }>): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(mediaReviewCountChangedEventName, { detail: { count: countPendingMediaReviewItems(items) } }));
};

export interface MediaAssignmentChangedDetail {
  assetId: string;
  entityType?: MediaAssetLinkEntityType;
  entityId?: string;
  fieldKey?: MediaAssetLinkFieldKey;
  mediaAsset?: MediaAssetRecord;
  source?: "media_review" | "asset_picker" | "media_library" | "system";
}

export const dispatchMediaAssignmentChanged = (detail: MediaAssignmentChangedDetail): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(mediaAssignmentChangedEventName, { detail }));
};
