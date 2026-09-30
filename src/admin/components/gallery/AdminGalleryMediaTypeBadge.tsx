import type { GalleryMediaType } from "../../../models/gallery";
import { Badge } from "../../../components/ui/Badge";
import { formatGalleryMediaType } from "../../utils/adminGalleryUtils";

interface AdminGalleryMediaTypeBadgeProps {
  mediaType: GalleryMediaType;
}

export function AdminGalleryMediaTypeBadge({ mediaType }: AdminGalleryMediaTypeBadgeProps) {
  const variant = mediaType === "cover_art" ? "sunrise" : mediaType === "artist_profile" ? "purple" : "glass";
  return <Badge variant={variant}>{formatGalleryMediaType(mediaType)}</Badge>;
}
