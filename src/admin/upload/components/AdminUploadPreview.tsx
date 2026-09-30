import { FileAudio2, FileQuestion, ImageIcon } from "lucide-react";
import type { AdminUploadQueueItem } from "../models/AdminUploadQueueItem";
import { useObjectUrlPreview } from "../hooks/useObjectUrlPreview";
import { formatFileSize, getUploadMediaLabel } from "../utils/uploadUiUtils";

export function AdminUploadPreview({ item }: { item: AdminUploadQueueItem }) {
  const previewUrl = useObjectUrlPreview(item.file);
  const isImage = item.mimeType.startsWith("image/");
  const isAudio = item.mimeType.startsWith("audio/");

  if (isImage && previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={`Preview of ${item.fileName}`}
        className="aspect-square w-20 rounded-md border border-white/10 object-cover"
      />
    );
  }

  const Icon = isAudio ? FileAudio2 : item.mimeType ? ImageIcon : FileQuestion;
  return (
    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-md border border-white/10 bg-black/24 text-center">
      <Icon className="h-6 w-6 text-anm-gold" aria-hidden />
      <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/42">{getUploadMediaLabel(item.mimeType)}</span>
      <span className="text-[0.65rem] text-white/34">{formatFileSize(item.fileSizeBytes)}</span>
    </div>
  );
}
