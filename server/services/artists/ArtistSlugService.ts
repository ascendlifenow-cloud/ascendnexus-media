import { artistRepository } from "../../repositories/ArtistRepository";

const reservedSlugs = new Set(["admin", "api", "artists", "songs", "gallery", "search", "browse", "contact", "about", "privacy", "terms"]);

export class ArtistSlugService {
  generateSlug(value: string): string {
    return this.normalizeSlug(value);
  }

  normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  validateSlug(slug: string): { valid: boolean; errors: string[] } {
    const normalized = this.normalizeSlug(slug);
    const errors: string[] = [];
    if (!normalized) errors.push("Artist slug is required.");
    if (normalized !== slug.trim()) errors.push("Artist slug must already be normalized.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) errors.push("Artist slug must be lowercase, URL-safe, and hyphen-separated.");
    if (reservedSlugs.has(normalized)) errors.push("Artist slug is reserved.");
    return { valid: errors.length === 0, errors };
  }

  async ensureUniqueSlug(slug: string, excludeArtistId?: string): Promise<{ valid: boolean; slug: string; errors: string[] }> {
    const normalized = this.normalizeSlug(slug);
    const validation = this.validateSlug(normalized);
    if (!validation.valid) return { ...validation, slug: normalized };
    const exists = await artistRepository.existsBySlug(normalized, excludeArtistId);
    return exists ? { valid: false, slug: normalized, errors: ["Artist slug already exists."] } : { valid: true, slug: normalized, errors: [] };
  }

  async suggestUniqueSlug(baseValue: string): Promise<string> {
    const base = this.normalizeSlug(baseValue) || "artist";
    let candidate = base;
    let suffix = 2;
    while (await artistRepository.existsBySlug(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

export const artistSlugService = new ArtistSlugService();
