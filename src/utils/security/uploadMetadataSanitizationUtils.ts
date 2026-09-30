import type { MediaAssetMetadataValue } from "../../models/admin";

const secretKeyPattern = /(password|token|secret|apikey|api_key|privatekey|private_key|authorization|cookie)/i;

export const sanitizeUploadMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, MediaAssetMetadataValue> => {
  if (!metadata || depth > 4) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => !secretKeyPattern.test(key) && value !== undefined && typeof value !== "function")
      .map(([key, value]) => [key, sanitizeMetadataValue(value, depth + 1)])
      .filter(([, value]) => value !== undefined),
  ) as Record<string, MediaAssetMetadataValue>;
};

const sanitizeMetadataValue = (value: unknown, depth: number): MediaAssetMetadataValue | undefined => {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/javascript:/gi, "");
    if (/^(password|token|secret|authorization|cookie)\s*[:=]/i.test(trimmed)) return undefined;
    return trimmed.slice(0, 500);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeMetadataValue(item, depth + 1)).filter((item): item is MediaAssetMetadataValue => item !== undefined).slice(0, 50);
  if (typeof value === "object" && depth <= 4) return sanitizeUploadMetadata(value as Record<string, unknown>, depth);
  return undefined;
};

