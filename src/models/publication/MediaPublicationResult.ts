import type { MediaPublicationEntityType } from "./MediaPublicationOperation";

export type MediaPublicationVisibility = "public" | "pending_publication" | "not_public" | "blocked" | "partially_public" | "rolled_back" | "unknown";

export interface MediaPublicationResult {
  success: boolean;
  publicationOperationId: string;
  entityType: MediaPublicationEntityType;
  entityId: string;
  publicVisibility: MediaPublicationVisibility;
  publishedAssets: string[];
  skippedAssets: string[];
  failedAssets: string[];
  publicUrls: Record<string, string>;
  syncReport?: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  metadata?: Record<string, unknown>;
}
