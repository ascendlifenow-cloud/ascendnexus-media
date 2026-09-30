import { Archive, Eye, UploadCloud } from "lucide-react";
import type { ReleasePublishReadiness, SongReleaseAdminRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";

interface ReleasePublishActionButtonsProps {
  release: SongReleaseAdminRecord;
  readiness: ReleasePublishReadiness;
  isSaving?: boolean;
  pendingAction?: "publish" | "archive" | "restore";
  isDirty?: boolean;
  onPublish?: () => void;
  onArchive?: () => void;
}

export function ReleasePublishActionButtons({ release, readiness, isSaving = false, pendingAction, isDirty = false, onPublish, onArchive }: ReleasePublishActionButtonsProps) {
  const archiveAction = release.status === "archived" ? "restore" : "archive";
  const publishLabel = pendingAction === "publish"
    ? isDirty ? "Saving & Publishing" : "Publishing"
    : isDirty
      ? release.status === "published" ? "Save & Republish" : "Save & Publish"
      : release.status === "published" ? "Republish" : "Publish";

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={readiness.ready ? "primary" : "disabled"} disabled={!readiness.ready || isSaving} isLoading={pendingAction === "publish"} onClick={onPublish}>
        <UploadCloud className="h-4 w-4" aria-hidden />
        {publishLabel}
      </Button>
      <Button type="button" variant="glass" disabled={isSaving} isLoading={pendingAction === archiveAction} onClick={onArchive}>
        <Archive className="h-4 w-4" aria-hidden />
        {pendingAction === "restore" ? "Restoring" : pendingAction === "archive" ? "Archiving" : release.status === "archived" ? "Restore" : "Archive"}
      </Button>
      {readiness.ready || release.status === "published" ? (
        <LinkButton to={release.status === "published" ? `/songs/${release.slug}` : `/admin/preview/release/${release.releaseId}`} variant="glass">
          <Eye className="h-4 w-4" aria-hidden />
          Preview
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" disabled>Preview Blocked</Button>
      )}
    </div>
  );
}
