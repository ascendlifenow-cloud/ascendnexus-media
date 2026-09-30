export type SeoMetadataType = "website" | "artist" | "song" | "gallery" | "search" | "browse" | "custom";

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalPath?: string;
  imageUrl?: string;
  imageAlt?: string;
  type?: SeoMetadataType;
  keywords?: string[];
  noIndex?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SiteSeoDefaults {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultImage: string;
  basePath: string;
}
