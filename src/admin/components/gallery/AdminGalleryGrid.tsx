import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../models/admin";
import type { PublicGalleryItem } from "../../../models/gallery";
import { AdminGalleryItemCard } from "./AdminGalleryItemCard";

interface AdminGalleryGridProps {
  items: readonly PublicGalleryItem[];
  artists: readonly ArtistAdminRecord[];
  releases: readonly SongReleaseAdminRecord[];
  selectedItemId?: string;
  onViewItem: (item: PublicGalleryItem) => void;
}

export function AdminGalleryGrid({ items, artists, releases, selectedItemId, onViewItem }: AdminGalleryGridProps) {
  return (
    <section aria-labelledby="admin-gallery-grid-heading">
      <div className="mb-4">
        <h2 id="admin-gallery-grid-heading" className="text-xl font-semibold text-white">
          Gallery Items
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => (
          <AdminGalleryItemCard
            key={item.galleryItemId}
            item={item}
            artists={artists}
            releases={releases}
            selected={item.galleryItemId === selectedItemId}
            onView={onViewItem}
          />
        ))}
      </div>
    </section>
  );
}
