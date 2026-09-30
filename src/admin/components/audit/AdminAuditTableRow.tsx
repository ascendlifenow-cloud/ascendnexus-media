import { Eye } from "lucide-react";
import type { AdminAuditEvent } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { formatReleaseDate } from "../../../utils/format";
import { AdminAuditActionBadge } from "./AdminAuditActionBadge";
import { AdminAuditEntityBadge } from "./AdminAuditEntityBadge";
import { AdminAuditEventTypeBadge } from "./AdminAuditEventTypeBadge";

interface AdminAuditTableRowProps {
  event: AdminAuditEvent;
  onViewDetails: (event: AdminAuditEvent) => void;
}

export function AdminAuditTableRow({ event, onViewDetails }: AdminAuditTableRowProps) {
  const user = event.userDisplayName ?? event.userId ?? "System";
  return (
    <tr className="border-t border-white/10 align-top">
      <td className="px-4 py-4 text-sm text-white/64">{formatReleaseDate(event.createdAt)}</td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <AdminAuditActionBadge actionType={event.actionType} />
          <AdminAuditEventTypeBadge eventType={event.eventType} />
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="grid gap-2">
          <AdminAuditEntityBadge entityType={event.entityType} />
          <p className="text-sm font-semibold text-white">{event.entityLabel ?? event.entityId ?? "Unknown entity"}</p>
        </div>
      </td>
      <td className="px-4 py-4 text-sm leading-6 text-white/70">{event.summary}</td>
      <td className="px-4 py-4 text-sm text-white/58">{user}</td>
      <td className="px-4 py-4 text-sm text-white/52">{event.route ?? "No route"}</td>
      <td className="px-4 py-4">
        <Button type="button" variant="glass" size="sm" onClick={() => onViewDetails(event)} aria-label={`View details for ${event.summary}`}>
          <Eye className="h-4 w-4" aria-hidden />
          Details
        </Button>
      </td>
    </tr>
  );
}
