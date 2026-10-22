import type { PublicSongRelease } from "../../models/release";
import { SongPlaybackActions } from "./SongPlaybackActions";

interface SongCardActionsProps {
  release: PublicSongRelease;
  artistName?: string;
  showAudioPreview?: boolean;
  compactPreview?: boolean;
  openLabel?: string;
  onOpen?: (release: PublicSongRelease) => void;
  onPreviewPlay?: (release: PublicSongRelease) => void;
}

export function SongCardActions({
  release,
  artistName = "Ascend Nexus Media",
  showAudioPreview = true,
  compactPreview = true,
  openLabel = "Open Song",
  onOpen,
  onPreviewPlay,
}: SongCardActionsProps) {
  return (
    <SongPlaybackActions
      release={{
        releaseId: release.releaseId,
        title: release.title || "Untitled release",
        slug: release.slug,
        artistId: release.artistId,
        artistName,
        coverArtUrl: release.coverArtUrl,
        coverArtThumbnailUrl: release.coverArtThumbnailUrl,
        audioPreviewUrl: release.audioPreviewUrl,
        release,
      }}
      compact={compactPreview}
      onDetails={() => onOpen?.(release)}
      onPreviewPlay={() => onPreviewPlay?.(release)}
    />
  );
}
