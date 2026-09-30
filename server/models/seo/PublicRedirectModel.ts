export interface PublicRedirectRecord {
  redirectId: string;
  sourcePath: string;
  targetPath: string;
  statusCode: 301 | 302 | 307 | 308;
  reason: string;
  entityType?: "artist" | "release" | "gallery_item" | "page";
  entityId?: string;
  active: boolean;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
