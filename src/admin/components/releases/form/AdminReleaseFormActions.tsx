import { Archive, Check, Eye, Save, UploadCloud, X } from "lucide-react";
import type { ArtistAdminRecord } from "../../../../models/admin";
import type { AdminReleaseFormState } from "../../../utils/adminReleaseFormUtils";
import { Button } from "../../../../components/ui/Button";
import { LinkButton } from "../../../../components/ui/LinkButton";

interface AdminReleaseFormActionsProps {
  state: AdminReleaseFormState;
  artist: ArtistAdminRecord | null;
  isSaving: boolean;
  pendingAction?: "save_draft" | "save_changes" | "publish" | "archive" | "restore";
  isDirty: boolean;
  onSaveDraft: () => void;
  onSave: () => void;
  onPublish?: () => void;
  onArchive?: () => void;
  publishReady?: boolean;
  onCancel: () => void;
}

export function AdminReleaseFormActions({
  state,
  isSaving,
  pendingAction,
  isDirty,
  onSaveDraft,
  onSave,
  onPublish,
  onArchive,
  publishReady = false,
  onCancel,
}: AdminReleaseFormActionsProps) {
  const canPreviewSavedRecord = Boolean(state.releaseId);
  const archiveAction = state.status === "archived" ? "restore" : "archive";
  const publishLabel = pendingAction === "publish"
    ? isDirty ? "Saving & Publishing" : "Publishing"
    : isDirty
      ? state.status === "published" ? "Save & Republish" : "Save & Publish"
      : state.status === "published" ? "Republish" : "Publish";

  return (
    <div className="sticky bottom-4 z-10 rounded-anm-panel border border-white/10 bg-anm-surface/95 p-4 shadow-anm-card-glow backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="glass" onClick={onSaveDraft} disabled={isSaving} isLoading={pendingAction === "save_draft"}>
          <Save className="h-4 w-4" aria-hidden />
          {pendingAction === "save_draft" ? "Saving Draft" : "Save Draft"}
        </Button>
        <Button type="button" variant="primary" onClick={onSave} disabled={isSaving} isLoading={pendingAction === "save_changes"}>
          <Check className="h-4 w-4" aria-hidden />
          {pendingAction === "save_changes" ? "Saving Changes" : "Save Changes"}
        </Button>
        <Button type="button" variant={publishReady ? "primary" : "disabled"} disabled={!publishReady || isSaving} isLoading={pendingAction === "publish"} onClick={onPublish}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          {publishLabel}
        </Button>
        <Button type="button" variant="glass" disabled={!canPreviewSavedRecord || isSaving} isLoading={pendingAction === archiveAction} onClick={onArchive}>
          <Archive className="h-4 w-4" aria-hidden />
          {pendingAction === "restore" ? "Restoring" : pendingAction === "archive" ? "Archiving" : state.status === "archived" ? "Restore" : "Archive"}
        </Button>
        {canPreviewSavedRecord ? (
          <LinkButton to={`/admin/preview/release/${state.releaseId}`} variant="glass">
            <Eye className="h-4 w-4" aria-hidden />
            Preview Release
          </LinkButton>
        ) : (
          <Button type="button" variant="disabled" disabled>
            Save to Preview
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden />
          Cancel
        </Button>
        {isDirty ? <span className="ml-auto text-sm font-semibold text-anm-gold">Unsaved changes</span> : null}
      </div>
    </div>
  );
}
