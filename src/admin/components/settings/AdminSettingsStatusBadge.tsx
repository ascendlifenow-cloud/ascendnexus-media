import type { AdminSettingStatus } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatSettingsStatus } from "../../utils/adminSettingsUtils";

interface AdminSettingsStatusBadgeProps {
  status: AdminSettingStatus | boolean;
}

export function AdminSettingsStatusBadge({ status }: AdminSettingsStatusBadgeProps) {
  const normalized: AdminSettingStatus = typeof status === "boolean" ? (status ? "configured" : "missing") : status;
  const variant = normalized === "configured" ? "pink" : normalized === "missing" ? "sunrise" : "neutral";
  return <Badge variant={variant}>{formatSettingsStatus(normalized)}</Badge>;
}
