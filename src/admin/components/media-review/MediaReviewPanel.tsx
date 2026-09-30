import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import type {
  MediaAssignmentReviewItem,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkIntendedUse,
} from "../../../models/media";
import { Button } from "../../../components/ui/Button";
import { cx } from "../../../utils/format";
import { MediaAssignmentActionPanel } from "./MediaAssignmentActionPanel";
import { MediaReviewDetailPanel } from "./MediaReviewDetailPanel";
import { AssignmentActionBar } from "./AssignmentActionBar";
import type { MediaReviewAction, MediaReviewAssignmentDraft, MediaReviewOperationResult, MediaReviewOperationState } from "../../services/mediaReview/mediaReviewTypes";

interface MediaReviewPanelProps {
  item: MediaAssignmentReviewItem | null;
  artists: readonly ArtistAdminRecord[];
  releases: readonly SongReleaseAdminRecord[];
  onClose: () => void;
  onAssign: (reviewItemId: string, assignment: {
    entityType: MediaAssetLinkEntityType;
    entityId: string;
    fieldKey: MediaAssetLinkFieldKey;
    intendedUse: MediaAssetLinkIntendedUse;
    replaceExisting: boolean;
  }) => Promise<MediaReviewOperationResult>;
  onKeepUnassigned: (reviewItemId: string) => Promise<boolean>;
  onArchive: (reviewItemId: string) => Promise<boolean>;
  onRetry: (reviewItemId: string) => Promise<boolean>;
}

const draftToAssignment = (draft: MediaReviewAssignmentDraft) => ({
  entityType: draft.entityType as MediaAssetLinkEntityType,
  entityId: draft.entityId,
  fieldKey: draft.fieldKey as MediaAssetLinkFieldKey,
  intendedUse: draft.intendedUse as MediaAssetLinkIntendedUse,
  replaceExisting: draft.replaceExisting,
});

export function MediaReviewPanel({ item, artists, releases, onClose, onAssign, onKeepUnassigned, onArchive, onRetry }: MediaReviewPanelProps) {
  const [draft, setDraft] = useState<MediaReviewAssignmentDraft | null>(null);
  const [initialDraftKey, setInitialDraftKey] = useState("");
  const [operationState, setOperationState] = useState<MediaReviewOperationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const draftKey = useMemo(() => JSON.stringify(draft), [draft]);
  const hasUnsavedChanges = Boolean(draft && initialDraftKey && draftKey !== initialDraftKey);

  useEffect(() => {
    if (!item) return;
    setOperationState("idle");
    setError(null);
    setDraft(null);
    setInitialDraftKey("");
    window.setTimeout(() => headingRef.current?.focus(), 40);
  }, [item?.reviewItemId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !item) return;
      event.preventDefault();
      if (hasUnsavedChanges && !window.confirm("Discard unsaved review changes?")) return;
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, item, onClose]);

  const handleDraftChange = useCallback((nextDraft: MediaReviewAssignmentDraft) => {
    setDraft(nextDraft);
    setInitialDraftKey((current) => current || JSON.stringify(nextDraft));
  }, []);

  const closeSafely = useCallback(() => {
    if (hasUnsavedChanges && !window.confirm("Discard unsaved review changes?")) return;
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const runAction = useCallback(async (action: MediaReviewAction) => {
    if (!item) return;
    setError(null);
    const finish = (result: boolean | MediaReviewOperationResult, final = false) => {
      const success = typeof result === "boolean" ? result : result.ok;
      const message = typeof result === "boolean" ? undefined : result.message;
      setOperationState(success ? "success" : "error");
      if (success && final) window.setTimeout(onClose, 260);
      if (!success) setError(message || "Media review operation failed. The panel stayed open so you can correct it and retry.");
    };
    if (action === "assign" || action === "assign_and_complete") {
      if (!draft) {
        setError("Assignment details are still loading.");
        return;
      }
      setOperationState("assigning");
      finish(await onAssign(item.reviewItemId, draftToAssignment(draft)), action === "assign_and_complete");
      return;
    }
    if (action === "complete") {
      setOperationState("completing");
      finish(true, true);
      return;
    }
    if (action === "ignore") {
      setOperationState("completing");
      finish(await onKeepUnassigned(item.reviewItemId), true);
      return;
    }
    if (action === "archive" || action === "quarantine" || action === "reject") {
      if (!window.confirm("Archive this media asset and remove it from the active review queue?")) return;
      setOperationState("quarantining");
      finish(await onArchive(item.reviewItemId), true);
      return;
    }
    if (action === "retry") {
      setOperationState("retrying");
      finish(await onRetry(item.reviewItemId), false);
    }
  }, [draft, item, onArchive, onAssign, onClose, onKeepUnassigned, onRetry]);

  return (
    <>
      {item ? <div className="fixed inset-0 z-30 bg-black/28 backdrop-blur-[1px] xl:bg-transparent xl:backdrop-blur-none" aria-hidden /> : null}
      <div
        className={cx(
          "fixed bottom-0 right-0 top-0 z-40 w-full transform border-l border-anm-blue/35 bg-[#080b14] shadow-[0_0_0_1px_rgba(255,255,255,0.08),-24px_0_70px_rgba(0,0,0,0.72)] transition-transform duration-[var(--admin-panel-transition-duration)] ease-anm-out motion-reduce:transition-none md:w-[min(44rem,86vw)] xl:top-0 xl:w-[var(--admin-review-panel-width)]",
          item ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!item}
      >
      {item ? (
        <section className="flex h-full flex-col" aria-labelledby="media-review-panel-title">
          <AssignmentActionBar item={item} draft={draft} operationState={operationState} hasUnsavedChanges={hasUnsavedChanges} error={error} onAction={runAction} onClose={closeSafely} />
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="media-review-panel-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-white outline-none">
                  Review {item.asset.title}
                </h2>
                <p className="mt-1 text-sm text-white/50">{item.assetId}</p>
              </div>
              <Button type="button" variant="glass" size="sm" onClick={() => window.open(`/admin/media/${item.assetId}/edit`, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open Asset
              </Button>
            </div>
            <div className="grid gap-4">
              <MediaReviewDetailPanel item={item} onClose={closeSafely} embedded />
              <MediaAssignmentActionPanel
                item={item}
                artists={artists}
                releases={releases}
                onAssign={(reviewItemId, assignment) => void onAssign(reviewItemId, assignment).then((result) => {
                  if (result.ok) setOperationState("success");
                  else {
                    setOperationState("error");
                    setError(result.message || "Assignment failed. Please review validation details and try again.");
                  }
                })}
                onKeepUnassigned={(reviewItemId) => void onKeepUnassigned(reviewItemId)}
                onArchive={(reviewItemId) => void onArchive(reviewItemId)}
                showFooterActions={false}
                onDraftChange={handleDraftChange}
              />
            </div>
          </div>
        </section>
      ) : null}
      </div>
    </>
  );
}
