import type { ArtistPublicProfile } from "../models/artist";
import { buildArtistSeoMetadata } from "../utils/seoMetadata";
import { useSeoMetadata } from "./useSeoMetadata";

export function useArtistSeoMetadata(artist: ArtistPublicProfile | null | undefined) {
  return useSeoMetadata(buildArtistSeoMetadata(artist));
}
