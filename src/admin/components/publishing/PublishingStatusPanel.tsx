import type { PublishingStatus } from "../../../models/admin";
import { Card } from "../../../components/ui/Card";
import { formatPublishingStatusLabel } from "../../utils/publishingWorkflowUtils";
import { PublicVisibilityBadge } from "./PublicVisibilityBadge";
import { PublishingReadinessBadge } from "./PublishingReadinessBadge";
import { PublishingValidationSummary } from "./PublishingValidationSummary";

interface PublishingStatusPanelProps {
  status: PublishingStatus;
  title?: string;
}

export function PublishingStatusPanel({ status, title = "Publishing Status" }: PublishingStatusPanelProps) {
  return (
    <Card as="section" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/52">{status.entityType.replace(/_/g, " ")} / {status.entityId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PublicVisibilityBadge visibility={status.publicVisibility} />
          <PublishingReadinessBadge readiness={status.readinessState} />
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Current Status</dt>
          <dd className="mt-1 font-semibold text-white">{formatPublishingStatusLabel(status.currentStatus)}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Last Updated</dt>
          <dd className="mt-1 text-white/70">{status.updatedAt || "Not available"}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <PublishingValidationSummary status={status} />
      </div>
    </Card>
  );
}
