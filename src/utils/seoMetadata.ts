import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import type { SeoMetadata } from "../models/seo";
import { getArtistImageUrl } from "./artistImageUtils";
import { getCoverArtUrl } from "./coverArtUtils";
import { isSafePublicMediaUrl } from "./media/publicSafeUrlUtils";
import { mediaCdnService } from "../services/media";
export { siteSeoDefaults } from "./siteSeoDefaults";
import { siteSeoDefaults } from "./siteSeoDefaults";

const MAX_DESCRIPTION_LENGTH = 155;

export const sanitizeMetaText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

export const truncateMetaDescription = (value: string | null | undefined, maxLength = MAX_DESCRIPTION_LENGTH): string => {
  const text = sanitizeMetaText(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength - 1).trimEnd();
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
};

export const buildPageTitle = (title: string | null | undefined, siteName = siteSeoDefaults.siteName): string => {
  const cleanTitle = sanitizeMetaText(title);
  if (!cleanTitle) return siteSeoDefaults.defaultTitle;
  if (cleanTitle.toLowerCase().includes(siteName.toLowerCase())) return cleanTitle;
  return `${cleanTitle} | ${siteName}`;
};

export const getSeoImageUrl = (imageUrl: string | null | undefined): string => {
  const value = sanitizeMetaText(imageUrl);
  const normalized = mediaCdnService.normalizePublicMediaUrl(value);
  return normalized && isSafePublicMediaUrl(normalized) ? normalized : siteSeoDefaults.defaultImage;
};

export const buildDefaultSeoMetadata = (metadata: Partial<SeoMetadata> = {}): SeoMetadata => {
  const title = metadata.title ? buildPageTitle(metadata.title) : siteSeoDefaults.defaultTitle;
  const description =
    truncateMetaDescription(metadata.description) || truncateMetaDescription(siteSeoDefaults.defaultDescription);

  return {
    title,
    description,
    canonicalPath: metadata.canonicalPath,
    imageUrl: getSeoImageUrl(metadata.imageUrl),
    imageAlt: sanitizeMetaText(metadata.imageAlt) || "Ascend Nexus Media preview image",
    type: metadata.type ?? "website",
    keywords: metadata.keywords?.map(sanitizeMetaText).filter(Boolean),
    noIndex: metadata.noIndex,
    metadata: metadata.metadata,
  };
};

export const buildArtistSeoMetadata = (artist: ArtistPublicProfile | null | undefined): SeoMetadata => {
  if (!artist) {
    return buildDefaultSeoMetadata({
      title: "Artist Not Found",
      description: "The requested Ascend Nexus Media artist could not be found or is unavailable.",
      type: "artist",
      noIndex: true,
    });
  }

  const description =
    truncateMetaDescription(artist.bio) ||
    truncateMetaDescription(`Explore ${artist.displayName}, an AI Persona Artist from Ascend Nexus Media.`);

  return buildDefaultSeoMetadata({
    title: artist.displayName,
    description,
    canonicalPath: `/artists/${artist.slug}`,
    imageUrl: getArtistImageUrl(artist.profileImage),
    imageAlt: `${artist.displayName} artist profile image`,
    type: "artist",
    keywords: [artist.displayName, artist.musicStyle, "AI Persona Artist", "Ascend Nexus Media"],
    metadata: {
      artistId: artist.artistId,
      artistSlug: artist.slug,
    },
  });
};

export const buildSongSeoMetadata = (
  release: PublicSongRelease | null | undefined,
  artist: ArtistPublicProfile | null | undefined,
): SeoMetadata => {
  if (!release) {
    return buildDefaultSeoMetadata({
      title: "Song Not Found",
      description: "The requested Ascend Nexus Media release could not be found or is unavailable.",
      type: "song",
      noIndex: true,
    });
  }

  const artistName = artist?.displayName ?? "Ascend Nexus Media Artist";
  const tagText = release.styleTags.length ? ` with ${release.styleTags.slice(0, 3).join(", ")} style notes` : "";
  const genreText = release.genre ? `, a ${release.genre} release` : "";

  return buildDefaultSeoMetadata({
    title: `${release.title} by ${artistName}`,
    description: `Listen to ${release.title} by ${artistName}${genreText} from Ascend Nexus Media${tagText}.`,
    canonicalPath: `/songs/${release.slug}`,
    imageUrl: getCoverArtUrl(release.coverArtUrl),
    imageAlt: `${release.title} cover art${artist ? ` by ${artist.displayName}` : ""}`,
    type: "song",
    keywords: [release.title, artistName, release.genre, ...release.styleTags, "Ascend Nexus Media"],
    metadata: {
      releaseId: release.releaseId,
      songId: release.songId,
      artistId: release.artistId,
    },
  });
};

export const routeSeoMetadata = {
  home: buildDefaultSeoMetadata({
    title: "Ascend Nexus Media | AI Persona Artists & Original Music",
    description: "Discover AI Persona Artists, latest releases, original music, cover art, and visual storytelling from Ascend Nexus Media.",
    canonicalPath: "/",
    type: "website",
  }),
  artists: buildDefaultSeoMetadata({
    title: "Artists",
    description: "Meet the AI Persona Artists shaping the sound and visual world of Ascend Nexus Media.",
    canonicalPath: "/artists",
    type: "website",
  }),
  search: buildDefaultSeoMetadata({
    title: "Search",
    description: "Search Ascend Nexus Media artists, songs, genres, and creative styles.",
    canonicalPath: "/search",
    type: "search",
  }),
  browse: buildDefaultSeoMetadata({
    title: "Browse Music",
    description: "Browse Ascend Nexus Media releases by genre, mood, style, and creative sound.",
    canonicalPath: "/browse",
    type: "browse",
  }),
  releases: buildDefaultSeoMetadata({
    title: "Releases",
    description:
      "Browse published Ascend Nexus Media song releases from AI Persona Artists across genres, styles, and creative worlds.",
    canonicalPath: "/songs",
    type: "website",
  }),
  gallery: buildDefaultSeoMetadata({
    title: "Gallery",
    description: "Explore Ascend Nexus Media cover art, artist visuals, promotional graphics, and visual storytelling.",
    canonicalPath: "/gallery",
    type: "gallery",
  }),
  contact: buildDefaultSeoMetadata({
    title: "Contact & Follow",
    description:
      "Follow Ascend Nexus Media and stay connected with AI Persona Artist releases, visuals, stories, and creative updates.",
    canonicalPath: "/contact",
    type: "website",
  }),
  about: buildDefaultSeoMetadata({
    title: "About",
    description: "Learn about Ascend Nexus Media, AI persona artists, original releases, and public creative media.",
    canonicalPath: "/about",
    type: "website",
  }),
  privacy: buildDefaultSeoMetadata({
    title: "Privacy Policy",
    description: "Review Ascend Nexus Media privacy information and public site data practices.",
    canonicalPath: "/privacy",
    type: "website",
  }),
  terms: buildDefaultSeoMetadata({
    title: "Terms of Use",
    description: "Review Ascend Nexus Media public site terms and usage guidance.",
    canonicalPath: "/terms",
    type: "website",
  }),
  login: buildDefaultSeoMetadata({
    title: "Member Sign In",
    description: "Public member sign-in readiness for Ascend Nexus Media guest and future account access.",
    canonicalPath: "/login",
    type: "website",
  }),
  register: buildDefaultSeoMetadata({
    title: "Join Ascend Nexus Media",
    description: "Public account registration readiness for Ascend Nexus Media member access.",
    canonicalPath: "/register",
    type: "website",
  }),
  notFound: buildDefaultSeoMetadata({
    title: "Page Not Found",
    description: "The requested Ascend Nexus Media page could not be found.",
    type: "website",
    noIndex: true,
  }),
} satisfies Record<string, SeoMetadata>;
