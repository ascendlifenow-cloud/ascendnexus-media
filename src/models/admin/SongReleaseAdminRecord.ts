import type { ReleaseExternalLinks, ReleaseStatus, FeaturedReleasePlacement } from "../release";
import type { SeoMetadata } from "../seo";
import type { SocialShareMetadata } from "../social";

export interface SongReleaseAdminRecord {
  releaseId: string;
  songId: string;
  artistId: string;
  title: string;
  slug: string;
  description?: string;
  lyrics?: string;
  coverArtUrl?: string;
  coverArtThumbnailUrl?: string;
  coverArtLargeUrl?: string;
  audioPreviewUrl?: string;
  releaseDate: string;
  genre: string;
  styleTags: string[];
  status: ReleaseStatus;
  externalLinks: ReleaseExternalLinks;
  featured?: boolean;
  featuredSortOrder?: number;
  featuredLabel?: string;
  featuredDescription?: string;
  featuredPlacement?: FeaturedReleasePlacement;
  seoMetadata?: SeoMetadata;
  socialMetadata?: SocialShareMetadata;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
