import { Sparkles } from "lucide-react";
import type { PublicSongRelease } from "../../models/release";
import { Badge } from "../ui/Badge";

interface FeaturedReleaseBadgeProps {
  release: PublicSongRelease;
}

export function FeaturedReleaseBadge({ release }: FeaturedReleaseBadgeProps) {
  const label = release.featuredLabel?.trim() || "Featured Release";

  return (
    <Badge variant="sunrise" className="inline-flex items-center gap-2">
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}
