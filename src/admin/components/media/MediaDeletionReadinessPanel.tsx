import type { MediaDeletionReadiness } from "../../../models/media";
import { Badge } from "../../../components/ui/Badge";
import { getMediaLifecycleActionLabel } from "../../../utils/media/mediaLifecycleUtils";

interface MediaDeletionReadinessPanelProps {
  readiness: MediaDeletionReadiness;
}

export function MediaDeletionReadinessPanel({ readiness }: MediaDeletionReadinessPanelProps) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{getMediaLifecycleActionLabel(readiness.actionType)}</p>
          <p className="mt-1 text-xs text-white/48">Checked {new Date(readiness.checkedAt).toLocaleString()}</p>
        </div>
        <Badge variant={readiness.allowed ? "sunrise" : "pink"} className="px-2 py-1 text-[0.68rem]">
          {readiness.allowed ? "Allowed" : "Blocked"}
        </Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-white/62 sm:grid-cols-3">
        <div><dt className="text-white/42">Links</dt><dd className="font-semibold text-white/76">{readiness.linkedCount}</dd></div>
        <div><dt className="text-white/42">Public</dt><dd className="font-semibold text-white/76">{readiness.publiclyReferenced ? "Yes" : "No"}</dd></div>
        <div><dt className="text-white/42">Active Versions</dt><dd className="font-semibold text-white/76">{readiness.activeVersionCount}</dd></div>
      </dl>
      {readiness.warnings.length ? (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-white/58">
          {readiness.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

