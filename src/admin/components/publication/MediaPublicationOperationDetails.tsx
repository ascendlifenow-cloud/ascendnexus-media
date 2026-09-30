import type { MediaPublicationOperation, MediaPublicationResult } from "../../../models/publication";
import { AdminSectionCard } from "../AdminSectionCard";
import { MediaPublicationProgress } from "./MediaPublicationProgress";
import { MediaPublicationRollbackButton } from "./MediaPublicationRollbackButton";
import { MediaPublicationStageList } from "./MediaPublicationStageList";

export function MediaPublicationOperationDetails({
  operation,
  result,
  onRollback,
}: {
  operation?: MediaPublicationOperation;
  result?: MediaPublicationResult;
  onRollback: () => void;
}) {
  return (
    <AdminSectionCard title="Publication Operation" description="Stage progress, promoted assets, sync result, and rollback readiness.">
      {operation ? (
        <div className="grid gap-4 text-sm text-white/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/42">{operation.actionType}</p>
              <p className="mt-1 break-all text-white">{operation.publicationOperationId}</p>
            </div>
            <MediaPublicationRollbackButton operation={operation} onRollback={onRollback} />
          </div>
          <MediaPublicationProgress operation={operation} />
          <div className="grid gap-3 md:grid-cols-3">
            <div>Status <span className="text-white">{operation.status}</span></div>
            <div>Visibility <span className="text-white">{result?.publicVisibility ?? "unknown"}</span></div>
            <div>Promoted <span className="text-white">{operation.promotedAssetIds.length}</span></div>
          </div>
          <MediaPublicationStageList stages={operation.stages} />
        </div>
      ) : (
        <p className="text-sm text-white/60">No publication operation has been started for this entity in this session.</p>
      )}
    </AdminSectionCard>
  );
}
