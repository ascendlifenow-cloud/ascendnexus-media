import type { MediaUploadJob } from "../../../models/media";

const formatTime = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Pending";

export function MediaUploadJobTimeline({ job }: { job: MediaUploadJob }) {
  const items = [
    { label: "Created", value: job.createdAt },
    { label: "Updated", value: job.updatedAt },
    { label: "Completed", value: job.completedAt },
  ];
  return (
    <ol className="grid gap-1.5 text-xs text-white/56" aria-label="Upload job timeline">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-3">
          <span>{item.label}</span>
          <span className="font-semibold text-white/70">{formatTime(item.value)}</span>
        </li>
      ))}
    </ol>
  );
}
