import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { buildSongSocialMetadata } from "../utils/socialShareMetadata";
import { useSocialShareMetadata } from "./useSocialShareMetadata";

export function useSongSocialMetadata(
  release: PublicSongRelease | null | undefined,
  artist: ArtistPublicProfile | null | undefined,
) {
  return useSocialShareMetadata(buildSongSocialMetadata(release, artist));
}
