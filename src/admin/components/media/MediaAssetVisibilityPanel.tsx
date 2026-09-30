import type { MediaAssetVisibilityState } from "../../../models/media";
import { MediaAssetBlockingIssuesList } from "./MediaAssetBlockingIssuesList";
import { MediaAssetVisibilityBadge } from "./MediaAssetVisibilityBadge";
import { MediaAssetVisibilityWarningsList } from "./MediaAssetVisibilityWarningsList";

export function MediaAssetVisibilityPanel({ state }: { state: MediaAssetVisibilityState }) {
  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.045] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Published Visibility</p>
          <p className="mt-1 text-xs text-white/50">{state.reason}</p>
        </div>
        <MediaAssetVisibilityBadge visibility={state.visibility} />
      </div>
      <MediaAssetBlockingIssuesList issues={state.blockingIssues} />
      <MediaAssetVisibilityWarningsList warnings={state.warnings} />
    </div>
  );
}
