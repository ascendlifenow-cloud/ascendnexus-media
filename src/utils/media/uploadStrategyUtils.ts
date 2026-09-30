import type { MediaUploadTarget } from "../../models/media";
import { DEFAULT_DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES } from "./fileChunkUtils";

export const DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES =
  Number.parseInt(import.meta.env.VITE_DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES ?? "", 10) || DEFAULT_DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES;

export const isDirectUploadAssetType = (assetType: string): boolean =>
  ["full_song", "audio_preview", "custom_audio", "cover_art", "gallery_image", "promo_graphic", "video", "lyric_video", "short_clip"].includes(assetType);

export const shouldAttemptDirectUpload = (
  file: Pick<File, "size"> | null | undefined,
  uploadTarget: Pick<MediaUploadTarget, "assetType" | "intendedUse"> | null | undefined,
  thresholdBytes = DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES,
): boolean => {
  if (!file || !uploadTarget) return false;
  if (uploadTarget.assetType === "full_song" || uploadTarget.intendedUse === "release_full_song") return true;
  return file.size >= thresholdBytes && isDirectUploadAssetType(uploadTarget.assetType);
};
