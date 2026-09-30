import type { PublicGalleryItem } from "../../models/gallery";
import { GalleryItemCard } from "./GalleryItemCard";

interface GalleryGridProps {
  items: PublicGalleryItem[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => (
        <GalleryItemCard key={item.galleryItemId} item={item} />
      ))}
    </div>
  );
}
