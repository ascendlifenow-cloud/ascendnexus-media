import type { ArtistExternalLinks } from "../artist";
import type { SeoMetadata, SiteSeoDefaults } from "../seo";

export type HomepageSectionType =
  | "hero"
  | "featured_release"
  | "latest_releases"
  | "artist_spotlight"
  | "about"
  | "explore_artists_cta"
  | "gallery_preview"
  | "custom";

export interface PublicSiteConfigSection {
  sectionId: string;
  sectionType: HomepageSectionType;
  enabled: boolean;
  sortOrder: number;
  title?: string;
  subtitle?: string;
  configuration: Record<string, string | number | boolean | null>;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PublicSiteNavigationLink {
  label: string;
  href: string;
  enabled: boolean;
  sortOrder: number;
  external?: boolean;
}

export interface PublicSiteThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  logoVariant?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PublicSiteConfig {
  siteName: string;
  siteDescription: string;
  brandLogoUrl?: string;
  defaultCoverArtUrl?: string;
  defaultArtistImageUrl?: string;
  defaultSocialImageUrl?: string;
  homepageSections: PublicSiteConfigSection[];
  navigationLinks: PublicSiteNavigationLink[];
  footerLinks: PublicSiteNavigationLink[];
  socialLinks: ArtistExternalLinks;
  seoDefaults: SiteSeoDefaults | SeoMetadata;
  contactEmail?: string;
  contactCtaText?: string;
  newsletterEnabled?: boolean;
  contactPageEnabled?: boolean;
  themeConfig?: PublicSiteThemeConfig;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
