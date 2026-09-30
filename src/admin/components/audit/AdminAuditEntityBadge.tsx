import type { AdminAuditEntityType } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatAuditEntityType } from "../../utils/adminAuditUtils";

export function AdminAuditEntityBadge({ entityType }: { entityType: AdminAuditEntityType }) {
  return <Badge variant="neutral">{formatAuditEntityType(entityType)}</Badge>;
}
