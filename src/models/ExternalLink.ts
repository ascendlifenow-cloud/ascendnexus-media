export type ExternalLinkPlatform =
  | "spotify"
  | "appleMusic"
  | "youtube"
  | "suno"
  | "soundcloud"
  | "tiktok"
  | "instagram"
  | "website"
  | "email"
  | "custom"
  | string;

export type ExternalLinkType = "streaming" | "social" | "video" | "website" | "custom";

export interface ExternalLink {
  platform: ExternalLinkPlatform;
  label?: string;
  url: string;
  enabled?: boolean;
  sortOrder?: number;
  type?: ExternalLinkType;
  metadata?: Record<string, string | number | boolean>;
}
