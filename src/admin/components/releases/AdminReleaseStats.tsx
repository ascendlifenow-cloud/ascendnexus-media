import { Archive, ExternalLink, Headphones, ImageOff, Music2, Sparkles, UploadCloud } from "lucide-react";
import type { SongReleaseAdminRecord } from "../../../models/admin";
import { getAdminReleaseStats } from "../../utils/adminReleaseUtils";

interface AdminReleaseStatsProps {
  releases: readonly SongReleaseAdminRecord[];
}

export function AdminReleaseStats({ releases }: AdminReleaseStatsProps) {
  const stats = getAdminReleaseStats(releases);
  const items = [
    { label: "Total Releases", value: stats.total, icon: Music2 },
    { label: "Published", value: stats.published, icon: UploadCloud },
    { label: "Draft", value: stats.draft, icon: Music2 },
    { label: "Archived", value: stats.archived, icon: Archive },
    { label: "Featured", value: stats.featured, icon: Sparkles },
    { label: "Missing Cover", value: stats.missingCoverArt, icon: ImageOff },
    { label: "Missing Audio", value: stats.missingAudioPreview, icon: Headphones },
    { label: "Missing Links", value: stats.missingExternalLinks, icon: ExternalLink },
  ];

  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Release management summary">
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
