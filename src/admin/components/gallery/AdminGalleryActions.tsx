import { Archive, Eye, ExternalLink, Pencil, RotateCcw, UploadCloud } from "lucide-react";
import type { PublicGalleryItem } from "../../../models/gallery";
import { Button } from "../../../components/ui/Button";
import { LinkButton } from "../../../components/ui/LinkButton";
import {
  useArchiveAdminGalleryItem,
  usePublishAdminGalleryItem,
  useRestoreAdminGalleryItem,
  useUnpublishAdminGalleryItem,
} from "../../../hooks/admin/useAdminContent";

interface AdminGalleryActionsProps {
  item: PublicGalleryItem;
  onView: (item: PublicGalleryItem) => void;
}

export function AdminGalleryActions({ item, onView }: AdminGalleryActionsProps) {
  const publish = usePublishAdminGalleryItem();
  const unpublish = useUnpublishAdminGalleryItem();
  const archive = useArchiveAdminGalleryItem();
  const restore = useRestoreAdminGalleryItem();
  const isMutating = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;
  const isPublished = item.status === "published";
  const publicHref = `/gallery/${item.slug}`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="glass" size="sm" onClick={() => onView(item)} aria-label={`View ${item.title}`}>
        <Eye className="h-4 w-4" aria-hidden />
        View
      </Button>
      <LinkButton to={`/admin/gallery/${item.galleryItemId}/edit`} variant="glass" size="sm" aria-label={`Edit ${item.title}`}>
        <Pencil className="h-4 w-4" aria-hidden />
        Edit
      </LinkButton>
      {item.status === "archived" ? (
        <Button type="button" variant="glass" size="sm" disabled={isMutating} onClick={() => void restore.mutateAsync(item.galleryItemId)} aria-label={`Restore ${item.title}`}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Restore
        </Button>
      ) : isPublished ? (
        <Button type="button" variant="glass" size="sm" disabled={isMutating} onClick={() => void unpublish.mutateAsync(item.galleryItemId)} aria-label={`Unpublish ${item.title}`}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Unpublish
        </Button>
      ) : (
        <Button type="button" variant="glass" size="sm" disabled={isMutating} onClick={() => void publish.mutateAsync(item.galleryItemId)} aria-label={`Publish ${item.title}`}>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Publish
        </Button>
      )}
      <Button type="button" variant="glass" size="sm" disabled={isMutating || item.status === "archived"} onClick={() => void archive.mutateAsync(item.galleryItemId)} aria-label={`Archive ${item.title}`}>
        <Archive className="h-4 w-4" aria-hidden />
        Archive
      </Button>
      {isPublished ? (
        <LinkButton to={publicHref} variant="glass" size="sm" aria-label={`Open public gallery for ${item.title}`}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Gallery
        </LinkButton>
      ) : (
        <Button type="button" variant="disabled" size="sm" disabled aria-label={`Public gallery unavailable for ${item.title}`}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Gallery
        </Button>
      )}
    </div>
  );
}
