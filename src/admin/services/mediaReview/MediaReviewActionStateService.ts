import type { MediaAssignmentReviewItem } from "../../../models/media";
import type { MediaReviewAction, MediaReviewActionState, MediaReviewAssignmentDraft, MediaReviewOperationState } from "./mediaReviewTypes";
import { mapMediaReviewDisplayState } from "./mediaReviewStateMapper";

const busyByAction: Partial<Record<MediaReviewAction, MediaReviewOperationState>> = {
  save_classification: "saving",
  assign: "assigning",
  assign_and_complete: "assigning",
  complete: "completing",
  retry: "retrying",
  reject: "rejecting",
  quarantine: "quarantining",
  ignore: "completing",
  archive: "quarantining",
};

export const mediaReviewActionStateService = {
  getAvailableActions(item: MediaAssignmentReviewItem | null, draft: MediaReviewAssignmentDraft | null, operation: MediaReviewOperationState): MediaReviewActionState[] {
    if (!item) return [];
    const busy = operation !== "idle" && operation !== "success" && operation !== "error";
    const displayState = mapMediaReviewDisplayState(item);
    const draftReady = Boolean(draft?.entityId.trim()) && Boolean(draft?.compatible);
    const draftIssue = !draft?.entityId.trim()
      ? "A target artist, release, or entity must be selected."
      : draft?.blockingIssues.length
        ? draft.blockingIssues[0]
        : undefined;

    const make = (action: MediaReviewAction, label: string, busyLabel: string, enabled = true, final = false, disabledReason?: string): MediaReviewActionState => ({
      action,
      label: busy && busyByAction[action] === operation ? busyLabel : label,
      busyLabel,
      enabled: enabled && !busy,
      final,
      disabledReason: busy ? "Another review operation is already in progress." : disabledReason,
    });

    const actions: MediaReviewActionState[] = [];
    if (displayState === "failed") actions.push(make("retry", "Retry", "Retrying", true, false));
    actions.push(make("assign", displayState === "ready_to_complete" ? "Update Assignment" : "Assign Asset", "Assigning", draftReady, false, draftReady ? undefined : draftIssue));
    actions.push(make("assign_and_complete", "Assign & Complete", "Assigning", draftReady, true, draftReady ? undefined : draftIssue));
    actions.push(make("complete", "Complete Review", "Completing", displayState === "ready_to_complete", true, displayState === "ready_to_complete" ? undefined : "Assign the asset or explicitly ignore it before completion."));
    actions.push(make("ignore", "Ignore", "Completing", true, true));
    actions.push(make("archive", "Archive", "Archiving", true, true));
    return actions;
  },

  getPrimaryAction(item: MediaAssignmentReviewItem | null, draft: MediaReviewAssignmentDraft | null, operation: MediaReviewOperationState): MediaReviewActionState | null {
    const actions = this.getAvailableActions(item, draft, operation);
    if (!item) return null;
    const displayState = mapMediaReviewDisplayState(item);
    if (displayState === "failed") return actions.find((action) => action.action === "retry") ?? null;
    if (displayState === "ready_to_complete") return actions.find((action) => action.action === "complete") ?? null;
    return actions.find((action) => action.action === "assign") ?? null;
  },

  getSecondaryActions(item: MediaAssignmentReviewItem | null, draft: MediaReviewAssignmentDraft | null, operation: MediaReviewOperationState): MediaReviewActionState[] {
    const primary = this.getPrimaryAction(item, draft, operation);
    return this.getAvailableActions(item, draft, operation).filter((action) => action.action !== primary?.action);
  },
};
