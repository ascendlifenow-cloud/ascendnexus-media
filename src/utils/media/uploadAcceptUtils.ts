import type { MediaUploadTarget } from "../../models/media";

export const getAcceptForUploadTarget = (uploadTarget: MediaUploadTarget | null | undefined): string | undefined => {
  if (!uploadTarget) return undefined;
  if (["cover_art", "artist_profile", "artist_character_art", "artist_banner", "promo_graphic", "gallery_image", "video_thumbnail", "social_preview", "logo", "fallback_image", "custom_image"].includes(uploadTarget.assetType)) {
    return "image/png,image/jpeg,image/webp";
  }
  if (["audio_preview", "full_song", "stem", "instrumental", "vocal", "custom_audio"].includes(uploadTarget.assetType)) {
    return "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg";
  }
  if (["video", "lyric_video", "short_clip", "animation"].includes(uploadTarget.assetType)) {
    return "video/mp4,video/webm";
  }
  return undefined;
};
