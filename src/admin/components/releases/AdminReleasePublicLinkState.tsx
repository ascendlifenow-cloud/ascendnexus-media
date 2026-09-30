import { Eye } from "lucide-react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import { LinkButton } from "../../../components/ui/LinkButton";
import { releaseRouteBuilder } from "../../services/ReleaseRouteBuilder";
import { getReleasePublicVisibilityState } from "../../utils/adminReleaseUtils";
import { PublicVisibilityBadge } from "../publishing";

interface AdminReleasePublicLinkStateProps {
  release: SongReleaseAdminRecord;
  artist: ArtistAdminRecord | null;
}

export function AdminReleasePublicLinkState({ release, artist }: AdminReleasePublicLinkStateProps) {
  const state = getReleasePublicVisibilityState(release, artist);

  if (state === "public") {
    return (
      <LinkButton to={releaseRouteBuilder.getPublicReleasePath(release)} variant="glass" size="sm" aria-label={`Open public song page for ${release.title}`}>
        <Eye className="h-4 w-4" aria-hidden />
        Public
      </LinkButton>
    );
  }

  return <PublicVisibilityBadge visibility={state === "artist_not_public" ? "blocked" : "not_public"} />;
}
