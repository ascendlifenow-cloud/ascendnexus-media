import type { AdminAuditEventType } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatAuditEventType } from "../../utils/adminAuditUtils";

export function AdminAuditEventTypeBadge({ eventType }: { eventType: AdminAuditEventType }) {
  const variant = eventType === "publishing" ? "sunrise" : eventType === "preview" ? "purple" : eventType === "system" ? "neutral" : "glass";
  return <Badge variant={variant}>{formatAuditEventType(eventType)}</Badge>;
}
