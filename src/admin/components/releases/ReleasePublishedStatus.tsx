import { AlertTriangle, PanelRightOpen } from "lucide-react";
import type { ReleasePublishReadiness, SongReleaseAdminRecord } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { cx } from "../../../utils/format";
import type { ReleasePublishedStatus as ReleasePublishedStatusValue } from "../../services/releaseEditorTypes";
import { releasePublishedStatusService } from "../../services/ReleasePublishedStatusService";

interface ReleasePublishedStatusProps {
  release: SongReleaseAdminRecord;
  readiness: ReleasePublishReadiness;
  isDirty: boolean;
  activePublicationAction?: "publish" | "republish" | "archive";
  onOpenPanel: () => void;
}

const severityClasses: Record<string, string> = {
  neutral: "border-white/12 bg-white/[0.04]",
  info: "border-sky-300/24 bg-sky-300/10",
  success: "border-emerald-300/24 bg-emerald-300/10",
  warning: "border-amber-300/24 bg-amber-300/10",
  danger: "border-rose-300/24 bg-rose-300/10",
};

const badgeVariantFor = (status: ReleasePublishedStatusValue) => {
  if (status === "published" || status === "ready_to_publish" || status === "changes_saved") return "sunrise";
  if (status === "publication_failed" || status === "unavailable") return "pink";
  return "neutral";
};

export function ReleasePublishedStatus({ release, readiness, isDirty, activePublicationAction, onOpenPanel }: ReleasePublishedStatusProps) {
  const status = releasePublishedStatusService.getStatus({ release, readiness, isDirty, activePublicationAction });
  const severity = releasePublishedStatusService.getSeverity(status);
  const Icon = releasePublishedStatusService.getStatusIcon(status);
  const publishedAt = releasePublishedStatusService.getPublishedAt(release);
  const issueCount = readiness.blockingIssues.length + readiness.missingFields.length;

  return (
    <aside
      className={cx("min-w-0 rounded-anm-card border p-3", severityClasses[severity])}
      aria-label="Published status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/22">
            <Icon className="h-4 w-4 text-white" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/48">Published Status</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={badgeVariantFor(status)}>{releasePublishedStatusService.getDisplayLabel(status)}</Badge>
              {issueCount ? (
                <Badge variant="pink">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  {issueCount} blocker{issueCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-white/62">{releasePublishedStatusService.getDescription(status)}</p>
            {publishedAt ? <p className="mt-1 text-xs text-white/42">Published {new Date(publishedAt).toLocaleString()}</p> : null}
          </div>
        </div>
        <Button type="button" variant="glass" size="sm" onClick={onOpenPanel} aria-label="Open release publish readiness panel">
          <PanelRightOpen className="h-4 w-4" aria-hidden />
          Readiness
        </Button>
      </div>
    </aside>
  );
}
