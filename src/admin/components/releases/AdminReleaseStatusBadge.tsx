import type { ReleaseStatus } from "../../../models/release";
import { Badge } from "../../../components/ui/Badge";

interface AdminReleaseStatusBadgeProps {
  status: ReleaseStatus;
}

const statusConfig: Record<ReleaseStatus, { label: string; variant: "pink" | "purple" | "neutral" }> = {
  published: { label: "Published", variant: "pink" },
  draft: { label: "Draft", variant: "purple" },
  archived: { label: "Archived", variant: "neutral" },
};

export function AdminReleaseStatusBadge({ status }: AdminReleaseStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
