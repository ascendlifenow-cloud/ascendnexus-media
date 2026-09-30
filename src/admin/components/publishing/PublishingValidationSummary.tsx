import type { PublishingStatus } from "../../../models/admin";
import { PublishingBlockingIssuesList } from "./PublishingBlockingIssuesList";
import { PublishingWarningsList } from "./PublishingWarningsList";

export function PublishingValidationSummary({ status }: { status: PublishingStatus }) {
  if (!status.missingFields.length && !status.blockingIssues.length && !status.warnings.length) {
    return <p className="rounded-md border border-anm-success/30 bg-anm-success/10 p-3 text-sm text-anm-success">Publishing readiness passed.</p>;
  }
  return (
    <div className="grid gap-3">
      {status.missingFields.length ? (
        <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 p-3">
          <h3 className="text-sm font-semibold text-white">Missing Fields</h3>
          <p className="mt-2 text-sm text-white/70">{status.missingFields.join(", ")}</p>
        </div>
      ) : null}
      <PublishingBlockingIssuesList issues={status.blockingIssues} />
      <PublishingWarningsList warnings={status.warnings} />
    </div>
  );
}
