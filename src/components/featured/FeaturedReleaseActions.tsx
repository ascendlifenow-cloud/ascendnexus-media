import { Disc3, UserRound } from "lucide-react";
import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicSongRelease } from "../../models/release";
import { AudioPreviewPlayer } from "../AudioPreviewPlayer";
import { LinkButton } from "../ui/LinkButton";

interface FeaturedReleaseActionsProps {
  release: PublicSongRelease;
  artist: ArtistPublicProfile;
}

export function FeaturedReleaseActions({ release, artist }: FeaturedReleaseActionsProps) {
  return (
    <div className="flex flex-col gap-4">
      <AudioPreviewPlayer
        releaseId={release.releaseId}
        title={release.title}
        artistName={artist.displayName}
        audioPreviewUrl={release.audioPreviewUrl}
        analyticsSong={release}
        compact
        showTime={false}
        className="max-w-xl"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton to={`/songs/${release.slug}`} size="lg">
          <Disc3 className="h-4 w-4" aria-hidden="true" />
          Open Song
        </LinkButton>
        <LinkButton to={`/artists/${artist.slug}`} variant="secondary" size="lg">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          View Artist
        </LinkButton>
      </div>
    </div>
  );
}
