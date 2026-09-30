import type { ArtistPublicProfile } from "./artist";
import type { PublicGalleryItem } from "./gallery";
import type { PublicSongRelease } from "./release";

export type GuestAccessLevel =
  | "public"
  | "guest_preview"
  | "member_preview"
  | "premium_member"
  | "admin_only"
  | "private";

export interface GuestAccessPolicy {
  accessLevel: GuestAccessLevel;
  previewAvailable: boolean;
  requiresAccount: boolean;
  requiresMembership: boolean;
  reason?: string;
}

export interface PublicLandingHero {
  headline: string;
  subheadline: string;
  body?: string;
  imageUrl?: string;
  primaryCta: PublicLandingCta;
  secondaryCta?: PublicLandingCta;
}

export interface PublicLandingCta {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
}

export interface PublicLandingReleaseCard {
  release: PublicSongRelease;
  artist?: ArtistPublicProfile;
  access: GuestAccessPolicy;
}

export interface PublicLandingArtistCard {
  artist: ArtistPublicProfile;
  latestRelease?: PublicSongRelease;
  access: GuestAccessPolicy;
}

export interface PublicLandingGalleryCard {
  item: PublicGalleryItem;
  access: GuestAccessPolicy;
}

export interface PublicLandingMembershipTeaser {
  headline: string;
  body: string;
  loginHref: string;
  registerHref: string;
  status: "available" | "readiness" | "disabled";
}

export interface PublicLandingSectionState {
  key: string;
  title: string;
  enabled: boolean;
  itemCount: number;
}

export interface PublicLandingExperience {
  version: string;
  generatedAt: string;
  site: {
    siteName: string;
    siteDescription?: string;
  };
  hero: PublicLandingHero;
  latestReleases: PublicLandingReleaseCard[];
  featuredReleases: PublicLandingReleaseCard[];
  featuredArtists: PublicLandingArtistCard[];
  guestPreviews: PublicLandingReleaseCard[];
  galleryPreview: PublicLandingGalleryCard[];
  discovery: {
    genres: string[];
    styleTags: string[];
    routes: PublicLandingCta[];
  };
  membershipTeaser: PublicLandingMembershipTeaser;
  sectionStates: PublicLandingSectionState[];
  safety: {
    publicSafe: boolean;
    checkedAt: string;
  };
}
