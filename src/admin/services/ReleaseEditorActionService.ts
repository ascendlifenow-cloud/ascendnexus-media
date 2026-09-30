import type { ReleasePublishReadiness, SongReleaseAdminRecord } from "../../models/admin";
import type { ReleaseEditorAction, ReleaseEditorActionResult, ReleasePublishedStatus } from "./releaseEditorTypes";

export class ReleaseEditorActionService {
  createSuccessResult(input: {
    action: ReleaseEditorAction;
    release?: SongReleaseAdminRecord;
    publicationStatus?: ReleasePublishedStatus;
    readiness?: ReleasePublishReadiness;
    closePanel?: boolean;
    warnings?: string[];
  }): ReleaseEditorActionResult {
    return {
      action: input.action,
      success: true,
      release: input.release,
      publicationStatus: input.publicationStatus,
      readiness: input.readiness,
      warnings: input.warnings ?? [],
      errors: [],
      closePanel: input.closePanel ?? true,
      completedAt: new Date().toISOString(),
    };
  }

  createErrorResult(input: {
    action: ReleaseEditorAction;
    error: string;
    release?: SongReleaseAdminRecord;
    readiness?: ReleasePublishReadiness;
    closePanel?: boolean;
  }): ReleaseEditorActionResult {
    return {
      action: input.action,
      success: false,
      release: input.release,
      readiness: input.readiness,
      warnings: [],
      errors: [input.error],
      closePanel: input.closePanel ?? false,
      completedAt: new Date().toISOString(),
    };
  }

  shouldCloseAfterAction(result: ReleaseEditorActionResult): boolean {
    return result.success && result.closePanel;
  }
}

export const releaseEditorActionService = new ReleaseEditorActionService();
