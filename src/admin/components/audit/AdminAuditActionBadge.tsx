import type { AdminAuditActionType } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatAuditActionType } from "../../utils/adminAuditUtils";

export function AdminAuditActionBadge({ actionType }: { actionType: AdminAuditActionType }) {
  const variant = ["publish", "activate", "enable"].includes(actionType)
    ? "glass"
    : ["archive", "delete", "disable"].includes(actionType)
      ? "sunrise"
      : actionType === "preview"
        ? "purple"
        : "neutral";
  return <Badge variant={variant}>{formatAuditActionType(actionType)}</Badge>;
}
