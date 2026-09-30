export interface MediaAssetReplaceOptions {
  changeReason?: string;
  preserveOldVersion?: boolean;
  updateActiveLinks?: boolean;
  updatePublicFields?: boolean;
  runValidation?: boolean;
  runVisibilityCheck?: boolean;
  createAuditEvent?: boolean;
  createdBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
