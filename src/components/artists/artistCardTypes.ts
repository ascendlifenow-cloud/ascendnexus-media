import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicSongRelease } from "../../models/release";

export type ArtistCardVariant = "directory" | "spotlight" | "compact" | "featured" | "horizontal";

export interface ArtistCardLatestRelease {
  title?: string;
  slug?: string;
}

export interface ArtistCardProps {
  artist?: ArtistPublicProfile;
  variant?: ArtistCardVariant;
  primaryGenre?: string;
  styleTags?: readonly string[];
  latestRelease?: PublicSongRelease | ArtistCardLatestRelease;
  showBio?: boolean;
  showTags?: boolean;
  showLatestRelease?: boolean;
  maxTags?: number;
  className?: string;
  onOpen?: (artist: ArtistPublicProfile) => void;
}

export const getLatestReleaseData = (
  latestRelease?: PublicSongRelease | ArtistCardLatestRelease,
): ArtistCardLatestRelease | undefined => {
  if (!latestRelease) return undefined;
  return {
    title: latestRelease.title,
    slug: "slug" in latestRelease ? latestRelease.slug : undefined,
  };
};
