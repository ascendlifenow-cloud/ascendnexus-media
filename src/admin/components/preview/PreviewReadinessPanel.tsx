import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { AdminPreviewReadiness } from "../../utils/adminPreviewUtils";
import { PublicVisibilityBadge, PublishingReadinessBadge } from "../publishing";

interface PreviewReadinessPanelProps {
  readiness: AdminPreviewReadiness;
}

export function PreviewReadinessPanel({ readiness }: PreviewReadinessPanelProps) {
  const { status, warnings, blockingIssues } = readiness;
  const hasIssues = status.missingFields.length > 0 || warnings.length > 0 || blockingIssues.length > 0;

  return (
    <aside className="rounded-anm-panel border border-white/10 bg-anm-surface/86 p-5 shadow-anm-card-glow" aria-label="Preview readiness">
      <div className="flex flex-wrap items-center gap-2">
        <PublicVisibilityBadge visibility={status.publicVisibility} />
        <PublishingReadinessBadge readiness={status.readinessState} />
      </div>
      <div className="mt-4 grid gap-3 text-sm text-white/70">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyanGlow" aria-hidden />
          Status: <span className="font-semibold text-white">{status.currentStatus}</span>
        </p>
        {!hasIssues ? (
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-anm-success" aria-hidden />
            This saved record is public-ready.
          </p>
        ) : null}
        {status.missingFields.length > 0 ? (
          <div>
            <p className="flex items-center gap-2 font-semibold text-white">
              <ShieldAlert className="h-4 w-4 text-anm-gold" aria-hidden />
              Missing fields
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {status.missingFields.map((field) => <li key={field}>{field}</li>)}
            </ul>
          </div>
        ) : null}
        {blockingIssues.length > 0 ? (
          <div>
            <p className="flex items-center gap-2 font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-anm-pink" aria-hidden />
              Blocking issues
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <div>
            <p className="flex items-center gap-2 font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-anm-gold" aria-hidden />
              Warnings
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
