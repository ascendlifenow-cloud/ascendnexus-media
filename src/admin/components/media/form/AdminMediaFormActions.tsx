import { Archive, Check, Clipboard, Eye, Save, UploadCloud, X } from "lucide-react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminMediaFormState } from "../../../utils/adminMediaFormUtils";
import { getMediaAssetPublicVisibilityState } from "../../../utils/adminMediaFormUtils";
import { Button } from "../../../../components/ui/Button";

interface AdminMediaFormActionsProps {
  state: AdminMediaFormState;
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  isSaving: boolean;
  isDirty: boolean;
  onSaveDraft: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AdminMediaFormActions({
  state,
  selectedArtist,
  selectedRelease,
  isSaving,
  isDirty,
  onSaveDraft,
  onSave,
  onCancel,
}: AdminMediaFormActionsProps) {
  const isPublic =
    getMediaAssetPublicVisibilityState(
      state,
      state.ownerType === "artist" ? selectedArtist : null,
      state.ownerType === "release" ? selectedRelease : null,
    ) === "public";

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
        <Button type="button" variant="glass" disabled>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Publish
        </Button>
        <Button type="button" variant="glass" disabled>
          <Archive className="h-4 w-4" aria-hidden />
          {state.status === "archived" ? "Restore" : "Archive"}
        </Button>
        <Button type="button" variant={isPublic ? "glass" : "disabled"} disabled={!isPublic}>
          <Eye className="h-4 w-4" aria-hidden />
          Preview Asset
        </Button>
        <Button type="button" variant={state.url ? "glass" : "disabled"} disabled>
          <Clipboard className="h-4 w-4" aria-hidden />
          Copy URL
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden />
          Cancel
        </Button>
        {isDirty ? <span className="ml-auto text-sm font-semibold text-anm-gold">Unsaved changes</span> : null}
      </div>
    </div>
  );
}
