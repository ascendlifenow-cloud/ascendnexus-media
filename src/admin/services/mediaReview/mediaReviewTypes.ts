import type { MediaAssignmentReviewItem } from "../../../models/media";

export type MediaReviewAction =
  | "review"
  | "save_classification"
  | "assign"
  | "assign_and_complete"
  | "complete"
  | "retry"
  | "reject"
  | "quarantine"
  | "ignore"
  | "archive";

export type MediaReviewOperationState =
  | "idle"
  | "validating"
  | "saving"
  | "assigning"
  | "approving"
  | "rejecting"
  | "quarantining"
  | "retrying"
  | "completing"
  | "success"
  | "error";

export interface MediaReviewAssignmentDraft {
  entityType: string;
  entityId: string;
  fieldKey: string;
  intendedUse: string;
  replaceExisting: boolean;
  compatible: boolean;
  blockingIssues: string[];
}

export interface MediaReviewActionState {
  action: MediaReviewAction;
  label: string;
  busyLabel: string;
  disabledReason?: string;
  enabled: boolean;
  final: boolean;
}

export interface MediaReviewPanelResult {
  item: MediaAssignmentReviewItem;
  final: boolean;
}

export interface MediaReviewOperationResult {
  ok: boolean;
  message?: string;
}
