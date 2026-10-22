import { ExternalLink, ListMusic, Play, Pause } from "lucide-react";
import { usePublicAudioPlayer } from "../../hooks/public";
import type { PublicSongRelease } from "../../models/release";
import { AddReleaseToPlaylistButton } from "../../member/components/engagement/AddReleaseToPlaylistButton";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";
import { cx } from "../../utils/format";

export interface SongPlaybackActionRelease {
  releaseId: string;
  title: string;
  slug?: string;
  artistId?: string;
  artistName?: string;
  coverArtUrl?: string;
  coverArtThumbnailUrl?: string;
  audioPreviewUrl?: string;
  release?: PublicSongRelease;
}

interface SongPlaybackActionsProps {
  release: SongPlaybackActionRelease;
  compact?: boolean;
  className?: string;
  onPreviewPlay?: () => void;
  onDetails?: () => void;
}

export function SongPlaybackActions({ release, compact = false, className, onPreviewPlay, onDetails }: SongPlaybackActionsProps) {
  const player = usePublicAudioPlayer();
  const previewAvailable = Boolean(release.audioPreviewUrl);
  const active = player.isActive(release.releaseId);
  const playing = active && (player.status === "playing" || player.status === "buffering");
  const preview = previewAvailable ? { releaseId: release.releaseId, url: release.audioPreviewUrl! } : undefined;
  const summary = {
    releaseId: release.releaseId,
    title: release.title,
    slug: release.slug,
    artistId: release.artistId,
    artistName: release.artistName,
    coverArtUrl: release.coverArtThumbnailUrl ?? release.coverArtUrl,
    release: release.release,
  };
  const size = compact ? "sm" as const : "lg" as const;
  const controlClass = compact ? "min-w-0 justify-center" : "min-w-0 justify-center sm:flex-1";

  const togglePreview = async () => {
    if (!preview) return;
    await player.playPreview(preview, summary, { sourceContext: compact ? "song_actions_compact" : "song_actions" });
    onPreviewPlay?.();
  };

  const addToQueue = () => {
    if (!preview) return;
    player.enqueue(preview, summary);
  };

  return (
    <div className={cx("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", className)} role="group" aria-label={`Actions for ${release.title}`}>
      <Button type="button" variant="secondary" size={size} className={controlClass} disabled={!preview} onClick={addToQueue} title="Add to streaming queue">
        <ListMusic className="h-4 w-4 shrink-0" aria-hidden="true" /> <span className="truncate">Queue</span>
      </Button>
      <AddReleaseToPlaylistButton release={release} compact={compact} className={controlClass} />
      {release.slug ? (
        <LinkButton to={`/songs/${release.slug}`} variant="secondary" size={size} className={controlClass} aria-label={`Open song details for ${release.title}`} onClick={onDetails}>
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /> <span className="truncate">Details</span>
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" size={size} className={controlClass} disabled><ExternalLink className="h-4 w-4" aria-hidden="true" /> Details</Button>
      )}
      <Button type="button" variant="primary" size={size} className={controlClass} disabled={!preview} onClick={() => void togglePreview()} aria-label={previewAvailable ? `${playing ? "Pause" : "Play"} 30 second preview of ${release.title}` : `Preview unavailable for ${release.title}`}>
        {playing ? <Pause className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Play className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="truncate">{playing ? "Pause" : "Preview 30s"}</span>
      </Button>
    </div>
  );
}
