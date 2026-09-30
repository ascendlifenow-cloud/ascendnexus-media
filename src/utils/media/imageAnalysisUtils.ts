import type { ImageAssetMetadata } from "../../models/media";
import { calculateAspectRatio, formatAspectRatioLabel, getImageOrientation } from "./aspectRatioUtils";

export interface ImageAnalysisResult {
  success: boolean;
  metadata?: ImageAssetMetadata;
  errors?: string[];
  warnings?: string[];
}

const supportsImageElement = (): boolean => typeof Image !== "undefined";
const supportsObjectUrl = (): boolean => typeof URL !== "undefined" && typeof URL.createObjectURL === "function";

const getImageFormatFromFile = (file: File): string | undefined => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? `image/${extension}` : undefined;
};

const maybeTransparencyReady = (format: string | undefined): boolean | undefined => {
  const value = format?.toLowerCase() ?? "";
  if (!value) return undefined;
  return value.includes("png") || value.includes("webp") || value.includes("gif") || value.includes("svg");
};

const createPlaceholderSvgDataUrl = (width: number, height: number, color = "#111827"): string => {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}"><rect width="100%" height="100%" fill="${color}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const analyzeImageFile = async (file: File | null | undefined): Promise<ImageAnalysisResult> => {
  if (!file) return { success: false, errors: ["Image file is required."] };
  if (!file.type.startsWith("image/")) return { success: false, errors: ["Only image files can be analyzed."] };
  if (file.type === "image/svg+xml") {
    return {
      success: false,
      errors: ["SVG image analysis is disabled in the frontend for safety."],
      warnings: ["SVG files can still be stored, but derivative generation should happen on the backend."],
    };
  }
  if (!supportsImageElement() || !supportsObjectUrl()) {
    return { success: false, errors: ["Browser image metadata APIs are unavailable."] };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Image metadata could not be read."));
      image.src = objectUrl;
    });
    const format = getImageFormatFromFile(file);
    const metadata: ImageAssetMetadata = {
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio: calculateAspectRatio(dimensions.width, dimensions.height),
      orientation: getImageOrientation(dimensions.width, dimensions.height),
      format,
      fileSizeBytes: file.size,
      dominantColor: "#111827",
      blurDataUrl: createPlaceholderSvgDataUrl(16, 16),
      hasTransparency: maybeTransparencyReady(format),
      createdAt: new Date().toISOString(),
      metadata: {
        aspectRatioLabel: formatAspectRatioLabel(dimensions.width, dimensions.height),
        clientAnalyzed: true,
      },
    };
    return { success: true, metadata };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image analysis failed.";
    return { success: false, errors: [message] };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const analyzeImageUrl = async (url: string | null | undefined): Promise<ImageAnalysisResult> => {
  if (!url) return { success: false, errors: ["Image URL is required."] };
  if (!supportsImageElement()) return { success: false, errors: ["Browser image metadata APIs are unavailable."] };
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Image URL metadata could not be read."));
      image.src = url;
    });
    return {
      success: true,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: calculateAspectRatio(dimensions.width, dimensions.height),
        orientation: getImageOrientation(dimensions.width, dimensions.height),
        createdAt: new Date().toISOString(),
        metadata: {
          aspectRatioLabel: formatAspectRatioLabel(dimensions.width, dimensions.height),
          clientAnalyzed: true,
          source: "url",
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image URL analysis failed.";
    return { success: false, errors: [message] };
  }
};
