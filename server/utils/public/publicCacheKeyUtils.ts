import crypto from "node:crypto";

export const stablePublicHash = (value: unknown): string =>
  crypto.createHash("sha1").update(JSON.stringify(value, Object.keys(value as object).sort())).digest("hex").slice(0, 12);

export const buildPublicCacheKey = (type: string, identifier = "default", filters: unknown = {}): string =>
  `public:${type}:${identifier}:${stablePublicHash(filters)}`;
