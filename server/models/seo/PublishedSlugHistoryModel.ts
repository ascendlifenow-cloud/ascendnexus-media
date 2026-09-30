export interface PublishedSlugHistoryRecord {
  slugHistoryId: string;
  entityType: "artist" | "release" | "gallery_item";
  entityId: string;
  oldSlug: string;
  newSlug: string;
  oldPath: string;
  newPath: string;
  redirectId?: string;
  status: "active" | "superseded" | "archived";
  changedAt: string;
  changedBy?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
