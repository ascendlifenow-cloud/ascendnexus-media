export type ReleaseStatus = "draft" | "published" | "archived";
export type FeaturedReleasePlacement = "homepage" | "artist" | "browse" | "search" | "global" | "custom";

export interface ReleaseExternalLinks {
  spotify?: string;
  appleMusic?: string;
  youtube?: string;
  suno?: string;
  soundCloud?: string;
  tikTok?: string;
  instagram?: string;
  website?: string;
  customUrl?: string;
}

export interface PublicSongRelease {
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
  featuredStartDate?: string;
  featuredEndDate?: string;
  featuredPlacement?: FeaturedReleasePlacement;
  promoImageUrl?: string;
}

export interface PublicSongDetail {
  song: PublicSongRelease;
  artist?: import("./artist").ArtistPublicProfile;
  moreReleases: PublicSongRelease[];
}
