import { Archive, Eye, Pencil, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import type { ArtistAdminRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";
import {
  useArchiveAdminArtist,
  useDeleteAdminArtist,
  usePublishAdminArtist,
  useRestoreAdminArtist,
  useUnpublishAdminArtist,
} from "../../../hooks/admin/useAdminContent";
import { getArtistPublicVisibilityState } from "../../utils/adminArtistUtils";

interface AdminArtistActionsProps {
  artist: ArtistAdminRecord;
}

export function AdminArtistActions({ artist }: AdminArtistActionsProps) {
  const isPublic = getArtistPublicVisibilityState(artist) === "public";
  const publishArtist = usePublishAdminArtist();
  const unpublishArtist = useUnpublishAdminArtist();
  const archiveArtist = useArchiveAdminArtist();
  const restoreArtist = useRestoreAdminArtist();
  const deleteArtist = useDeleteAdminArtist();
  const lifecyclePending =
    publishArtist.isPending ||
    unpublishArtist.isPending ||
    archiveArtist.isPending ||
    restoreArtist.isPending ||
    deleteArtist.isPending;

  const handleArtistResult = (result: Awaited<ReturnType<typeof publishArtist.mutateAsync>>) => {
    if (!result.ok) window.alert(result.error.message);
  };

  const moveToRoster = async () => {
    if (artist.status === "archived") {
      const restored = await restoreArtist.mutateAsync(artist.artistId);
      if (!restored.ok) {
        window.alert(restored.error.message);
        return;
      }
    }
    handleArtistResult(await publishArtist.mutateAsync(artist.artistId));
  };

  const moveToDreamedUp = async () => {
    if (artist.status === "archived") {
      handleArtistResult(await restoreArtist.mutateAsync(artist.artistId));
      return;
    }
    if (artist.status === "active") {
      handleArtistResult(await unpublishArtist.mutateAsync(artist.artistId));
      return;
    }
  };

  const moveToRetired = async () => {
    handleArtistResult(await archiveArtist.mutateAsync(artist.artistId));
  };

  const runDelete = async () => {
    const confirmed = window.confirm(`Delete "${artist.displayName || artist.name || "this artist"}"? This removes the artist from roster management and public discovery. Existing audit history is preserved.`);
    if (!confirmed) return;
    const result = await deleteArtist.mutateAsync(artist.artistId);
    if (!result.ok) window.alert(result.error.message);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isPublic ? (
        <LinkButton to={`/artists/${artist.slug}`} variant="glass" size="sm" aria-label={`Open public profile for ${artist.displayName}`}>
          <Eye className="h-4 w-4" aria-hidden />
          Public
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" size="sm" disabled>
          Not Public
        </Button>
      )}
      <LinkButton to={`/admin/artists/${artist.artistId}/edit`} variant="glass" size="sm" aria-label={`Edit ${artist.displayName}`}>
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </LinkButton>
      {artist.status !== "active" ? (
        <Button type="button" variant="primary" size="sm" onClick={moveToRoster} disabled={lifecyclePending} isLoading={publishArtist.isPending} aria-label={`Move ${artist.displayName} to published roster`}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Move to Roster
        </Button>
      ) : null}
      {artist.status !== "draft" ? (
        <Button type="button" variant="glass" size="sm" onClick={moveToDreamedUp} disabled={lifecyclePending} isLoading={unpublishArtist.isPending || restoreArtist.isPending} aria-label={`Move ${artist.displayName} to dreamed up artists`}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Move to Draft
        </Button>
      ) : null}
      {artist.status !== "archived" ? (
        <Button type="button" variant="glass" size="sm" onClick={moveToRetired} disabled={lifecyclePending} isLoading={archiveArtist.isPending} aria-label={`Move ${artist.displayName} to retired artists`}>
          <Archive className="h-4 w-4" aria-hidden />
          Retire
        </Button>
      ) : null}
      <Button type="button" variant="danger" size="sm" onClick={runDelete} disabled={lifecyclePending} isLoading={deleteArtist.isPending} aria-label={`Delete ${artist.displayName}`}>
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete
      </Button>
    </div>
  );
}
