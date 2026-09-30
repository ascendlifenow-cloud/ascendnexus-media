export interface SiteConfigurationRecord {
  siteConfigId: string;
  version: number;
  status: "draft" | "published" | "archived";
  publicationState: string;
  publicVisibility?: "public" | "pending_publication" | "not_public" | "blocked" | "rolled_back" | "unknown";
  siteName: string;
  siteDescription: string;
  brandLogoUrl?: string;
  defaultCoverArtUrl?: string;
  defaultArtistImageUrl?: string;
  defaultSocialImageUrl?: string;
  navigation: Array<Record<string, unknown>>;
  footer: Record<string, unknown>;
  socialLinks: Record<string, string>;
  contactSettings: Record<string, unknown>;
  theme: Record<string, unknown>;
  analyticsPublicConfig?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
