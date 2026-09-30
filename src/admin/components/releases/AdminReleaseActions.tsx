import { useState } from "react";
import { Archive, Eye, MoreHorizontal, Pencil, RotateCcw, Sparkles, Trash2, UploadCloud } from "lucide-react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";
import { adminReleaseService } from "../../../services/admin";
import { releaseRouteBuilder } from "../../services/ReleaseRouteBuilder";
import { getReleasePublicVisibilityState } from "../../utils/adminReleaseUtils";
import { useArchiveAdminRelease, usePublishAdminRelease, useRestoreAdminRelease, useUnpublishAdminRelease } from "../../../hooks/admin/useAdminContent";

interface AdminReleaseActionsProps {
  release: SongReleaseAdminRecord;
  artist: ArtistAdminRecord | null;
  onReleaseUpdated?: (release: SongReleaseAdminRecord) => void;
  onReleaseDeleted?: (releaseId: string) => void;
}

export function AdminReleaseActions({ release, artist, onReleaseUpdated, onReleaseDeleted }: AdminReleaseActionsProps) {
  const [deletePending, setDeletePending] = useState(false);
  const isPublic = getReleasePublicVisibilityState(release, artist) === "public";
  const publishRelease = usePublishAdminRelease();
  const archiveRelease = useArchiveAdminRelease();
  const unpublishRelease = useUnpublishAdminRelease();
  const restoreRelease = useRestoreAdminRelease();
  const lifecycleBusy = publishRelease.isPending || archiveRelease.isPending || unpublishRelease.isPending || restoreRelease.isPending || deletePending;
  const handleReleaseResult = (result: Awaited<ReturnType<typeof publishRelease.mutateAsync>>) => {
    if (result.ok) {
      onReleaseUpdated?.(result.data);
      return;
    }
    window.alert(result.error.message);
  };
  const runLifecycle = async () => {
    if (release.status === "archived") {
      handleReleaseResult(await restoreRelease.mutateAsync(release.releaseId));
      return;
    }
    if (release.status === "published") {
      handleReleaseResult(await unpublishRelease.mutateAsync(release.releaseId));
      return;
    }
    handleReleaseResult(await publishRelease.mutateAsync(release.releaseId));
  };
  const runArchive = async () => {
    handleReleaseResult(await archiveRelease.mutateAsync(release.releaseId));
  };
  const runDelete = async () => {
    const confirmed = window.confirm(`Delete "${release.title || "this release"}"? This will remove it from release management and public discovery.`);
    if (!confirmed) return;
    setDeletePending(true);
    try {
      const result = await adminReleaseService.deleteRelease(release.releaseId);
      if (result.ok) {
        onReleaseDeleted?.(release.releaseId);
        return;
      }
      window.alert(result.error.message);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isPublic ? (
        <LinkButton to={releaseRouteBuilder.getPublicReleasePath(release)} variant="glass" size="sm" aria-label={`View public song page for ${release.title}`}>
          <Eye className="h-4 w-4" aria-hidden />
          View
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" size="sm" disabled>
          View
        </Button>
      )}
      <LinkButton to={releaseRouteBuilder.getAdminEditPath(release)} variant="glass" size="sm" aria-label={`Edit ${release.title}`}>
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </LinkButton>
      <Button type="button" variant="glass" size="sm" disabled={lifecycleBusy} aria-label={`Run lifecycle action for ${release.title}`} onClick={runLifecycle}>
        {release.status === "archived" ? <RotateCcw className="h-4 w-4" aria-hidden /> : release.status === "draft" ? <UploadCloud className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
        {release.status === "archived" ? "Restore" : release.status === "draft" ? "Publish" : "Unpublish"}
      </Button>
      {release.status !== "archived" ? (
        <Button type="button" variant="glass" size="sm" disabled={lifecycleBusy} aria-label={`Archive ${release.title}`} onClick={runArchive}>
          <Archive className="h-4 w-4" aria-hidden />
          Archive
        </Button>
      ) : null}
      <Button type="button" variant="danger" size="sm" disabled={lifecycleBusy} aria-label={`Delete ${release.title}`} onClick={runDelete} isLoading={deletePending}>
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete
      </Button>
      <Button type="button" variant="glass" size="sm" disabled aria-label={`Feature or unfeature ${release.title}`}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {release.featured ? "Unfeature" : "Feature"}
      </Button>
      <Button type="button" variant="ghost" size="icon" disabled aria-label={`More actions for ${release.title}`}>
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
