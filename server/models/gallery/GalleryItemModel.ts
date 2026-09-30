export type GalleryItemStatus = "draft" | "published" | "archived" | "deleted";
export type GalleryPublicationState = "draft" | "processing" | "ready_to_publish" | "publishing" | "published" | "publish_failed" | "unpublishing" | "archived";

export interface GalleryItemRecord {
  galleryItemId: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  mediaType: string;
  sourceType: string;
  sourceId?: string;
  artistId?: string;
  releaseId?: string;
  sortOrder: number;
  status: GalleryItemStatus;
  publicationState: GalleryPublicationState;
  publicVisibility: boolean;
  seoMetadataId?: string;
  socialMetadataId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  deletedAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
