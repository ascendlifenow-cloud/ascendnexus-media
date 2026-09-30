import type { MediaAssignmentReviewItem } from "../../../models/media";

export type MediaReviewDisplayState =
  | "unreviewed"
  | "reviewing"
  | "classification_required"
  | "match_required"
  | "assignment_required"
  | "processing"
  | "ready_to_complete"
  | "assigned"
  | "completed"
  | "rejected"
  | "quarantined"
  | "failed";

export const mapMediaReviewDisplayState = (item: MediaAssignmentReviewItem | null): MediaReviewDisplayState => {
  if (!item) return "unreviewed";
  if (item.assignmentState === "assignment_failed") return "failed";
  if (item.assignmentState === "assigned") return "ready_to_complete";
  if (item.assignmentState === "kept_unassigned") return "completed";
  if (item.assignmentState === "archived") return "quarantined";
  if (item.status === "in_review") return "reviewing";
  if (!item.suggestedEntityType) return "classification_required";
  if (!item.suggestedEntityId) return "match_required";
  return "assignment_required";
};

export const formatMediaReviewDisplayState = (state: MediaReviewDisplayState): string =>
  state.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
