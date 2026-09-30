import { usePublicArtistReleases, usePublicRelease } from "./public";

export const useRelease = (slug: string | undefined) =>
  usePublicRelease(slug);

export const usePublishedReleasesByArtistId = (artistId: string | undefined) =>
  usePublicArtistReleases(artistId);
