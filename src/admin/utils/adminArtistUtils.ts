import type { ArtistAdminRecord, ArtistAdminStatus } from "../../models/admin";
import { getArtistAdminStats } from "./adminStats";

export type AdminArtistStatusFilter = "all" | ArtistAdminStatus;
export type AdminArtistSortMode = "sortOrder" | "displayName" | "createdAt" | "updatedAt" | "status";

export interface AdminArtistMissingDataFlags {
  missingProfileImage: boolean;
  missingBio: boolean;
  missingSlug: boolean;
  missingDisplayName: boolean;
  missingSeoMetadata: boolean;
  missingSocialMetadata: boolean;
}

export const searchAdminArtists = (artists: readonly ArtistAdminRecord[], query: string): ArtistAdminRecord[] => {
  const value = query.trim().toLowerCase();
  if (!value) return [...artists];

  return artists.filter((artist) =>
    [
      artist.displayName,
      artist.name,
      artist.slug,
      artist.bio,
      artist.shortBio,
      ...(artist.styleTags ?? []),
      ...(artist.genres ?? []),
    ]
      .filter(Boolean)
      .some((field) => field?.toLowerCase().includes(value)),
  );
};

export const filterAdminArtists = (
  artists: readonly ArtistAdminRecord[],
  statusFilter: AdminArtistStatusFilter,
): ArtistAdminRecord[] => {
  if (statusFilter === "all") return [...artists];
  return artists.filter((artist) => artist.status === statusFilter);
};

const getDateValue = (value?: string): number => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const sortAdminArtists = (
  artists: readonly ArtistAdminRecord[],
  sortMode: AdminArtistSortMode,
): ArtistAdminRecord[] =>
  [...artists].sort((a, b) => {
    if (sortMode === "displayName") return a.displayName.localeCompare(b.displayName);
    if (sortMode === "status") return a.status.localeCompare(b.status) || a.sortOrder - b.sortOrder;
    if (sortMode === "createdAt") return getDateValue(b.createdAt) - getDateValue(a.createdAt);
    if (sortMode === "updatedAt") return getDateValue(b.updatedAt) - getDateValue(a.updatedAt);
    return a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName);
  });

export const getAdminArtistStats = (artists: readonly ArtistAdminRecord[]) => {
  const baseStats = getArtistAdminStats(artists);

  return {
    ...baseStats,
    featured: artists.filter((artist) => Boolean(artist.featured)).length,
    missingImages: artists.filter((artist) => getArtistMissingDataFlags(artist).missingProfileImage).length,
  };
};

export const getArtistPublicVisibilityState = (artist: ArtistAdminRecord): "public" | "not_public" =>
  artist.status === "active" && Boolean(artist.slug) ? "public" : "not_public";

export const getArtistMissingDataFlags = (artist: ArtistAdminRecord): AdminArtistMissingDataFlags => ({
  missingProfileImage: !artist.profileImage?.trim(),
  missingBio: !artist.bio?.trim(),
  missingSlug: !artist.slug?.trim(),
  missingDisplayName: !artist.displayName?.trim(),
  missingSeoMetadata: !artist.seoMetadata,
  missingSocialMetadata: !artist.socialMetadata,
});

export const getArtistMissingDataLabels = (artist: ArtistAdminRecord): string[] => {
  const flags = getArtistMissingDataFlags(artist);
  const labels: string[] = [];
  if (flags.missingProfileImage) labels.push("Image");
  if (flags.missingBio) labels.push("Bio");
  if (flags.missingSlug) labels.push("Slug");
  if (flags.missingDisplayName) labels.push("Name");
  if (flags.missingSeoMetadata) labels.push("SEO");
  if (flags.missingSocialMetadata) labels.push("Social");
  return labels;
};

export const getFormattedAdminDate = (value?: string): string => {
  if (!value) return "Not updated";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
};
