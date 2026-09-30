export type SocialShareType = "website" | "music.song" | "profile" | "article" | "gallery" | "custom";
export type TwitterCardType = "summary" | "summary_large_image" | "player";

export interface SocialShareMetadata {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt?: string;
  url?: string;
  type?: SocialShareType;
  siteName?: string;
  twitterCard?: TwitterCardType;
  twitterSite?: string;
  twitterCreator?: string;
  audioUrl?: string;
  musician?: string;
  releaseDate?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SocialShareDefaults {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultType: SocialShareType;
  defaultTwitterCard: TwitterCardType;
  defaultImage: string;
  siteBaseUrl: string;
}
