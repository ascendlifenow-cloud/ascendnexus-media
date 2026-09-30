import type { MediaPublicationStage } from "../../../models/publication";
import { Badge } from "../../../components/ui/Badge";

const variantForStatus = (status: MediaPublicationStage["status"]) =>
  status === "completed" ? "sunrise" : status === "failed" || status === "blocked" ? "pink" : status === "active" ? "purple" : "neutral";

export function MediaPublicationStageList({ stages }: { stages: MediaPublicationStage[] }) {
  return (
    <div className="grid gap-2">
      {stages.map((stage) => (
        <div key={stage.stageId} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/18 p-3 text-sm">
          <span className="text-white/78">{stage.stageType.replace(/_/g, " ")}</span>
          <Badge variant={variantForStatus(stage.status)}>{stage.status.replace(/_/g, " ")}</Badge>
        </div>
      ))}
      {!stages.length ? <p className="text-sm text-white/55">No publication stages have been created yet.</p> : null}
    </div>
  );
}
