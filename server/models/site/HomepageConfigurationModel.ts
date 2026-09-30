export interface HomepageConfigurationRecord {
  homepageConfigId: string;
  version: number;
  status: "draft" | "published" | "archived";
  publicationState: string;
  publicVisibility?: "public" | "pending_publication" | "not_public" | "blocked" | "rolled_back" | "unknown";
  sections: Array<Record<string, unknown>>;
  hero?: Record<string, unknown>;
  featuredReleaseIds: string[];
  artistSpotlightIds: string[];
  galleryItemIds: string[];
  about?: Record<string, unknown>;
  cta?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
