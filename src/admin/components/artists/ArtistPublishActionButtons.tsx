import { Archive, Eye, UploadCloud } from "lucide-react";
import type { ArtistAdminRecord, ArtistPublishReadiness } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";

interface ArtistPublishActionButtonsProps {
  artist: ArtistAdminRecord;
  readiness: ArtistPublishReadiness;
  isSaving?: boolean;
  pendingAction?: "activate" | "archive" | "restore";
  isDirty?: boolean;
  onActivate?: () => void;
  onArchive?: () => void;
}

export function ArtistPublishActionButtons({ artist, readiness, isSaving = false, pendingAction, isDirty = false, onActivate, onArchive }: ArtistPublishActionButtonsProps) {
  const archiveAction = artist.status === "archived" ? "restore" : "archive";
  const activateLabel = pendingAction === "activate"
    ? isDirty ? "Saving & Activating" : artist.status === "active" ? "Republishing" : "Activating"
    : isDirty
      ? artist.status === "active" ? "Save & Republish" : "Save & Activate"
      : artist.status === "active" ? "Republish" : "Activate";

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={readiness.ready ? "primary" : "disabled"} disabled={!readiness.ready || isSaving} isLoading={pendingAction === "activate"} onClick={onActivate}>
        <UploadCloud className="h-4 w-4" aria-hidden />
        {activateLabel}
      </Button>
      <Button type="button" variant="glass" disabled={isSaving} isLoading={pendingAction === archiveAction} onClick={onArchive}>
        <Archive className="h-4 w-4" aria-hidden />
        {pendingAction === "restore" ? "Restoring" : pendingAction === "archive" ? "Archiving" : artist.status === "archived" ? "Restore" : "Archive"}
      </Button>
      {readiness.ready || artist.status === "active" ? (
        <LinkButton to={artist.status === "active" ? `/artists/${artist.slug}` : `/admin/preview/artist/${artist.artistId}`} variant="glass">
          <Eye className="h-4 w-4" aria-hidden />
          Preview
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" disabled>Preview Blocked</Button>
      )}
    </div>
  );
}
