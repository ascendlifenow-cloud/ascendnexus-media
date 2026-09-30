import type { ArtistAdminStatus } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";

interface AdminArtistStatusBadgeProps {
  status: ArtistAdminStatus;
}

const statusConfig: Record<ArtistAdminStatus, { label: string; variant: "pink" | "purple" | "sunrise" | "neutral" | "glass" }> = {
  active: { label: "Active", variant: "glass" },
  draft: { label: "Draft", variant: "sunrise" },
  archived: { label: "Archived", variant: "neutral" },
};

export function AdminArtistStatusBadge({ status }: AdminArtistStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
