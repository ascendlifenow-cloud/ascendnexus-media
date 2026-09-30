import { Archive, ImageOff, Images, LayoutGrid, Sparkles, UserRound, Video } from "lucide-react";
import type { PublicGalleryItem } from "../../../models/gallery";
import { getAdminGalleryStats } from "../../utils/adminGalleryUtils";

interface AdminGalleryStatsProps {
  items: readonly PublicGalleryItem[];
}

export function AdminGalleryStats({ items }: AdminGalleryStatsProps) {
  const stats = getAdminGalleryStats(items);
  const statItems = [
    { label: "Total Items", value: stats.total, icon: Images },
    { label: "Published", value: stats.published, icon: Sparkles },
    { label: "Draft", value: stats.draft, icon: Images },
    { label: "Archived", value: stats.archived, icon: Archive },
    { label: "Cover Art", value: stats.coverArt, icon: LayoutGrid },
    { label: "Artist Profiles", value: stats.artistProfiles, icon: UserRound },
    { label: "Promo Graphics", value: stats.promoGraphics, icon: Sparkles },
    { label: "Video Thumbs", value: stats.videoThumbnails, icon: Video },
    { label: "Missing Alt", value: stats.missingAltText, icon: ImageOff },
  ];

  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Gallery management summary">
      {statItems.map(({ label, value, icon: Icon }) => (
        <span
          key={label}
          title={label}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
        >
          <Icon className="h-4 w-4 text-anm-gold" aria-hidden />
          <span aria-hidden>{value}</span>
          <span className="sr-only">{label}: {value}</span>
        </span>
      ))}
    </section>
  );
}
