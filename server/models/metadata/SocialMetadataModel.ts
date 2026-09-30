export interface SocialMetadataRecord {
  socialMetadataId: string;
  entityType: string;
  entityId?: string;
  path?: string;
  title: string;
  description: string;
  imageAssetId?: string;
  imageUrl?: string;
  imageAlt?: string;
  openGraph: Record<string, unknown>;
  twitterCard: Record<string, unknown>;
  status: "draft" | "published" | "archived" | "deleted";
  publicationState?: "draft" | "ready_to_publish" | "publishing" | "published" | "publish_failed" | "archived";
  publicVisibility?: "public" | "pending_publication" | "not_public" | "blocked" | "unknown";
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
