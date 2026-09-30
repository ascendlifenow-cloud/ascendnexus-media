import type { SeoMetadata } from "../seo";
import type { SocialShareMetadata } from "../social";

export type AdminMetadataEntityType =
  | "site_default"
  | "page"
  | "artist"
  | "release"
  | "song"
  | "gallery"
  | "search"
  | "browse"
  | "custom";

export type AdminMetadataStatus =
  | "complete"
  | "needs_review"
  | "missing_required"
  | "no_index"
  | "draft"
  | "archived";

export interface AdminMetadataRecord {
  metadataRecordId: string;
  entityType: AdminMetadataEntityType;
  entityId?: string;
  entitySlug?: string;
  entityLabel: string;
  publicPath?: string;
  seoMetadata?: SeoMetadata;
  socialMetadata?: SocialShareMetadata;
  status: AdminMetadataStatus;
  missingFields: string[];
  noIndex: boolean;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
