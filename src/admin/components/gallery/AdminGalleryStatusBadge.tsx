import type { GalleryStatus } from "../../../models/gallery";
import { Badge } from "../../../components/ui/Badge";

interface AdminGalleryStatusBadgeProps {
  status: GalleryStatus;
}

const statusConfig: Record<GalleryStatus, { label: string; variant: "pink" | "purple" | "neutral" }> = {
  published: { label: "Published", variant: "pink" },
  draft: { label: "Draft", variant: "purple" },
  archived: { label: "Archived", variant: "neutral" },
};

export function AdminGalleryStatusBadge({ status }: AdminGalleryStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
