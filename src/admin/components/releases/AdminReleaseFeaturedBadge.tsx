import type { SongReleaseAdminRecord } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";

interface AdminReleaseFeaturedBadgeProps {
  release: SongReleaseAdminRecord;
}

export function AdminReleaseFeaturedBadge({ release }: AdminReleaseFeaturedBadgeProps) {
  if (!release.featured) {
    return <span className="text-sm font-semibold text-white/42">Not featured</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="sunrise">{release.featuredLabel || "Featured"}</Badge>
      <span className="text-xs text-white/48">
        {release.featuredPlacement ? `${release.featuredPlacement}` : "Any placement"}
        {typeof release.featuredSortOrder === "number" ? ` / ${release.featuredSortOrder}` : ""}
      </span>
    </div>
  );
}
