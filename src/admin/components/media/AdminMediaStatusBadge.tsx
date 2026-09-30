import type { MediaAssetStatus } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";

interface AdminMediaStatusBadgeProps {
  status: MediaAssetStatus;
}

const statusConfig: Record<MediaAssetStatus, { label: string; variant: "pink" | "purple" | "neutral" }> = {
  published: { label: "Published", variant: "pink" },
  draft: { label: "Draft", variant: "purple" },
  archived: { label: "Archived", variant: "neutral" },
};

export function AdminMediaStatusBadge({ status }: AdminMediaStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
