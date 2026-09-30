import type { PublicContentCacheEntry } from "../../models/public/PublicContentCacheEntryModel";
import { buildPublicCacheKey } from "../../utils/public/publicCacheKeyUtils";

const nowIso = () => new Date().toISOString();

export class PublicContentCacheService {
  private readonly cache = new Map<string, PublicContentCacheEntry>();
  private readonly tags = new Map<string, Set<string>>();
  private readonly tombstones = new Map<string, { entityType: string; entityId?: string; slug?: string; hiddenAt: string; expiresAt: string }>();
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private invalidations = 0;
  private tagInvalidations = 0;
  private bypasses = 0;
  private errors = 0;
  private lastInvalidationAt: string | undefined;

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= nowIso()) {
      this.misses += 1;
      if (entry) this.cache.delete(key);
      return undefined;
    }
    this.hits += 1;
    return entry.payload as T;
  }

  set<T>(key: string, payload: T, options: { ttlSeconds?: number; entityType?: string; entityId?: string; path?: string } = {}): T {
    const ttlSeconds = options.ttlSeconds ?? 300;
    const createdAt = new Date();
    this.cache.set(key, {
      cacheKey: key,
      entityType: options.entityType ?? "public",
      entityId: options.entityId,
      path: options.path,
      payload,
      version: Date.now(),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + ttlSeconds * 1000).toISOString(),
    });
    this.sets += 1;
    return payload;
  }

  delete(key: string): void {
    this.cache.delete(key);
    for (const keys of this.tags.values()) keys.delete(key);
    this.invalidations += 1;
    this.lastInvalidationAt = nowIso();
  }

  deleteByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.delete(key);
    }
    this.lastInvalidationAt = nowIso();
  }

  async getOrSet<T>(key: string, loader: () => Promise<T>, options: { ttlSeconds?: number; entityType?: string; entityId?: string; path?: string } = {}): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    try {
      return this.set(key, await loader(), options);
    } catch (error) {
      this.errors += 1;
      throw error;
    }
  }

  buildCacheKey(type: string, identifier?: string, filters?: unknown): string {
    return buildPublicCacheKey(type, identifier, filters);
  }

  buildVersionedCacheKey(namespace: string, version: string | number, parts?: unknown): string {
    return buildPublicCacheKey(namespace, String(version), parts);
  }

  registerKeyTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tags.get(tag) ?? new Set<string>();
      keys.add(key);
      this.tags.set(tag, keys);
    }
  }

  invalidateTag(tag: string): void {
    for (const key of this.tags.get(tag) ?? []) this.delete(key);
    this.tags.delete(tag);
    this.tagInvalidations += 1;
    this.lastInvalidationAt = nowIso();
  }

  invalidateTags(tags: string[]): void {
    tags.forEach((tag) => this.invalidateTag(tag));
  }

  invalidateEntity(entityType: string, entityId: string): void {
    this.deleteByPattern(`${entityType}`);
    this.deleteByPattern(entityId);
    this.deleteByPattern("homepage");
    this.deleteByPattern("search");
    this.deleteByPattern("browse");
  }

  invalidatePath(path: string): void {
    this.deleteByPattern(path);
  }

  clearPublicCache(): void {
    this.cache.clear();
    this.tags.clear();
    this.invalidations += 1;
    this.lastInvalidationAt = nowIso();
  }

  markHidden(entityType: string, entityId?: string, slug?: string, ttlSeconds = 3600): void {
    const hiddenAt = nowIso();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    for (const key of [`${entityType}:${entityId ?? ""}`, `${entityType}:${slug ?? ""}`]) {
      if (key !== `${entityType}:`) this.tombstones.set(key, { entityType, entityId, slug, hiddenAt, expiresAt });
    }
  }

  isHidden(entityType: string, entityIdOrSlug?: string): boolean {
    if (!entityIdOrSlug) return false;
    const key = `${entityType}:${entityIdOrSlug}`;
    const tombstone = this.tombstones.get(key);
    if (!tombstone) return false;
    if (tombstone.expiresAt <= nowIso()) {
      this.tombstones.delete(key);
      return false;
    }
    return true;
  }

  getMetrics() {
    return {
      hits: this.hits,
      misses: this.misses,
      staleHits: 0,
      bypasses: this.bypasses,
      errors: this.errors,
      sets: this.sets,
      invalidations: this.invalidations,
      tagInvalidations: this.tagInvalidations,
      lockWaits: 0,
      regenerations: this.sets,
      averageLoadMs: 0,
      averageCacheReadMs: 0,
    };
  }

  getCacheHealth() {
    return {
      cacheAvailable: true,
      provider: "in_memory_fallback",
      entries: this.cache.size,
      tags: this.tags.size,
      tombstones: this.tombstones.size,
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      invalidations: this.invalidations,
      tagInvalidations: this.tagInvalidations,
      errors: this.errors,
      lastInvalidationAt: this.lastInvalidationAt,
    };
  }
}

export const publicContentCacheService = new PublicContentCacheService();
