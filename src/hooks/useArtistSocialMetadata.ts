import type { ArtistPublicProfile } from "../models/artist";
import { buildArtistSocialMetadata } from "../utils/socialShareMetadata";
import { useSocialShareMetadata } from "./useSocialShareMetadata";

export function useArtistSocialMetadata(artist: ArtistPublicProfile | null | undefined) {
  return useSocialShareMetadata(buildArtistSocialMetadata(artist));
}
