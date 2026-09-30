import type { AdminAuditEvent } from "../../../models/admin";
import { AdminAuditActionBadge } from "./AdminAuditActionBadge";
import { AdminAuditEntityBadge } from "./AdminAuditEntityBadge";
import { AdminAuditEventTypeBadge } from "./AdminAuditEventTypeBadge";
import { AdminAuditTableRow } from "./AdminAuditTableRow";
import { Button } from "../../../components/ui/Button";

interface AdminAuditTableProps {
  events: AdminAuditEvent[];
  onViewDetails: (event: AdminAuditEvent) => void;
}

export function AdminAuditTable({ events, onViewDetails }: AdminAuditTableProps) {
  return (
    <section className="overflow-hidden rounded-anm-panel border border-white/10 bg-anm-surface/80" aria-label="Audit events">
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left">
          <thead className="bg-white/[0.045] text-xs font-bold uppercase tracking-[0.18em] text-white/42">
            <tr>
              <th scope="col" className="px-4 py-3">Time</th>
              <th scope="col" className="px-4 py-3">Action</th>
              <th scope="col" className="px-4 py-3">Entity</th>
              <th scope="col" className="px-4 py-3">Summary</th>
              <th scope="col" className="px-4 py-3">User</th>
              <th scope="col" className="px-4 py-3">Route</th>
              <th scope="col" className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => <AdminAuditTableRow key={event.auditEventId} event={event} onViewDetails={onViewDetails} />)}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 lg:hidden">
        {events.map((event) => (
          <article key={event.auditEventId} className="rounded-md border border-white/10 bg-black/18 p-4">
            <div className="flex flex-wrap gap-2">
              <AdminAuditActionBadge actionType={event.actionType} />
              <AdminAuditEntityBadge entityType={event.entityType} />
              <AdminAuditEventTypeBadge eventType={event.eventType} />
            </div>
            <h2 className="mt-3 text-base font-semibold text-white">{event.entityLabel ?? event.entityId ?? "Unknown entity"}</h2>
            <p className="mt-2 text-sm leading-6 text-white/66">{event.summary}</p>
            <p className="mt-3 text-xs text-white/42">{event.createdAt}</p>
            <div className="mt-4">
              <Button type="button" variant="glass" size="sm" onClick={() => onViewDetails(event)}>
                View Details
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
