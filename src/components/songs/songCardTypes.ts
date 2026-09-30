import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicSongRelease } from "../../models/release";

export type SongCardVariant = "carousel" | "grid" | "compact" | "featured" | "related";

export interface SongCardArtistData {
  artistId?: string;
  artistName?: string;
  artistSlug?: string;
  artistImage?: string;
}

export interface SongCardProps {
  release?: PublicSongRelease;
  artist?: ArtistPublicProfile | SongCardArtistData;
  variant?: SongCardVariant;
  showArtist?: boolean;
  showAudioPreview?: boolean;
  showTags?: boolean;
  showGenre?: boolean;
  showReleaseDate?: boolean;
  maxTags?: number;
  className?: string;
  onOpen?: (release: PublicSongRelease) => void;
  onPreviewPlay?: (release: PublicSongRelease) => void;
}

export const getSongCardArtistData = (artist?: ArtistPublicProfile | SongCardArtistData): SongCardArtistData => {
  if (!artist) return {};
  if ("displayName" in artist) {
    return {
      artistId: artist.artistId,
      artistName: artist.displayName,
      artistSlug: artist.slug,
      artistImage: artist.profileImage,
    };
  }
  return artist;
};
