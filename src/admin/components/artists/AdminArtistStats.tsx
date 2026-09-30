import { Archive, ImageOff, Sparkles, UsersRound } from "lucide-react";
import type { ArtistAdminRecord } from "../../../models/admin";
import { getAdminArtistStats } from "../../utils/adminArtistUtils";

interface AdminArtistStatsProps {
  artists: readonly ArtistAdminRecord[];
}

export function AdminArtistStats({ artists }: AdminArtistStatsProps) {
  const stats = getAdminArtistStats(artists);
  const items = [
    { label: "Total Artists", value: stats.total, icon: UsersRound },
    { label: "Active Artists", value: stats.active, icon: UsersRound },
    { label: "Draft Artists", value: stats.draft, icon: UsersRound },
    { label: "Archived Artists", value: stats.archived, icon: Archive },
    { label: "Featured Artists", value: stats.featured, icon: Sparkles },
    { label: "Missing Images", value: stats.missingImages, icon: ImageOff },
  ];

  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Artist management summary">
      {items.map(({ label, value, icon: Icon }) => (
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
