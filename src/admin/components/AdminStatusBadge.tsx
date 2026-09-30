import { Badge } from "../../components/ui/Badge";

interface AdminStatusBadgeProps {
  status: "ready" | "planned" | "mock" | "disabled";
}

const statusConfig = {
  ready: { label: "Ready", variant: "glass" },
  planned: { label: "Planned", variant: "purple" },
  mock: { label: "Mock Data", variant: "sunrise" },
  disabled: { label: "Disabled", variant: "neutral" },
} as const;

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
