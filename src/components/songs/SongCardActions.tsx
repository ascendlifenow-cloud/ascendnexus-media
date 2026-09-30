import { ExternalLink } from "lucide-react";
import type { PublicSongRelease } from "../../models/release";
import { AudioPreviewPlayer } from "../AudioPreviewPlayer";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";

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
  const songPath = release.slug ? `/songs/${release.slug}` : undefined;

  return (
    <div className="space-y-3">
      {showAudioPreview ? (
        <AudioPreviewPlayer
          releaseId={release.releaseId}
          title={release.title || "Untitled release"}
          artistName={artistName}
          audioPreviewUrl={release.audioPreviewUrl}
          analyticsSong={release}
          compact={compactPreview}
          showTime={!compactPreview}
          onPlay={() => onPreviewPlay?.(release)}
        />
      ) : null}
      {songPath ? (
        <LinkButton
          to={songPath}
          variant="secondary"
          className="w-full"
          aria-label={`Open ${release.title || "song"}`}
          onClick={() => onOpen?.(release)}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {openLabel}
        </LinkButton>
      ) : (
        <Button type="button" disabled variant="disabled" className="w-full" aria-label="Song route unavailable">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {openLabel}
        </Button>
      )}
    </div>
  );
}
