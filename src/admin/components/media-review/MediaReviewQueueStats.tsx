import { FileAudio2, FileImage, Inbox, Sparkles, TriangleAlert } from "lucide-react";
import type { MediaReviewQueueStats } from "../../../utils/media/mediaAssignmentReviewUtils";

export function MediaReviewQueueStats({ stats }: { stats: MediaReviewQueueStats }) {
  const items = [
    { label: "Pending Review", value: stats.pendingReview, icon: Inbox },
    { label: "Suggested", value: stats.suggestedAssignments, icon: Sparkles },
    { label: "Assignment Failed", value: stats.assignmentFailed, icon: TriangleAlert },
    { label: "Kept Unassigned", value: stats.keptUnassigned, icon: Inbox },
    { label: "Recently Uploaded", value: stats.recentlyUploaded, icon: Sparkles },
    { label: "Audio Assets", value: stats.audioAssets, icon: FileAudio2 },
    { label: "Image Assets", value: stats.imageAssets, icon: FileImage },
  ];

  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Media review summary">
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
