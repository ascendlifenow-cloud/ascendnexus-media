import type { MediaUploadResult } from "../../models/media";
import { adminApiUrl } from "../../services/admin/adminApiUrl";

interface GenerateAudioPreviewResponse extends MediaUploadResult {
  success: boolean;
}

export const generateAudioPreviewFromFullSong = async (
  fullSongAssetId: string,
  options: { durationSeconds?: number; startSeconds?: number; title?: string } = {},
): Promise<MediaUploadResult> => {
  const response = await fetch(adminApiUrl(`/api/admin/media/assets/${encodeURIComponent(fullSongAssetId)}/generate-audio-preview`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      durationSeconds: options.durationSeconds ?? 30,
      startSeconds: options.startSeconds ?? 0,
      title: options.title,
    }),
  });
  const payload = await response.json().catch(() => ({})) as GenerateAudioPreviewResponse & { errors?: string[]; error?: { message?: string } };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.join(" ") || payload.error?.message || `Audio preview generation failed with ${response.status}.`);
  }
  return payload;
};
