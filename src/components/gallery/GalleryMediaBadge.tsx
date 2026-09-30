import type { GalleryMediaType } from "../../models/gallery";
import { Badge } from "../ui/Badge";

const mediaLabels: Record<GalleryMediaType, string> = {
  image: "Image",
  cover_art: "Cover Art",
  artist_profile: "Artist",
  promo_graphic: "Promotional",
  video_thumbnail: "Video",
  custom: "Custom",
};

interface GalleryMediaBadgeProps {
  mediaType: GalleryMediaType;
}

export function GalleryMediaBadge({ mediaType }: GalleryMediaBadgeProps) {
  return <Badge variant={mediaType === "cover_art" ? "sunrise" : "glass"}>{mediaLabels[mediaType] ?? "Visual"}</Badge>;
}
