import type { MediaAssetRecord } from "../../models/admin";
import type { CdnUrlOptions, ImageDerivative, ImageDerivativeType, ResponsiveImageSource } from "../../models/media";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const getImageDerivativesFromAsset = (asset: MediaAssetRecord | null | undefined): ImageDerivative[] => {
  const derivatives = asset?.metadata?.imageDerivatives ?? asset?.metadata?.derivatives;
  return Array.isArray(derivatives)
    ? (derivatives as unknown[]).filter((item): item is ImageDerivative =>
      Boolean(
        isRecord(item) &&
        typeof item.type === "string" &&
        typeof item.width === "number" &&
        typeof item.height === "number" &&
        typeof item.format === "string" &&
        typeof item.status === "string",
      ),
    )
    : [];
};

export const getPreferredDerivativeTypes = (type: ImageDerivativeType | undefined): ImageDerivativeType[] => {
  if (type === "thumbnail") return ["thumbnail", "card", "feature", "original"];
  if (type === "card") return ["card", "thumbnail", "feature", "original"];
  if (type === "feature") return ["feature", "hero", "card", "original"];
  if (type === "hero" || type === "banner") return [type, "hero", "banner", "feature", "social", "original"];
  if (type === "social") return ["social", "hero", "feature", "original"];
  return ["thumbnail", "card", "feature", "hero", "social", "original"];
};

export const selectImageDerivative = (
  derivatives: readonly ImageDerivative[],
  preferredTypes: readonly ImageDerivativeType[],
  fallbackUrl?: string,
): ImageDerivative | undefined =>
  derivatives.find((derivative) => preferredTypes.includes(derivative.type) && derivative.status === "ready" && derivative.url) ??
  (fallbackUrl ? {
    derivativeId: "fallback-original",
    type: "original",
    url: fallbackUrl,
    width: 0,
    height: 0,
    format: "source",
    status: "ready",
  } : undefined);

export const buildResponsiveImageSources = (
  asset: MediaAssetRecord,
  derivativeTypes: readonly ImageDerivativeType[],
  buildUrl: (url: string, derivative: ImageDerivative, options: Partial<CdnUrlOptions>) => string | undefined,
): ResponsiveImageSource[] => {
  const sources = getImageDerivativesFromAsset(asset)
    .filter((derivative) => derivative.status === "ready" && derivative.url && derivativeTypes.includes(derivative.type))
    .map((derivative): ResponsiveImageSource | null => {
      const src = buildUrl(derivative.url ?? "", derivative, {
        width: derivative.width,
        height: derivative.height,
        format: derivative.format,
        quality: derivative.quality,
        derivativeType: derivative.type,
      });
      return src ? {
        src,
        width: derivative.width,
        height: derivative.height,
        type: derivative.format ? `image/${derivative.format}` : undefined,
      } : null;
    });
  return sources.filter((source): source is ResponsiveImageSource => source !== null);
};
