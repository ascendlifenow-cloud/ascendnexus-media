export type PublishingEntityType =
  | "artist"
  | "release"
  | "media_asset"
  | "gallery_item"
  | "homepage_section"
  | "seo_metadata"
  | "site_config"
  | "custom";

export type PublishingPublicVisibility = "public" | "not_public" | "hidden" | "needs_setup" | "blocked" | "unknown";
export type PublishingReadinessState = "ready" | "needs_review" | "missing_required_fields" | "invalid" | "blocked" | "unknown";
export type PublishingActionType =
  | "save_draft"
  | "publish"
  | "activate"
  | "archive"
  | "restore"
  | "unpublish"
  | "disable"
  | "enable"
  | "custom";

export interface PublishingStatus {
  entityType: PublishingEntityType;
  entityId: string;
  currentStatus: string;
  targetStatus?: string;
  publicVisibility: PublishingPublicVisibility;
  readinessState: PublishingReadinessState;
  missingFields: string[];
  warnings: string[];
  blockingIssues: string[];
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PublishingAction {
  actionId: string;
  entityType: PublishingEntityType;
  entityId: string;
  actionType: PublishingActionType;
  fromStatus: string;
  toStatus: string;
  label: string;
  requiresConfirmation: boolean;
  requiresValidation: boolean;
  disabled: boolean;
  disabledReason?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PublishingAuditEvent {
  auditEventId: string;
  entityType: PublishingEntityType;
  entityId: string;
  actionType: PublishingActionType;
  fromStatus: string;
  toStatus: string;
  userId?: string;
  timestamp: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PublishingPermissions {
  canPublish: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canEditDraft: boolean;
  canManageSettings: boolean;
}

export const defaultPublishingPermissions: PublishingPermissions = {
  canPublish: true,
  canArchive: true,
  canRestore: true,
  canEditDraft: true,
  canManageSettings: true,
};
