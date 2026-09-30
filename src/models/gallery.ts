export type GallerySourceType = "artist" | "release" | "promo" | "video" | "custom";
export type GalleryMediaType = "image" | "cover_art" | "artist_profile" | "promo_graphic" | "video_thumbnail" | "custom";
export type GalleryStatus = "published" | "draft" | "archived";
export type GalleryFilter = "all" | "cover_art" | "artist_profile" | "promo_graphic" | "video_thumbnail";

export interface PublicGalleryItem {
  galleryItemId: string;
  sourceType: GallerySourceType;
  sourceId: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  altText?: string;
  artistId?: string;
  releaseId?: string;
  mediaType: GalleryMediaType;
  status: GalleryStatus;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
