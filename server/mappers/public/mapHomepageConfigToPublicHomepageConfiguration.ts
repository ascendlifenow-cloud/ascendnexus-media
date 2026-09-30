import type { HomepageContent } from "../../../src/models/homepage";

export interface PublicHomepageConfiguration extends HomepageContent {
  sections?: unknown[];
  galleryPreview?: unknown[];
  hero?: Record<string, unknown>;
  about?: Record<string, unknown>;
  cta?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export const mapHomepageConfigToPublicHomepageConfiguration = (content: HomepageContent & Partial<PublicHomepageConfiguration>): PublicHomepageConfiguration => ({
  ...content,
  metadata: { delivery: "public-safe" },
});
