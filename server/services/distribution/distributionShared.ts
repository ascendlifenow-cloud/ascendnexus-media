import crypto from "node:crypto";
import type { DistributionDestination, DistributionPipelineStep } from "../../models/operations/OperationsModels";

export const nowIso = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const asString = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
export const asDestinations = (value: unknown): DistributionDestination[] => Array.isArray(value) ? value.filter((item): item is DistributionDestination => typeof item === "string") : ["website", "rss_feed", "search_index", "seo_index"];

const stepNames = [
  "Validate Asset",
  "Verify Rights",
  "Verify Publication Status",
  "Verify Artwork",
  "Verify Metadata",
  "Verify SEO",
  "Generate Platform Metadata",
  "Generate Platform Images",
  "Generate Captions",
  "Generate Hashtags",
  "Generate Descriptions",
  "Generate Titles",
  "Generate Thumbnails",
  "Generate Social Variants",
  "Upload",
  "Verify Upload",
  "Store Platform IDs",
  "Monitor Status",
  "Retry Failures",
  "Record Analytics Baseline",
  "Complete Distribution",
] as const;

export const buildDistributionPipeline = (): DistributionPipelineStep[] => stepNames.map((name) => ({
  stepId: name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  name,
  status: "pending",
  required: !["Generate Captions", "Generate Hashtags", "Monitor Status", "Retry Failures"].includes(name),
  blockingIssues: [],
  warnings: [],
}));

export const supportedDistributionDestinations: DistributionDestination[] = [
  "website",
  "homepage",
  "artist_pages",
  "release_pages",
  "gallery",
  "rss_feed",
  "search_index",
  "seo_index",
  "newsletter",
  "email_campaigns",
  "youtube",
  "youtube_shorts",
  "instagram",
  "instagram_reels",
  "facebook",
  "threads",
  "tiktok",
  "spotify",
  "apple_music",
  "amazon_music",
  "soundcloud",
  "bandcamp",
  "discord",
  "patreon",
  "x",
  "pinterest",
  "mastodon",
  "podcast_platforms",
  "future_platform",
];
