import type { GallerySourceType } from "../../../models/gallery";
import { Badge } from "../../../components/ui/Badge";
import { formatGallerySourceType } from "../../utils/adminGalleryUtils";

interface AdminGallerySourceTypeBadgeProps {
  sourceType: GallerySourceType;
}

export function AdminGallerySourceTypeBadge({ sourceType }: AdminGallerySourceTypeBadgeProps) {
  return <Badge variant="neutral">{formatGallerySourceType(sourceType)}</Badge>;
}
