import type { MediaPublicationOperation } from "../../../models/publication";

export function MediaPublicationProgress({ operation }: { operation?: MediaPublicationOperation }) {
  const stages = operation?.stages ?? [];
  const progress = stages.length ? Math.round(stages.reduce((sum, stage) => sum + (stage.status === "completed" || stage.status === "skipped" ? 100 : stage.progress), 0) / stages.length) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-white/55">
        <span>{operation?.currentStage?.replace(/_/g, " ") ?? "No active publication"}</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-anm-sunrise transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
