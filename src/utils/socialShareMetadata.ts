import fallbackCoverArt from "../assets/fallbacks/ascend-nexus-cover-fallback.png";
import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import type { SeoMetadata } from "../models/seo";
import type { SocialShareDefaults, SocialShareMetadata, SocialShareType } from "../models/social";
import { isValidArtistImageUrl } from "./artistImageUtils";
import { isValidCoverArtUrl } from "./coverArtUtils";
import { isSafePublicMediaUrl } from "./media/publicSafeUrlUtils";
import { mediaCdnService } from "../services/media";

const MAX_SOCIAL_DESCRIPTION_LENGTH = 200;

const socialSeoDefaults = {
  siteName: "Ascend Nexus Media",
  defaultTitle: "Ascend Nexus Media | AI Persona Artists & Original Music",
  defaultDescription:
    "Discover Ascend Nexus Media, a creative home for AI Persona Artists, original songs, cover art, visual storytelling, and evolving digital music experiences.",
  basePath: "",
};

export const socialShareDefaults: SocialShareDefaults = {
  siteName: socialSeoDefaults.siteName,
  defaultTitle: socialSeoDefaults.defaultTitle,
  defaultDescription: socialSeoDefaults.defaultDescription,
  defaultType: "website",
  defaultTwitterCard: "summary_large_image",
  defaultImage: fallbackCoverArt,
  siteBaseUrl: import.meta.env.VITE_PUBLIC_SITE_URL ?? socialSeoDefaults.basePath,
};

export const sanitizeSocialText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

export const truncateSocialDescription = (
  value: string | null | undefined,
  maxLength = MAX_SOCIAL_DESCRIPTION_LENGTH,
): string => {
  const text = sanitizeSocialText(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength - 1).trimEnd();
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 90 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
};

const buildSocialPageTitle = (title: string | null | undefined, siteName = socialSeoDefaults.siteName): string => {
  const cleanTitle = sanitizeSocialText(title);
  if (!cleanTitle) return socialSeoDefaults.defaultTitle;
  if (cleanTitle.toLowerCase().includes(siteName.toLowerCase())) return cleanTitle;
  return `${cleanTitle} | ${siteName}`;
};

export const isSafePublicUrl = (url: string | null | undefined): boolean => {
  const value = sanitizeSocialText(url);
  return isSafePublicMediaUrl(value);
};

export const isValidSocialImageUrl = (url: string | null | undefined): boolean => {
  const value = sanitizeSocialText(url);
  if (!isSafePublicUrl(value)) return false;
  return value.startsWith("data:image/") || isValidCoverArtUrl(value) || isValidArtistImageUrl(value);
};

const getRuntimeOrigin = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

const joinUrl = (baseUrl: string, path: string): string => {
  const base = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

export const resolveSocialUrl = (pathOrUrl: string | null | undefined): string | undefined => {
  const value = sanitizeSocialText(pathOrUrl);
  if (!value || /^javascript:/i.test(value)) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const baseUrl = sanitizeSocialText(socialShareDefaults.siteBaseUrl) || getRuntimeOrigin();
  return baseUrl ? joinUrl(baseUrl, value) : value;
};

export const getSocialPreviewImage = (...candidates: Array<string | null | undefined>): string => {
  const validCandidate = candidates.map((candidate) => mediaCdnService.normalizePublicMediaUrl(sanitizeSocialText(candidate))).find(isValidSocialImageUrl);
  return resolveSocialUrl(validCandidate ?? socialShareDefaults.defaultImage) ?? socialShareDefaults.defaultImage;
};

const getSocialTypeFromSeoType = (type: SeoMetadata["type"]): SocialShareType => {
  if (type === "artist") return "profile";
  if (type === "song") return "music.song";
  if (type === "gallery") return "gallery";
  return "website";
};

const normalizeSocialType = (
  type: SocialShareMetadata["type"] | SeoMetadata["type"] | undefined,
  fallback: SocialShareType,
): SocialShareType => {
  if (type === "music.song" || type === "profile" || type === "article" || type === "gallery" || type === "custom") {
    return type;
  }
  if (type === "website") return "website";
  return fallback;
};

export const buildSocialShareMetadata = (
  metadata: Partial<SocialShareMetadata> | Partial<SeoMetadata> = {},
): SocialShareMetadata => {
  const seoLikeMetadata = metadata as Partial<SeoMetadata>;
  const socialLikeMetadata = metadata as Partial<SocialShareMetadata>;
  const title = sanitizeSocialText(socialLikeMetadata.title || seoLikeMetadata.title) || socialShareDefaults.defaultTitle;
  const description =
    truncateSocialDescription(socialLikeMetadata.description || seoLikeMetadata.description) ||
    truncateSocialDescription(socialShareDefaults.defaultDescription);
  const imageUrl = getSocialPreviewImage(socialLikeMetadata.imageUrl || seoLikeMetadata.imageUrl);
  const type = normalizeSocialType(socialLikeMetadata.type ?? seoLikeMetadata.type, getSocialTypeFromSeoType(seoLikeMetadata.type));

  return {
    title,
    description,
    imageUrl,
    imageAlt:
      sanitizeSocialText(socialLikeMetadata.imageAlt || seoLikeMetadata.imageAlt) || `${socialShareDefaults.siteName} preview image`,
    url: resolveSocialUrl(socialLikeMetadata.url || seoLikeMetadata.canonicalPath),
    type,
    siteName: socialLikeMetadata.siteName || socialShareDefaults.siteName,
    twitterCard: socialLikeMetadata.twitterCard || socialShareDefaults.defaultTwitterCard,
    twitterSite: socialLikeMetadata.twitterSite,
    twitterCreator: socialLikeMetadata.twitterCreator,
    audioUrl: isSafePublicUrl(socialLikeMetadata.audioUrl) ? resolveSocialUrl(socialLikeMetadata.audioUrl) : undefined,
    musician: sanitizeSocialText(socialLikeMetadata.musician),
    releaseDate: sanitizeSocialText(socialLikeMetadata.releaseDate),
    metadata: socialLikeMetadata.metadata || seoLikeMetadata.metadata,
  };
};

export const buildHomepageSocialMetadata = (): SocialShareMetadata =>
  buildSocialShareMetadata({
    title: socialShareDefaults.defaultTitle,
    description: "Discover AI Persona Artists, latest releases, original music, cover art, and visual storytelling from Ascend Nexus Media.",
    imageUrl: socialShareDefaults.defaultImage,
    url: "/",
    type: "website",
  });

export const buildArtistSocialMetadata = (artist: ArtistPublicProfile | null | undefined): SocialShareMetadata => {
  if (!artist) {
    return buildSocialShareMetadata({
      title: "Artist Not Found",
      description: "The requested Ascend Nexus Media artist could not be found.",
      type: "profile",
    });
  }

  return buildSocialShareMetadata({
    title: buildSocialPageTitle(artist.displayName),
    description: artist.bio || `Explore ${artist.displayName}, an AI Persona Artist from Ascend Nexus Media.`,
    imageUrl: getSocialPreviewImage(isValidArtistImageUrl(artist.profileImage) ? artist.profileImage : undefined),
    imageAlt: `${artist.displayName} artist profile image`,
    url: `/artists/${artist.slug}`,
    type: "profile",
    metadata: {
      artistId: artist.artistId,
      artistSlug: artist.slug,
    },
  });
};

export const buildSongSocialMetadata = (
  release: PublicSongRelease | null | undefined,
  artist: ArtistPublicProfile | null | undefined,
): SocialShareMetadata => {
  if (!release) {
    return buildSocialShareMetadata({
      title: "Song Not Found",
      description: "The requested Ascend Nexus Media release could not be found.",
      type: "music.song",
    });
  }

  const artistName = artist?.displayName ?? "Ascend Nexus Media Artist";
  const genreText = release.genre ? `, a ${release.genre} release` : "";
  const artistImage = artist && isValidArtistImageUrl(artist.profileImage) ? artist.profileImage : undefined;
  const coverArt = isValidCoverArtUrl(release.coverArtUrl) ? release.coverArtUrl : undefined;

  return buildSocialShareMetadata({
    title: buildSocialPageTitle(`${release.title} by ${artistName}`),
    description: `Listen to ${release.title} by ${artistName}${genreText} from Ascend Nexus Media.`,
    imageUrl: getSocialPreviewImage(coverArt, artistImage),
    imageAlt: `${release.title} cover art${artist ? ` by ${artist.displayName}` : ""}`,
    url: `/songs/${release.slug}`,
    type: "music.song",
    audioUrl: isSafePublicUrl(release.audioPreviewUrl) ? release.audioPreviewUrl : undefined,
    musician: artistName,
    releaseDate: release.releaseDate,
    metadata: {
      releaseId: release.releaseId,
      songId: release.songId,
      artistId: release.artistId,
    },
  });
};
