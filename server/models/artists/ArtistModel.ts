export type ArtistRecordStatus = "draft" | "active" | "archived" | "deleted";
export type ArtistPublicationState = "draft" | "processing" | "ready_to_publish" | "publishing" | "published" | "publish_failed" | "unpublishing" | "archived";

export interface ArtistRecord {
  artistId: string;
  name: string;
  displayName: string;
  slug: string;
  shortBio?: string;
  bio: string;
  status: ArtistRecordStatus;
  genres: string[];
  styleTags: string[];
  profileImage?: string;
  profileThumbnailUrl?: string;
  profileBannerUrl?: string;
  publicCharacterArtUrl?: string;
  sortOrder: number;
  featured: boolean;
  externalLinks: Record<string, string>;
  publicationState: ArtistPublicationState;
  publicVisibility: boolean;
  seoMetadataId?: string;
  socialMetadataId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  archivedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  previousStatus?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
