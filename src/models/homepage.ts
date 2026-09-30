import type { ArtistPublicProfile } from "./artist";
import type { PublicSongRelease } from "./release";

export type HomepageSectionType =
  | "hero"
  | "featured_release"
  | "latest_releases"
  | "artist_spotlight"
  | "about"
  | "explore_artists_cta"
  | "gallery_preview"
  | "custom";

export interface HomepageSectionConfig {
  sectionId: string;
  sectionType: HomepageSectionType;
  enabled: boolean;
  sortOrder?: number;
  title?: string;
  subtitle?: string;
  configuration?: Record<string, string | number | boolean | null>;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ArtistReleaseGroup {
  artist: ArtistPublicProfile;
  releases: PublicSongRelease[];
}

export interface ArtistSpotlightItem {
  artist: ArtistPublicProfile;
  latestRelease?: PublicSongRelease;
  primaryGenre?: string;
  styleTags: string[];
}

export interface FeaturedReleaseItem {
  release: PublicSongRelease;
  artist: ArtistPublicProfile;
}

export interface HomepageContent {
  artists: ArtistPublicProfile[];
  featuredRelease?: FeaturedReleaseItem;
  featuredArtists: ArtistPublicProfile[];
  spotlightArtists: ArtistSpotlightItem[];
  releaseGroups: ArtistReleaseGroup[];
}
