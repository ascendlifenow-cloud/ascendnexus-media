import { AlertTriangle } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { AdminSectionCard } from "../../AdminSectionCard";
import type { buildProcessingAttentionSummary } from "../../../utils/mediaProcessingAdminUtils";

type AttentionSummary = ReturnType<typeof buildProcessingAttentionSummary>;

export function AdminProcessingAttentionPanel({ summary, onViewFailed }: { summary: AttentionSummary; onViewFailed: () => void }) {
  if (!summary.visible) return null;
  return (
    <AdminSectionCard title="Processing Attention" description="Failures, disabled workers, or unavailable tools that may need admin review.">
      <div className="grid gap-4 text-sm text-white/70">
        <div className="flex items-start gap-3 rounded-md border border-amber-300/20 bg-amber-400/10 p-3 text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden />
          <div>
            <p className="font-semibold">{summary.affectedAssets} affected assets, {summary.requiredFailures} required failures</p>
            <p className="mt-1">{summary.suggestedAction}</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {summary.issues.map((issue) => <p key={issue}>{issue}</p>)}
          {summary.commonFailureCodes.length ? <p>Common codes: {summary.commonFailureCodes.join(", ")}</p> : null}
          {summary.oldestUnresolvedFailure ? <p>Oldest unresolved: {summary.oldestUnresolvedFailure}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="glass" onClick={onViewFailed}>View Failed Jobs</Button>
          <Button type="button" variant="ghost" disabled>Retry Eligible Jobs</Button>
        </div>
      </div>
    </AdminSectionCard>
  );
}
