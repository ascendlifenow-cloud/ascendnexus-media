import { ImageIcon } from "lucide-react";
import type { PublicGalleryItem } from "../../../models/gallery";
import { ArtistProfileImage } from "../../../components/media/ArtistProfileImage";
import { CoverArtImage } from "../../../components/media/CoverArtImage";

interface AdminGalleryPreviewFrameProps {
  item: PublicGalleryItem;
  compact?: boolean;
}

export function AdminGalleryPreviewFrame({ item, compact = false }: AdminGalleryPreviewFrameProps) {
  const src = item.thumbnailUrl || item.imageUrl;

  if (item.mediaType === "cover_art") {
    return <CoverArtImage src={src} title={item.title} alt={item.altText} size="card" fallbackVariant="minimal" />;
  }

  if (item.mediaType === "artist_profile") {
    return (
      <ArtistProfileImage
        src={src}
        artistName={item.title}
        displayName={item.title}
        alt={item.altText}
        size="card"
        shape="rounded"
        fallbackVariant="minimal"
      />
    );
  }

  if (src) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-anm-card border border-white/10 bg-black/24">
        <img src={src} alt={item.altText || `${item.title} gallery item`} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`flex ${compact ? "min-h-44" : "min-h-72"} flex-col items-center justify-center rounded-anm-card border border-white/10 bg-black/24 p-6 text-center`}>
      <ImageIcon className="h-10 w-10 text-anm-gold" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-white">Gallery Image Missing</p>
      <p className="mt-1 text-xs text-white/46">Fallback-ready preview placeholder</p>
    </div>
  );
}
