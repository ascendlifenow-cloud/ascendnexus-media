export type AdminAuditEventType =
  | "content"
  | "publishing"
  | "media"
  | "gallery"
  | "homepage"
  | "metadata"
  | "settings"
  | "preview"
  | "auth"
  | "system"
  | "custom";

export type AdminAuditActionType =
  | "create"
  | "update"
  | "delete"
  | "save_draft"
  | "publish"
  | "activate"
  | "archive"
  | "restore"
  | "enable"
  | "disable"
  | "preview"
  | "validate"
  | "upload"
  | "replace"
  | "settings_update"
  | "metadata_update"
  | "custom";

export type AdminAuditEntityType =
  | "artist"
  | "release"
  | "media_asset"
  | "gallery_item"
  | "homepage_section"
  | "seo_metadata"
  | "site_config"
  | "user"
  | "system"
  | "custom";

export type AdminAuditSnapshotValue =
  | string
  | number
  | boolean
  | null
  | AdminAuditSnapshotValue[]
  | { [key: string]: AdminAuditSnapshotValue };

export type AdminAuditSnapshot = Record<string, AdminAuditSnapshotValue>;

export interface AdminAuditEvent {
  auditEventId: string;
  eventType: AdminAuditEventType;
  actionType: AdminAuditActionType;
  entityType: AdminAuditEntityType;
  entityId?: string;
  entityLabel?: string;
  entitySlug?: string;
  userId?: string;
  userDisplayName?: string;
  route?: string;
  summary: string;
  before?: AdminAuditSnapshot;
  after?: AdminAuditSnapshot;
  metadata?: AdminAuditSnapshot;
  createdAt: string;
}

export interface CreateAdminAuditEventInput extends Omit<AdminAuditEvent, "auditEventId" | "createdAt" | "before" | "after" | "metadata"> {
  auditEventId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  createdAt?: string;
}
