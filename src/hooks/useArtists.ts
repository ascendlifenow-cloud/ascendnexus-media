import { usePublicArtist, usePublicArtists as usePublicArtistsApi } from "./public";

export const useArtists = () =>
  usePublicArtistsApi();

export const usePublicArtists = () =>
  usePublicArtistsApi();

export const useArtist = (slug: string | undefined) =>
  usePublicArtist(slug);
