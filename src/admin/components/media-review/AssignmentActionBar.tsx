import { CheckCircle2, Loader2, X } from "lucide-react";
import type { MediaAssignmentReviewItem } from "../../../models/media";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { MediaReviewStateBadge } from "./MediaReviewStateBadge";
import { mediaReviewActionStateService } from "../../services/mediaReview/MediaReviewActionStateService";
import type { MediaReviewAction, MediaReviewAssignmentDraft, MediaReviewOperationState } from "../../services/mediaReview/mediaReviewTypes";
import { formatMediaReviewDisplayState, mapMediaReviewDisplayState } from "../../services/mediaReview/mediaReviewStateMapper";

interface AssignmentActionBarProps {
  item: MediaAssignmentReviewItem;
  draft: MediaReviewAssignmentDraft | null;
  operationState: MediaReviewOperationState;
  hasUnsavedChanges: boolean;
  error?: string | null;
  onAction: (action: MediaReviewAction) => void;
  onClose: () => void;
}

export function AssignmentActionBar({ item, draft, operationState, hasUnsavedChanges, error, onAction, onClose }: AssignmentActionBarProps) {
  const primary = mediaReviewActionStateService.getPrimaryAction(item, draft, operationState);
  const secondary = mediaReviewActionStateService.getSecondaryActions(item, draft, operationState);
  const displayState = mapMediaReviewDisplayState(item);
  const targetSummary = draft?.entityId.trim() ? `${draft.entityType} / ${draft.entityId}` : "No target selected";
  const valid = draft?.compatible && draft.entityId.trim();
  const busy = operationState !== "idle" && operationState !== "success" && operationState !== "error";

  return (
    <header className="sticky top-0 z-10 rounded-t-md border-b border-anm-blue/30 bg-[#0d1220]/98 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MediaReviewStateBadge state={item.assignmentState} />
            <Badge variant={valid ? "sunrise" : "neutral"}>{valid ? "Validation passed" : "Needs validation"}</Badge>
            {hasUnsavedChanges ? <Badge variant="purple">Unsaved changes</Badge> : null}
            {operationState === "success" ? <Badge variant="sunrise">Saved</Badge> : null}
            {busy ? <Badge variant="neutral"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />Working</Badge> : null}
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-white">{formatMediaReviewDisplayState(displayState)} · {targetSummary}</p>
          {error ? <p className="mt-1 text-sm text-anm-pink" role="alert">{error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {secondary.slice(0, 3).map((action) => (
            <Button
              key={action.action}
              type="button"
              variant="glass"
              size="sm"
              disabled={!action.enabled}
              title={action.disabledReason}
              aria-label={action.disabledReason ? `${action.label}. ${action.disabledReason}` : action.label}
              onClick={() => onAction(action.action)}
            >
              {action.label}
            </Button>
          ))}
          {primary ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={busy}
              disabled={!primary.enabled}
              title={primary.disabledReason}
              aria-label={primary.disabledReason ? `${primary.label}. ${primary.disabledReason}` : primary.label}
              onClick={() => onAction(primary.action)}
            >
              {operationState === "success" ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
              {primary.label}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="icon" aria-label="Close review panel" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  );
}
