import type { MediaAssetType } from "../../models/admin";
import type { MediaCategory, MediaUploadTarget } from "../../models/media";

const audioTypes: MediaAssetType[] = ["full_song", "audio_preview", "stem", "instrumental", "vocal", "custom_audio"];
const imageTypes: MediaAssetType[] = [
  "cover_art",
  "artist_profile",
  "artist_character_art",
  "artist_banner",
  "promo_graphic",
  "gallery_image",
  "video_thumbnail",
  "social_preview",
  "logo",
  "fallback_image",
  "custom_image",
];
const videoTypes: MediaAssetType[] = ["video", "lyric_video", "short_clip", "animation"];

export const getMediaCategoryFromMimeType = (mimeType: string | null | undefined): MediaCategory => {
  const value = mimeType?.toLowerCase() ?? "";
  if (value.startsWith("audio/")) return "audio";
  if (value.startsWith("image/")) return "image";
  if (value.startsWith("video/")) return "video";
  if (value.includes("pdf") || value.startsWith("text/")) return "document";
  return "custom";
};

export const getMediaCategoryFromAssetType = (assetType: MediaAssetType): MediaCategory => {
  if (audioTypes.includes(assetType)) return "audio";
  if (imageTypes.includes(assetType)) return "image";
  if (videoTypes.includes(assetType)) return "video";
  return "custom";
};

export const getAssetTypeFromUploadTarget = (uploadTarget: MediaUploadTarget): MediaAssetType => uploadTarget.assetType;

export const isMediaAssetTypeCompatibleWithMimeType = (assetType: MediaAssetType, mimeType: string): boolean => {
  const fromAssetType = getMediaCategoryFromAssetType(assetType);
  const fromMimeType = getMediaCategoryFromMimeType(mimeType);
  return fromAssetType === "custom" || fromMimeType === "custom" || fromAssetType === fromMimeType;
};

export const isImageUploadAssetType = (assetType: MediaAssetType): boolean => imageTypes.includes(assetType);
export const isAudioUploadAssetType = (assetType: MediaAssetType): boolean => audioTypes.includes(assetType);
export const isVideoUploadAssetType = (assetType: MediaAssetType): boolean => videoTypes.includes(assetType);
