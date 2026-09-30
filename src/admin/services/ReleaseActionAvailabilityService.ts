import type { ReleaseActionAvailability, ReleaseActionContext, ReleaseEditorAction } from "./releaseEditorTypes";

const allActions: ReleaseEditorAction[] = ["save_draft", "save_changes", "save_and_republish", "archive", "preview", "cancel"];

const actionCopy: Record<ReleaseEditorAction, Pick<ReleaseActionAvailability, "label" | "runningLabel" | "successLabel">> = {
  save_draft: { label: "Save Draft", runningLabel: "Saving Draft", successLabel: "Draft Saved" },
  save_changes: { label: "Save Changes", runningLabel: "Saving Changes", successLabel: "Changes Saved" },
  save_and_republish: { label: "Save & Republish", runningLabel: "Republishing", successLabel: "Republished" },
  archive: { label: "Archive", runningLabel: "Archiving", successLabel: "Archived" },
  preview: { label: "Preview Release", runningLabel: "Preparing Preview", successLabel: "Preview Ready" },
  cancel: { label: "Cancel", runningLabel: "Cancelling", successLabel: "Cancelled" },
};

export class ReleaseActionAvailabilityService {
  getAvailableActions(context: ReleaseActionContext): ReleaseActionAvailability[] {
    const primary = this.getPrimaryAction(context);
    return allActions.map((action) => ({
      action,
      ...actionCopy[action],
      enabled: this.isActionEnabled(action, context),
      disabledReason: this.getDisabledReason(action, context),
      primary: action === primary,
      destructive: action === "archive",
    }));
  }

  getPrimaryAction(context: ReleaseActionContext): ReleaseEditorAction {
    if (context.release.status === "archived") return "cancel";
    if (context.release.status === "published" && context.form.isDirty && context.readiness.ready) return "save_and_republish";
    if (context.form.isDirty && context.release.status === "draft") return "save_draft";
    if (context.form.isDirty) return "save_changes";
    return "preview";
  }

  getSecondaryActions(context: ReleaseActionContext): ReleaseActionAvailability[] {
    const primary = this.getPrimaryAction(context);
    return this.getAvailableActions(context).filter((action) => action.action !== primary);
  }

  isActionEnabled(action: ReleaseEditorAction, context: ReleaseActionContext): boolean {
    return !this.getDisabledReason(action, context);
  }

  getDisabledReason(action: ReleaseEditorAction, context: ReleaseActionContext): string | undefined {
    const permissions = {
      canEdit: true,
      canPublish: true,
      canArchive: true,
      canPreview: true,
      ...(context.permissions ?? {}),
    };
    const busy = context.activeOperation !== "idle" && context.activeOperation !== "error" && context.activeOperation !== "success";
    if (busy) return context.activeAction === action ? undefined : "Another release operation is running.";
    if (action !== "cancel" && context.release.status === "archived" && action !== "preview") return "Archived releases are read-only in this workflow.";
    if (action === "save_draft" && !permissions.canEdit) return "You do not have permission to edit releases.";
    if (action === "save_changes" && !permissions.canEdit) return "You do not have permission to edit releases.";
    if (action === "save_and_republish" && !permissions.canPublish) return "You do not have permission to publish releases.";
    if (action === "archive" && !permissions.canArchive) return "You do not have permission to archive releases.";
    if (action === "preview" && !permissions.canPreview) return "You do not have permission to preview releases.";
    if (action === "save_draft" && !context.form.isValid) return "Resolve validation errors before saving a draft.";
    if (action === "save_changes" && !context.form.isDirty) return "There are no unsaved changes.";
    if (action === "save_changes" && !context.form.isValid) return "Resolve validation errors before saving changes.";
    if (action === "save_and_republish" && !context.release.releaseId) return "Save the release before publishing.";
    if (action === "save_and_republish" && !context.form.isValid) return "Resolve validation errors before republishing.";
    if (action === "save_and_republish" && !context.readiness.ready) return "Resolve publish-readiness blockers before republishing.";
    if (action === "save_and_republish" && context.release.status !== "published" && context.release.status !== "draft") return "This release state cannot be published from the editor.";
    if (action === "archive" && !context.release.releaseId) return "Save the release before archiving.";
    if (action === "preview" && !context.release.releaseId) return "Save the release before previewing.";
    return undefined;
  }

  getDisabledReasonFor(action: ReleaseEditorAction, context: ReleaseActionContext): string | undefined {
    return this.getDisabledReason(action, context);
  }

  getActionLabel(action: ReleaseEditorAction, context: ReleaseActionContext): string {
    if (context.activeAction === action) {
      if (context.activeOperation === "success") return actionCopy[action].successLabel;
      if (context.activeOperation !== "idle" && context.activeOperation !== "error") return actionCopy[action].runningLabel;
    }
    if (action === "save_and_republish" && context.release.status !== "published") return "Save & Publish";
    return actionCopy[action].label;
  }

  getActionState(action: ReleaseEditorAction, context: ReleaseActionContext) {
    return context.activeAction === action ? context.activeOperation : "idle";
  }
}

export const releaseActionAvailabilityService = new ReleaseActionAvailabilityService();
