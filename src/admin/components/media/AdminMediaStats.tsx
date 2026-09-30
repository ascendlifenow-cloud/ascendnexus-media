import { Archive, FileAudio2, FileImage, ImageOff, Images, UploadCloud, UserRound } from "lucide-react";
import type { MediaAssetRecord } from "../../../models/admin";
import { getAdminMediaStats } from "../../utils/adminMediaUtils";

interface AdminMediaStatsProps {
  assets: readonly MediaAssetRecord[];
}

export function AdminMediaStats({ assets }: AdminMediaStatsProps) {
  const stats = getAdminMediaStats(assets);
  const items = [
    { label: "Total Assets", value: stats.total, icon: Images },
    { label: "Published", value: stats.published, icon: UploadCloud },
    { label: "Draft", value: stats.draft, icon: Images },
    { label: "Archived", value: stats.archived, icon: Archive },
    { label: "Cover Art", value: stats.coverArt, icon: FileImage },
    { label: "Artist Images", value: stats.artistImages, icon: UserRound },
    { label: "Audio Previews", value: stats.audioPreviews, icon: FileAudio2 },
    { label: "Missing Alt", value: stats.missingAltText, icon: ImageOff },
  ];

  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Media library summary">
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
