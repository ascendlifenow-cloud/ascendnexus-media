import { ArrowRight, Headphones } from "lucide-react";
import type { ArtistPublicProfile } from "../../models/artist";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";
import type { ArtistCardLatestRelease } from "./artistCardTypes";

interface ArtistCardActionsProps {
  artist?: ArtistPublicProfile;
  latestRelease?: ArtistCardLatestRelease;
  showLatestRelease?: boolean;
  compact?: boolean;
  onOpen?: (artist: ArtistPublicProfile) => void;
}

export function ArtistCardActions({
  artist,
  latestRelease,
  showLatestRelease = true,
  compact = false,
  onOpen,
}: ArtistCardActionsProps) {
  const displayName = artist?.displayName || artist?.name || "Artist";
  const artistPath = artist?.slug ? `/artists/${artist.slug}` : undefined;
  const latestPath = latestRelease?.slug ? `/songs/${latestRelease.slug}` : undefined;

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-3 sm:flex-row"}>
      {artistPath ? (
        <LinkButton
          to={artistPath}
          aria-label={`View ${displayName}`}
          variant={compact ? "ghost" : "glass"}
          size={compact ? "sm" : "md"}
          className={compact ? "shrink-0" : "w-full"}
          onClick={() => artist && onOpen?.(artist)}
        >
          View Artist
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
      ) : (
        <Button type="button" disabled variant="disabled" size={compact ? "sm" : "md"} className={compact ? "shrink-0" : "w-full"}>
          View Artist
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      {showLatestRelease && latestPath ? (
        <LinkButton
          to={latestPath}
          aria-label={`Listen to ${latestRelease?.title || "latest release"} by ${displayName}`}
          variant="secondary"
          size={compact ? "sm" : "md"}
          className={compact ? "shrink-0" : "w-full"}
        >
          <Headphones className="h-4 w-4" aria-hidden="true" />
          Listen
        </LinkButton>
      ) : null}
    </div>
  );
}
