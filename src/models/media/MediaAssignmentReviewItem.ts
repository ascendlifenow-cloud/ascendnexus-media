import type { MediaAssetMetadataValue, MediaAssetRecord } from "../admin";
import type { MediaAssetLinkEntityType, MediaAssetLinkFieldKey, MediaAssetLinkIntendedUse } from "./MediaAssetLink";

export type MediaAssignmentReviewState =
  | "unassigned"
  | "needs_review"
  | "suggested_assignment"
  | "assignment_failed"
  | "kept_unassigned"
  | "assigned"
  | "archived";

export type MediaAssignmentReviewStatus = "pending" | "in_review" | "resolved" | "ignored" | "archived";

export interface MediaAssignmentReviewItem {
  reviewItemId: string;
  assetId: string;
  asset: MediaAssetRecord;
  assignmentState: MediaAssignmentReviewState;
  suggestedEntityType?: MediaAssetLinkEntityType;
  suggestedEntityId?: string;
  suggestedFieldKey?: MediaAssetLinkFieldKey;
  suggestedIntendedUse?: MediaAssetLinkIntendedUse;
  confidence?: number;
  status: MediaAssignmentReviewStatus;
  reason: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, MediaAssetMetadataValue>;
}
