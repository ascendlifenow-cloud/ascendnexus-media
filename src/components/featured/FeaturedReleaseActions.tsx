import { UserRound } from "lucide-react";
import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicSongRelease } from "../../models/release";
import { SongPlaybackActions } from "../songs/SongPlaybackActions";
import { LinkButton } from "../ui/LinkButton";

interface FeaturedReleaseActionsProps {
  release: PublicSongRelease;
  artist: ArtistPublicProfile;
}

export function FeaturedReleaseActions({ release, artist }: FeaturedReleaseActionsProps) {
  return (
    <div className="flex flex-col gap-4">
      <SongPlaybackActions release={{ ...release, artistName: artist.displayName, release }} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton to={`/artists/${artist.slug}`} variant="secondary" size="lg">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          View Artist
        </LinkButton>
      </div>
    </div>
  );
}
