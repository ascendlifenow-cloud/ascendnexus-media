import type { MediaAssetType } from "../../models/admin";
import type {
  ImageAssetMetadata,
  ImageDerivative,
  ImageDerivativePlan,
  ImageDerivativePlanItem,
  ImageDerivativeType,
} from "../../models/media";

const blurPlaceholderPreset: ImageDerivativePlanItem = {
  type: "blur_placeholder",
  targetWidth: 16,
  targetHeight: 16,
  fit: "cover",
  format: "webp",
  quality: 30,
  required: false,
};

const preset = (
  type: ImageDerivativeType,
  targetWidth: number,
  targetHeight: number,
  required = true,
  format = "webp",
  quality = 82,
  fit: ImageDerivativePlanItem["fit"] = "cover",
): ImageDerivativePlanItem => ({ type, targetWidth, targetHeight, fit, format, quality, required });

export const imageDerivativePresets: Partial<Record<MediaAssetType, ImageDerivativePlanItem[]>> = {
  cover_art: [
    preset("thumbnail", 300, 300),
    preset("card", 600, 600),
    preset("feature", 1200, 1200),
    preset("social", 1200, 1200),
    blurPlaceholderPreset,
  ],
  artist_profile: [
    preset("thumbnail", 300, 300),
    preset("card", 600, 600),
    preset("feature", 1000, 1000),
    blurPlaceholderPreset,
  ],
  artist_character_art: [
    preset("thumbnail", 300, 300),
    preset("card", 800, 800),
    preset("feature", 1400, 1400),
    blurPlaceholderPreset,
  ],
  artist_banner: [
    preset("thumbnail", 480, 270),
    preset("banner", 1920, 1080),
    preset("social", 1200, 630),
    blurPlaceholderPreset,
  ],
  gallery_image: [
    preset("thumbnail", 400, 400),
    preset("card", 800, 800),
    preset("feature", 1600, 1600),
    blurPlaceholderPreset,
  ],
  video_thumbnail: [
    preset("thumbnail", 480, 270),
    preset("card", 1280, 720),
    preset("social", 1200, 630),
    blurPlaceholderPreset,
  ],
  social_preview: [
    preset("social", 1200, 630),
    blurPlaceholderPreset,
  ],
  logo: [
    preset("thumbnail", 300, 300, true, "webp", 90, "contain"),
    preset("feature", 800, 800, true, "webp", 90, "contain"),
    blurPlaceholderPreset,
  ],
  custom_image: [
    preset("thumbnail", 400, 400),
    preset("card", 800, 800),
    blurPlaceholderPreset,
  ],
  promo_graphic: [
    preset("thumbnail", 400, 400),
    preset("card", 800, 800),
    preset("social", 1200, 630),
    blurPlaceholderPreset,
  ],
  fallback_image: [
    preset("thumbnail", 400, 400),
    preset("card", 800, 800),
    blurPlaceholderPreset,
  ],
};

export const createImageDerivativePlan = (
  assetType: MediaAssetType,
  metadata?: ImageAssetMetadata | null,
): ImageDerivativePlan => ({
  assetType,
  sourceWidth: metadata?.width,
  sourceHeight: metadata?.height,
  derivatives: imageDerivativePresets[assetType] ?? [preset("thumbnail", 400, 400), blurPlaceholderPreset],
  metadata: {
    planMode: "frontend-metadata-backend-generation-ready",
  },
});

export const createMockImageDerivatives = (
  plan: ImageDerivativePlan,
  sourceUrl: string,
  sourceStoragePath?: string,
  metadata?: ImageAssetMetadata | null,
  ready = true,
): ImageDerivative[] => {
  const original: ImageDerivative = {
    derivativeId: `${plan.assetType}-original`,
    type: "original",
    url: sourceUrl,
    storagePath: sourceStoragePath,
    width: metadata?.width ?? plan.sourceWidth ?? 0,
    height: metadata?.height ?? plan.sourceHeight ?? 0,
    format: metadata?.format ?? "source",
    status: "ready",
    metadata: { sourceOriginal: true },
  };
  const planned = plan.derivatives.map((item): ImageDerivative => ({
    derivativeId: `${plan.assetType}-${item.type}-${item.targetWidth}x${item.targetHeight}`,
    type: item.type,
    url: ready ? sourceUrl : undefined,
    storagePath: ready ? sourceStoragePath : undefined,
    width: item.targetWidth,
    height: item.targetHeight,
    format: item.format,
    quality: item.quality,
    status: ready ? "ready" : "planned",
    metadata: {
      mockDerivative: ready,
      requiresBackendGeneration: !ready,
      fit: item.fit,
      required: item.required,
    },
  }));
  return [original, ...planned];
};

export const getImageDerivativeUrl = (
  derivatives: readonly ImageDerivative[] | null | undefined,
  preferredTypes: readonly ImageDerivativeType[],
  fallbackUrl?: string,
): string | undefined => {
  const readyDerivative = derivatives?.find((derivative) => preferredTypes.includes(derivative.type) && derivative.status === "ready" && derivative.url);
  return readyDerivative?.url ?? fallbackUrl;
};
