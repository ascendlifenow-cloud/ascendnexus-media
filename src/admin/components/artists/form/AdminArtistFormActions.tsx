import { Archive, Check, Eye, Save, UploadCloud, X } from "lucide-react";
import type { AdminArtistFormState } from "../../../utils/adminArtistFormUtils";
import { Button } from "../../../../components/ui/Button";
import { LinkButton } from "../../../../components/ui/LinkButton";

interface AdminArtistFormActionsProps {
  state: AdminArtistFormState;
  isSaving: boolean;
  pendingAction?: "save_draft" | "save_changes" | "activate" | "archive" | "restore";
  isDirty: boolean;
  onSaveDraft: () => void;
  onSave: () => void;
  onActivate?: () => void;
  onArchive?: () => void;
  publishReady?: boolean;
  onCancel: () => void;
}

export function AdminArtistFormActions({
  state,
  isSaving,
  pendingAction,
  isDirty,
  onSaveDraft,
  onSave,
  onActivate,
  onArchive,
  publishReady = false,
  onCancel,
}: AdminArtistFormActionsProps) {
  const canPreviewSavedRecord = Boolean(state.artistId);
  const archiveAction = state.status === "archived" ? "restore" : "archive";
  const activateLabel = pendingAction === "activate"
    ? isDirty ? "Saving & Activating" : state.status === "active" ? "Republishing" : "Activating"
    : isDirty
      ? state.status === "active" ? "Save & Republish" : "Save & Activate"
      : state.status === "active" ? "Republish" : "Activate";

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
        <Button type="button" variant={publishReady ? "primary" : "disabled"} disabled={!publishReady || isSaving} isLoading={pendingAction === "activate"} onClick={onActivate}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          {activateLabel}
        </Button>
        <Button type="button" variant="glass" disabled={!canPreviewSavedRecord || isSaving} isLoading={pendingAction === archiveAction} onClick={onArchive}>
          <Archive className="h-4 w-4" aria-hidden />
          {pendingAction === "restore" ? "Restoring" : pendingAction === "archive" ? "Archiving" : state.status === "archived" ? "Restore" : "Archive"}
        </Button>
        {canPreviewSavedRecord ? (
          <LinkButton to={`/admin/preview/artist/${state.artistId}`} variant="glass">
            <Eye className="h-4 w-4" aria-hidden />
            Preview Artist
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
