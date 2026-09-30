import type { MediaValidationConfig } from "../../models/media";

export const defaultMediaValidationConfig: MediaValidationConfig = {
  maxFileSizeByAssetType: {
    cover_art: 15 * 1024 * 1024,
    artist_profile: 10 * 1024 * 1024,
    artist_character_art: 15 * 1024 * 1024,
    artist_banner: 15 * 1024 * 1024,
    promo_graphic: 15 * 1024 * 1024,
    gallery_image: 15 * 1024 * 1024,
    video_thumbnail: 10 * 1024 * 1024,
    social_preview: 10 * 1024 * 1024,
    logo: 5 * 1024 * 1024,
    audio_preview: 50 * 1024 * 1024,
    full_song: 250 * 1024 * 1024,
    custom_audio: 250 * 1024 * 1024,
    video: 1024 * 1024 * 1024,
    short_clip: 250 * 1024 * 1024,
  },
  allowedMimeTypesByCategory: {
    image: ["image/jpeg", "image/png", "image/webp"],
    audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg"],
    video: ["video/mp4", "video/webm"],
  },
  allowedExtensionsByCategory: {
    image: ["jpg", "jpeg", "png", "webp"],
    audio: ["mp3", "wav", "m4a", "aac", "ogg"],
    video: ["mp4", "webm"],
  },
  dimensionRulesByAssetType: {
    cover_art: { minWidth: 1000, minHeight: 1000, recommendedWidth: 3000, recommendedHeight: 3000, aspectRatio: 1, aspectRatioTolerance: 0.08 },
    artist_profile: { minWidth: 800, minHeight: 800, recommendedWidth: 1200, recommendedHeight: 1200, aspectRatio: 1, aspectRatioTolerance: 0.45 },
    artist_character_art: { minWidth: 1000, minHeight: 1000, recommendedWidth: 1800, recommendedHeight: 1800 },
    artist_banner: { minWidth: 1600, minHeight: 900, recommendedWidth: 1920, recommendedHeight: 1080, aspectRatio: 16 / 9, aspectRatioTolerance: 0.18 },
    social_preview: { minWidth: 1200, minHeight: 630, recommendedWidth: 1200, recommendedHeight: 630, aspectRatio: 1.91, aspectRatioTolerance: 0.15 },
    video_thumbnail: { minWidth: 1280, minHeight: 720, aspectRatio: 16 / 9, aspectRatioTolerance: 0.15 },
    logo: { minWidth: 300, minHeight: 300 },
    gallery_image: { minWidth: 800, minHeight: 800 },
    promo_graphic: { minWidth: 1000, minHeight: 1000 },
  },
  durationRulesByAssetType: {
    audio_preview: { minSeconds: 5, maxSeconds: 120 },
    full_song: { minSeconds: 30, maxSeconds: 20 * 60 },
  },
  allowSvg: false,
  allowGif: false,
  allowUnknownMime: false,
  strictMimeExtensionMatch: true,
};
