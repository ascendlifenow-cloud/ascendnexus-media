import type { ArtistExternalLinks } from "../artist";
import type { SeoMetadata } from "../seo";
import type { SocialShareMetadata } from "../social";

export type ArtistAdminStatus = "draft" | "active" | "archived";

export interface ArtistAdminRecord {
  artistId: string;
  name: string;
  slug: string;
  displayName: string;
  bio: string;
  shortBio?: string;
  profileImage: string;
  profileThumbnailUrl?: string;
  profileBannerUrl?: string;
  status: ArtistAdminStatus;
  sortOrder: number;
  genres?: string[];
  styleTags?: string[];
  externalLinks?: ArtistExternalLinks;
  seoMetadata?: SeoMetadata;
  socialMetadata?: SocialShareMetadata;
  featured?: boolean;
  featuredSortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
