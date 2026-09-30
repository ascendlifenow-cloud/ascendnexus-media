import { X } from "lucide-react";
import type { AdminAuditEvent, AdminAuditSnapshot } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { AdminSectionCard } from "../AdminSectionCard";
import { AdminAuditActionBadge } from "./AdminAuditActionBadge";
import { AdminAuditEntityBadge } from "./AdminAuditEntityBadge";
import { AdminAuditEventTypeBadge } from "./AdminAuditEventTypeBadge";

const SnapshotBlock = ({ title, snapshot }: { title: string; snapshot?: AdminAuditSnapshot }) => {
  if (!snapshot) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">{title}</p>
      <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-white/10 bg-black/24 p-3 text-xs leading-5 text-white/66">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </div>
  );
};

interface AdminAuditEventDetailPanelProps {
  event: AdminAuditEvent | null;
  onClose: () => void;
}

export function AdminAuditEventDetailPanel({ event, onClose }: AdminAuditEventDetailPanelProps) {
  if (!event) {
    return (
      <AdminSectionCard title="Event Detail Preview" description="Select an audit event to inspect its details, route, snapshots, and metadata.">
        <p className="text-sm text-white/56">No audit event selected.</p>
      </AdminSectionCard>
    );
  }

  return (
    <AdminSectionCard title="Event Detail Preview" description="Snapshot values are sanitized before display.">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <AdminAuditActionBadge actionType={event.actionType} />
            <AdminAuditEntityBadge entityType={event.entityType} />
            <AdminAuditEventTypeBadge eventType={event.eventType} />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close audit event details">
            <X className="h-4 w-4" aria-hidden />
            Close
          </Button>
        </div>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          {[
            ["Audit Event ID", event.auditEventId],
            ["Entity ID", event.entityId ?? "Unavailable"],
            ["Entity Label", event.entityLabel ?? "Unavailable"],
            ["Entity Slug", event.entitySlug ?? "Unavailable"],
            ["User", event.userDisplayName ?? event.userId ?? "System"],
            ["Route", event.route ?? "Unavailable"],
            ["Created At", event.createdAt],
            ["Summary", event.summary],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-white/42">{label}</dt>
              <dd className="mt-1 text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <SnapshotBlock title="Before Snapshot" snapshot={event.before} />
        <SnapshotBlock title="After Snapshot" snapshot={event.after} />
        <SnapshotBlock title="Metadata" snapshot={event.metadata} />
      </div>
    </AdminSectionCard>
  );
}
