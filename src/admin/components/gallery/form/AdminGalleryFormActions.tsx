import { Archive, Check, Eye, Save, UploadCloud, X } from "lucide-react";
import type { ArtistAdminRecord, MediaAssetRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminGalleryFormState } from "../../../utils/adminGalleryFormUtils";
import { Button } from "../../../../components/ui/Button";
import { LinkButton } from "../../../../components/ui/LinkButton";

interface AdminGalleryFormActionsProps {
  state: AdminGalleryFormState;
  selectedMediaAsset: MediaAssetRecord | null;
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  isSaving: boolean;
  isDirty: boolean;
  onSaveDraft: () => void;
  onSave: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onCancel: () => void;
}

export function AdminGalleryFormActions({
  state,
  isSaving,
  isDirty,
  onSaveDraft,
  onSave,
  onPublish,
  onArchive,
  onRestore,
  onCancel,
}: AdminGalleryFormActionsProps) {
  const canPreviewSavedRecord = Boolean(state.galleryItemId);
  const canLifecycle = Boolean(state.galleryItemId) && !isSaving;

  return (
    <div className="sticky bottom-4 z-10 rounded-anm-panel border border-white/10 bg-anm-surface/95 p-4 shadow-anm-card-glow backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="glass" onClick={onSaveDraft} disabled={isSaving} isLoading={isSaving}>
          <Save className="h-4 w-4" aria-hidden />
          Save Draft
        </Button>
        <Button type="button" variant="primary" onClick={onSave} disabled={isSaving} isLoading={isSaving}>
          <Check className="h-4 w-4" aria-hidden />
          Save Changes
        </Button>
        <Button type="button" variant="glass" disabled={!canLifecycle || state.status === "published"} onClick={onPublish}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Publish
        </Button>
        <Button
          type="button"
          variant="glass"
          disabled={!canLifecycle}
          onClick={state.status === "archived" ? onRestore : onArchive}
        >
          <Archive className="h-4 w-4" aria-hidden />
          {state.status === "archived" ? "Restore" : "Archive"}
        </Button>
        {canPreviewSavedRecord ? (
          <LinkButton to={`/admin/preview/gallery/${state.galleryItemId}`} variant="glass">
            <Eye className="h-4 w-4" aria-hidden />
            Preview Gallery
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
