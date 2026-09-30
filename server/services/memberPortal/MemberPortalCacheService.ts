export class MemberPortalCacheService {
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 60): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.value as T;
    const value = await factory();
    this.cache.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    return value;
  }

  invalidateMember(memberId: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(`member:${memberId}:`)) this.cache.delete(key);
    }
  }

  clear() {
    this.cache.clear();
  }

  getHealth() {
    return {
      cacheAvailable: true,
      entries: this.cache.size,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const memberPortalCacheService = new MemberPortalCacheService();
