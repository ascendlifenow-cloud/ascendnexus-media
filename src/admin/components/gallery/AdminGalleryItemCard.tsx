import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import type { PublicGalleryItem } from "../../../models/gallery";
import { Badge } from "../../../components/ui/Badge";
import { AdminGalleryActions } from "./AdminGalleryActions";
import { AdminGalleryMediaTypeBadge } from "./AdminGalleryMediaTypeBadge";
import { AdminGalleryPreviewFrame } from "./AdminGalleryPreviewFrame";
import { AdminGallerySourceTypeBadge } from "./AdminGallerySourceTypeBadge";
import { AdminGalleryStatusBadge } from "./AdminGalleryStatusBadge";
import { AdminGalleryVisibilityState } from "./AdminGalleryVisibilityState";
import {
  getFormattedGalleryDate,
  getGalleryItemMissingDataLabels,
  joinGalleryItemWithSource,
} from "../../utils/adminGalleryUtils";

interface AdminGalleryItemCardProps {
  item: PublicGalleryItem;
  artists: readonly ArtistAdminRecord[];
  releases: readonly SongReleaseAdminRecord[];
  selected: boolean;
  onView: (item: PublicGalleryItem) => void;
}

export function AdminGalleryItemCard({ item, artists, releases, selected, onView }: AdminGalleryItemCardProps) {
  const missingLabels = getGalleryItemMissingDataLabels(item, artists, releases);
  const { artist, release } = joinGalleryItemWithSource(item, artists, releases);
  const relatedLabel = release?.title ?? artist?.displayName ?? item.sourceId;

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-anm-card border border-white/10 bg-anm-surface-glass shadow-anm-card-glow transition hover:border-anm-pink/30"
      aria-label={`${item.title} gallery item`}
      aria-current={selected ? "true" : undefined}
    >
      <div className="p-3">
        <AdminGalleryPreviewFrame item={item} compact />
      </div>
      <div className="flex flex-1 flex-col gap-4 border-t border-white/10 p-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <AdminGalleryMediaTypeBadge mediaType={item.mediaType} />
            <AdminGallerySourceTypeBadge sourceType={item.sourceType} />
            <AdminGalleryStatusBadge status={item.status} />
          </div>
          <h2 className="mt-3 line-clamp-2 text-lg font-semibold text-white">{item.title || "Untitled Gallery Item"}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/56">{item.description || item.slug || item.galleryItemId}</p>
        </div>

        <dl className="grid gap-2 text-sm text-white/62">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/42">Source</dt>
            <dd className="max-w-44 truncate text-right font-semibold text-white/72">{relatedLabel || "Missing"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/42">Sort Order</dt>
            <dd>{item.sortOrder ?? "Unset"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/42">Updated</dt>
            <dd>{getFormattedGalleryDate(item.updatedAt || item.createdAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/42">Visibility</dt>
            <dd>
              <AdminGalleryVisibilityState item={item} artists={artists} releases={releases} />
            </dd>
          </div>
        </dl>

        {missingLabels.length ? (
          <div className="flex flex-wrap gap-1">
            {missingLabels.slice(0, 4).map((label) => (
              <Badge key={label} variant="neutral" className="px-2 py-1 text-[0.68rem]">
                Missing {label}
              </Badge>
            ))}
            {missingLabels.length > 4 ? (
              <Badge variant="neutral" className="px-2 py-1 text-[0.68rem]">
                +{missingLabels.length - 4}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto">
          <AdminGalleryActions item={item} onView={onView} />
        </div>
      </div>
    </article>
  );
}
