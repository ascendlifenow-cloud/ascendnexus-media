import type { MediaAssetVersionHistory } from "../../../models/media";
import { getActiveMediaVersion } from "../../../utils/media/mediaVersionUtils";
import { MediaActiveVersionIndicator } from "./MediaActiveVersionIndicator";
import { MediaVersionList } from "./MediaVersionList";

export function MediaVersionHistoryPanel({
  history,
  onRollback,
}: {
  history?: MediaAssetVersionHistory | null;
  onRollback?: (versionId: string) => void;
}) {
  const activeVersion = getActiveMediaVersion(history);
  return (
    <section className="grid gap-3 rounded-anm-card border border-white/10 bg-black/18 p-4" aria-label="Media version history">
      <div>
        <h3 className="text-base font-semibold text-white">Version History</h3>
        <p className="mt-1 text-sm text-white/52">Previous versions are preserved for rollback readiness.</p>
      </div>
      <MediaActiveVersionIndicator version={activeVersion} />
      <MediaVersionList versions={history?.versions ?? []} onRollback={onRollback} />
    </section>
  );
}
