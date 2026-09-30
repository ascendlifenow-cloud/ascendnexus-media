export interface PublicContentCacheEntry<T = unknown> {
  cacheKey: string;
  entityType: string;
  entityId?: string;
  path?: string;
  payload: T;
  etag?: string;
  version: number;
  createdAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}
