import type { MediaAssetRecord } from "../../models/admin";
import type { MediaCdnCacheBustStrategy } from "../../models/media";

const getVersionId = (asset: MediaAssetRecord): string | undefined => {
  const value = asset.metadata?.activeVersionId ?? asset.metadata?.versionId;
  return typeof value === "string" && value.trim() ? value : undefined;
};

const getChecksum = (asset: MediaAssetRecord): string | undefined => {
  const storage = asset.metadata?.storage;
  if (storage && typeof storage === "object" && !Array.isArray(storage)) {
    const checksum = storage.checksum;
    if (typeof checksum === "string" && checksum.trim()) return checksum;
  }
  const checksum = asset.metadata?.checksum;
  return typeof checksum === "string" && checksum.trim() ? checksum : undefined;
};

const safeCacheValue = (value: string | null | undefined): string | undefined => {
  const clean = (value ?? "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
  return clean || undefined;
};

export const applyCdnCacheBust = (
  url: string,
  asset: MediaAssetRecord,
  strategy: MediaCdnCacheBustStrategy,
): { url: string; cacheKey?: string } => {
  if (!url || strategy === "none") return { url };
  const key =
    strategy === "version_query"
      ? safeCacheValue(getVersionId(asset) ?? asset.updatedAt ?? asset.createdAt)
      : strategy === "updated_at_query"
        ? safeCacheValue(asset.updatedAt ?? asset.createdAt)
        : safeCacheValue(getChecksum(asset) ?? getVersionId(asset) ?? asset.updatedAt ?? asset.createdAt);
  if (!key) return { url };
  const param = strategy === "updated_at_query" ? "updated" : strategy === "content_hash" ? "h" : "v";
  try {
    const parsed = new URL(url, typeof window === "undefined" ? "https://anm.local" : window.location.origin);
    parsed.searchParams.delete(param);
    parsed.searchParams.set(param, key);
    const next = parsed.toString();
    return {
      url: url.startsWith("/") ? `${parsed.pathname}${parsed.search}${parsed.hash}` : next,
      cacheKey: key,
    };
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return { url: `${url}${separator}${param}=${encodeURIComponent(key)}`, cacheKey: key };
  }
};
