import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { buildSongSeoMetadata } from "../utils/seoMetadata";
import { useSeoMetadata } from "./useSeoMetadata";

export function useSongSeoMetadata(
  release: PublicSongRelease | null | undefined,
  artist: ArtistPublicProfile | null | undefined,
) {
  return useSeoMetadata(buildSongSeoMetadata(release, artist));
}
