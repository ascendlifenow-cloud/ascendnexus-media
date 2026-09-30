export const releaseEditorErrors = {
  actionNotAvailable: "RELEASE_EDITOR_ACTION_NOT_AVAILABLE",
  unsavedChanges: "RELEASE_EDITOR_UNSAVED_CHANGES",
  recordStale: "RELEASE_EDITOR_RECORD_STALE",
  saveDraftFailed: "RELEASE_EDITOR_SAVE_DRAFT_FAILED",
  saveChangesFailed: "RELEASE_EDITOR_SAVE_CHANGES_FAILED",
  republishBlocked: "RELEASE_EDITOR_REPUBLISH_BLOCKED",
  republishFailed: "RELEASE_EDITOR_REPUBLISH_FAILED",
  archiveFailed: "RELEASE_EDITOR_ARCHIVE_FAILED",
  previewFailed: "RELEASE_EDITOR_PREVIEW_FAILED",
  readinessUnavailable: "RELEASE_EDITOR_READINESS_UNAVAILABLE",
  validationFailed: "RELEASE_EDITOR_VALIDATION_FAILED",
  permissionDenied: "RELEASE_EDITOR_PERMISSION_DENIED",
  panelLoadFailed: "RELEASE_EDITOR_PANEL_LOAD_FAILED",
  publicVerificationFailed: "RELEASE_EDITOR_PUBLIC_VERIFICATION_FAILED",
} as const;

export type ReleaseEditorErrorCode = typeof releaseEditorErrors[keyof typeof releaseEditorErrors];
