export interface MediaPublicationLockRecord {
  lockId: string;
  entityType: string;
  entityId: string;
  publicationOperationId: string;
  status: "active" | "released" | "expired";
  acquiredAt: string;
  expiresAt: string;
  releasedAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
