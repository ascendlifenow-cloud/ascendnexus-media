import { X } from "lucide-react";
import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import type { PublicGalleryItem } from "../../../models/gallery";
import { Button } from "../../../components/ui/Button";
import { AdminSectionCard } from "../AdminSectionCard";
import { AdminGalleryMediaTypeBadge } from "./AdminGalleryMediaTypeBadge";
import { AdminGalleryPreviewFrame } from "./AdminGalleryPreviewFrame";
import { AdminGallerySourceTypeBadge } from "./AdminGallerySourceTypeBadge";
import { AdminGalleryStatusBadge } from "./AdminGalleryStatusBadge";
import {
  getFormattedGalleryDate,
  getGalleryItemMissingDataLabels,
  joinGalleryItemWithSource,
} from "../../utils/adminGalleryUtils";

interface AdminGalleryItemPreviewProps {
  item: PublicGalleryItem | null;
  artists: readonly ArtistAdminRecord[];
  releases: readonly SongReleaseAdminRecord[];
  onClose: () => void;
}

export function AdminGalleryItemPreview({ item, artists, releases, onClose }: AdminGalleryItemPreviewProps) {
  if (!item) {
    return (
      <AdminSectionCard
        title="Gallery Item Detail Preview"
        description="Select View on a gallery card to inspect the item record and prepare future edit/preview workflows."
      >
        <div className="rounded-md border border-dashed border-white/12 bg-black/20 p-6 text-sm text-white/52">
          No gallery item selected.
        </div>
      </AdminSectionCard>
    );
  }

  const missingLabels = getGalleryItemMissingDataLabels(item, artists, releases);
  const { artist, release } = joinGalleryItemWithSource(item, artists, releases);

  return (
    <AdminSectionCard title="Gallery Item Detail Preview" description="This panel is ready for future modal, editor, or preview workflows.">
      <div className="grid gap-6 lg:grid-cols-[minmax(18rem,26rem)_1fr]">
        <AdminGalleryPreviewFrame item={item} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <AdminGalleryMediaTypeBadge mediaType={item.mediaType} />
                <AdminGallerySourceTypeBadge sourceType={item.sourceType} />
                <AdminGalleryStatusBadge status={item.status} />
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{item.title || "Untitled Gallery Item"}</h3>
              <p className="mt-2 text-sm leading-6 text-white/58">{item.description || "No description has been added yet."}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close gallery item preview">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Gallery Item ID</dt>
              <dd className="mt-1 break-all text-white/76">{item.galleryItemId}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Slug</dt>
              <dd className="mt-1 break-all text-white/76">{item.slug || "Missing slug"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Source</dt>
              <dd className="mt-1 text-white/76">{item.sourceType} / {item.sourceId || "Missing"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Related</dt>
              <dd className="mt-1 text-white/76">{release?.title ?? artist?.displayName ?? "No matching source record"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Image URL</dt>
              <dd className="mt-1 break-all text-white/76">{item.imageUrl || "Missing image URL"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Thumbnail URL</dt>
              <dd className="mt-1 break-all text-white/76">{item.thumbnailUrl || "Missing thumbnail"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Alt Text</dt>
              <dd className="mt-1 text-white/76">{item.altText || "Missing alt text"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Sort Order</dt>
              <dd className="mt-1 text-white/76">{item.sortOrder ?? "Unset"}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Created</dt>
              <dd className="mt-1 text-white/76">{getFormattedGalleryDate(item.createdAt)}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-black/18 p-3">
              <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Updated</dt>
              <dd className="mt-1 text-white/76">{getFormattedGalleryDate(item.updatedAt)}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-md border border-white/10 bg-black/18 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Metadata Preview</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/64">
              {JSON.stringify(item.metadata ?? { missingData: missingLabels }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </AdminSectionCard>
  );
}
