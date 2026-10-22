import { ExternalLink, ListMusic, Play, Pause } from "lucide-react";
import { usePublicAudioPlayer } from "../../hooks/public";
import type { PublicSongRelease } from "../../models/release";
import { AddReleaseToPlaylistButton } from "../../member/components/engagement/AddReleaseToPlaylistButton";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";
import { cx } from "../../utils/format";
import { ActionTooltip } from "../ui/ActionTooltip";

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
  const controlClass = "group/action relative shrink-0";

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
    <div className={cx("flex flex-wrap items-center gap-2", className)} role="group" aria-label={`Actions for ${release.title}`}>
      <Button type="button" variant="secondary" size="icon" className={controlClass} disabled={!preview} onClick={addToQueue} aria-label="Add to streaming queue">
        <ListMusic className="h-4 w-4" aria-hidden="true" />
        <ActionTooltip label="Add to streaming queue" />
      </Button>
      <AddReleaseToPlaylistButton release={release} compact={compact} className={controlClass} />
      {release.slug ? (
        <LinkButton to={`/songs/${release.slug}`} variant="secondary" size="icon" className={controlClass} aria-label={`Open song details for ${release.title}`} onClick={onDetails}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <ActionTooltip label="Song details" />
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" size="icon" className={controlClass} disabled aria-label="Song details unavailable"><ExternalLink className="h-4 w-4" aria-hidden="true" /><ActionTooltip label="Song details unavailable" /></Button>
      )}
      <Button type="button" variant="primary" size="icon" className={controlClass} disabled={!preview} onClick={() => void togglePreview()} aria-label={previewAvailable ? `${playing ? "Pause" : "Play"} 30 second preview of ${release.title}` : `Preview unavailable for ${release.title}`}>
        {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        <ActionTooltip label={previewAvailable ? (playing ? "Pause preview" : "Preview 30 seconds") : "Preview unavailable"} />
      </Button>
    </div>
  );
}
