import type { AdminMetadataStatus } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";

interface AdminMetadataStatusBadgeProps {
  status: AdminMetadataStatus;
}

const statusConfig: Record<AdminMetadataStatus, { label: string; variant: "pink" | "purple" | "sunrise" | "neutral" }> = {
  complete: { label: "Complete", variant: "pink" },
  needs_review: { label: "Needs Review", variant: "sunrise" },
  missing_required: { label: "Missing Required", variant: "sunrise" },
  no_index: { label: "No-Index", variant: "neutral" },
  draft: { label: "Draft", variant: "purple" },
  archived: { label: "Archived", variant: "neutral" },
};

export function AdminMetadataStatusBadge({ status }: AdminMetadataStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.needs_review;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
