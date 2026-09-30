import type { ReleasePublishReadiness, SongReleaseAdminRecord } from "../../models/admin";
import type { AdminReleaseFormState } from "../utils/adminReleaseFormUtils";

export type ReleasePublishedStatus =
  | "draft"
  | "changes_unsaved"
  | "changes_saved"
  | "ready_to_publish"
  | "published"
  | "published_with_draft_changes"
  | "scheduled"
  | "republish_required"
  | "publishing"
  | "republishing"
  | "archive_pending"
  | "archived"
  | "publication_failed"
  | "unavailable";

export type ReleaseEditorAction =
  | "save_draft"
  | "save_changes"
  | "save_and_republish"
  | "archive"
  | "preview"
  | "cancel";

export type ReleaseActionOperationState =
  | "idle"
  | "validating"
  | "saving"
  | "publishing"
  | "republishing"
  | "archiving"
  | "previewing"
  | "cancelling"
  | "success"
  | "error";

export interface ReleaseEditorFormStateSummary {
  isDirty: boolean;
  isValid: boolean;
  validationErrorCount: number;
}

export interface ReleaseActionContext {
  release: SongReleaseAdminRecord;
  formState: AdminReleaseFormState;
  form: ReleaseEditorFormStateSummary;
  readiness: ReleasePublishReadiness;
  activeAction?: ReleaseEditorAction;
  activeOperation: ReleaseActionOperationState;
  permissions?: {
    canEdit?: boolean;
    canPublish?: boolean;
    canArchive?: boolean;
    canPreview?: boolean;
  };
}

export interface ReleaseActionAvailability {
  action: ReleaseEditorAction;
  label: string;
  runningLabel: string;
  successLabel: string;
  enabled: boolean;
  disabledReason?: string;
  primary: boolean;
  destructive?: boolean;
}

export interface ReleaseEditorActionResult {
  action: ReleaseEditorAction;
  success: boolean;
  release?: SongReleaseAdminRecord;
  publicationStatus?: ReleasePublishedStatus;
  readiness?: ReleasePublishReadiness;
  warnings: string[];
  errors: string[];
  closePanel: boolean;
  completedAt: string;
}
