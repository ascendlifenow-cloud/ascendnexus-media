import type { MediaPublicationEntityType } from "../../../models/publication";
import { AdminSectionCard } from "../AdminSectionCard";
import { useMediaPublication } from "../../hooks";
import { MediaPublicationActionButtons } from "./MediaPublicationActionButtons";
import { MediaPublicationOperationDetails } from "./MediaPublicationOperationDetails";
import { MediaPublicationReadinessPanel } from "./MediaPublicationReadinessPanel";

export function MediaPublicationStatusPanel({ entityType, entityId, title }: { entityType: MediaPublicationEntityType; entityId: string; title?: string }) {
  const publication = useMediaPublication(entityType, entityId);
  return (
    <div className="grid gap-4">
      <AdminSectionCard title={title ?? "Publication Status"} description="Controlled promotion from private draft media to verified public delivery.">
        <div className="grid gap-4">
          <div className="grid gap-3 text-sm text-white/70 md:grid-cols-3">
            <div>Entity <span className="text-white">{entityType}</span></div>
            <div>ID <span className="break-all text-white">{entityId}</span></div>
            <div>State <span className="text-white">{publication.operation?.status ?? (publication.readiness?.ready ? "ready_to_publish" : "draft")}</span></div>
          </div>
          <MediaPublicationActionButtons
            readiness={publication.readiness}
            operation={publication.operation}
            busy={publication.busy}
            onPublish={() => void publication.publish()}
            onUnpublish={() => void publication.unpublish()}
            onArchive={() => void publication.archive()}
            onRestore={() => void publication.restore()}
            onRetry={() => void publication.retry()}
            onCancel={() => void publication.cancel()}
          />
          {publication.errors.length ? <div className="rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{publication.errors.join(" ")}</div> : null}
        </div>
      </AdminSectionCard>
      <MediaPublicationReadinessPanel readiness={publication.readiness} loading={publication.loading} />
      <MediaPublicationOperationDetails operation={publication.operation} result={publication.result} onRollback={() => void publication.rollback()} />
    </div>
  );
}
