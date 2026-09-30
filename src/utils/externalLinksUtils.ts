import type { ExternalLink, ExternalLinkPlatform, ExternalLinkType } from "../models/ExternalLink";

export type ExternalLinksRecord = Record<string, string | ExternalLink | null | undefined>;
export type ExternalLinksInput = readonly ExternalLink[] | object | null | undefined;

const platformAliases: Record<string, ExternalLinkPlatform> = {
  soundCloud: "soundcloud",
  soundcloud: "soundcloud",
  tikTok: "tiktok",
  tiktok: "tiktok",
  customUrl: "custom",
};

const platformLabels: Record<string, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtube: "YouTube",
  suno: "Suno",
  soundcloud: "SoundCloud",
  tiktok: "TikTok",
  instagram: "Instagram",
  website: "Website",
  email: "Email",
  custom: "Custom Link",
};

const platformTypes: Record<string, ExternalLinkType> = {
  spotify: "streaming",
  appleMusic: "streaming",
  youtube: "video",
  suno: "streaming",
  soundcloud: "streaming",
  tiktok: "social",
  instagram: "social",
  website: "website",
  email: "website",
  custom: "custom",
};

export const normalizeExternalLinkPlatform = (platform: string): ExternalLinkPlatform =>
  platformAliases[platform] ?? platform;

export const isValidExternalUrl = (url: unknown): url is string => {
  if (typeof url !== "string") return false;
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return false;

  try {
    const parsedUrl = new URL(trimmedUrl);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "mailto:";
  } catch {
    return false;
  }
};

export const getPlatformLabel = (platform: string): string =>
  platformLabels[normalizeExternalLinkPlatform(platform)] ?? platformLabels[platform] ?? "External Link";

export const getExternalLinkLabel = (linkOrPlatform: ExternalLink | string): string => {
  if (typeof linkOrPlatform === "string") return getPlatformLabel(linkOrPlatform);
  return linkOrPlatform.label?.trim() || getPlatformLabel(linkOrPlatform.platform);
};

export const getExternalLinkType = (platform: string): ExternalLinkType =>
  platformTypes[normalizeExternalLinkPlatform(platform)] ?? "custom";

export const normalizeExternalLink = (link: ExternalLink | string, platform = "custom", sortOrder?: number): ExternalLink | null => {
  if (typeof link === "string") {
    const normalizedPlatform = normalizeExternalLinkPlatform(platform);
    return {
      platform: normalizedPlatform,
      url: link,
      sortOrder,
      type: getExternalLinkType(normalizedPlatform),
    };
  }

  const normalizedPlatform = normalizeExternalLinkPlatform(link.platform || platform);
  return {
    ...link,
    platform: normalizedPlatform,
    label: link.label?.trim() || undefined,
    url: link.url,
    sortOrder: link.sortOrder ?? sortOrder,
    type: link.type ?? getExternalLinkType(normalizedPlatform),
  };
};

export const normalizeExternalLinks = (links: ExternalLinksInput): ExternalLink[] => {
  if (!links) return [];

  if (Array.isArray(links)) {
    return links.map((link, index) => normalizeExternalLink(link, link.platform, link.sortOrder ?? index)).filter((link): link is ExternalLink => Boolean(link));
  }

  return Object.entries(links as ExternalLinksRecord)
    .map(([platform, value], index) => {
      if (!value) return null;
      return normalizeExternalLink(value, platform, index);
    })
    .filter((link): link is ExternalLink => Boolean(link));
};

export const filterEnabledExternalLinks = (links: ExternalLinksInput): ExternalLink[] => {
  const seenUrls = new Set<string>();

  return normalizeExternalLinks(links).filter((link) => {
    if (link.enabled === false || !isValidExternalUrl(link.url)) return false;
    const normalizedUrl = link.url.trim();
    if (seenUrls.has(normalizedUrl)) return false;
    seenUrls.add(normalizedUrl);
    return true;
  });
};

export const sortExternalLinks = (links: readonly ExternalLink[]): ExternalLink[] =>
  [...links].sort((a, b) => {
    const sortOrderA = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const sortOrderB = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;
    return getExternalLinkLabel(a).localeCompare(getExternalLinkLabel(b));
  });

export const getVisibleExternalLinks = (links: ExternalLinksInput): ExternalLink[] =>
  sortExternalLinks(filterEnabledExternalLinks(links));
