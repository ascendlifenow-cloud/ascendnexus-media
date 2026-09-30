import { releaseRepository } from "../../repositories/ReleaseRepository";

const reservedSlugs = new Set(["admin", "api", "artists", "songs", "gallery", "search", "browse", "contact", "about", "privacy", "terms", "latest", "featured"]);

export class ReleaseSlugService {
  generateSlug(title: string): string {
    return title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }

  normalizeSlug(slug: string): string {
    return this.generateSlug(slug);
  }

  validateSlug(slug: string): string[] {
    const errors: string[] = [];
    if (!slug) errors.push("Release slug is required.");
    if (slug.length > 120) errors.push("Release slug must be 120 characters or fewer.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("Release slug must be lowercase and URL-safe.");
    if (reservedSlugs.has(slug)) errors.push("Release slug is reserved.");
    return errors;
  }

  async ensureUniqueSlug(slug: string, excludeReleaseId?: string): Promise<{ valid: boolean; slug: string; errors: string[] }> {
    const normalized = this.normalizeSlug(slug);
    const errors = this.validateSlug(normalized);
    if (!errors.length && await releaseRepository.existsBySlug(normalized, excludeReleaseId)) errors.push("Release slug already exists.");
    return { valid: errors.length === 0, slug: normalized, errors };
  }

  async suggestUniqueSlug(base: string): Promise<string> {
    const normalized = this.normalizeSlug(base) || "release";
    let candidate = normalized;
    let index = 2;
    while (await releaseRepository.existsBySlug(candidate)) {
      candidate = `${normalized}-${index}`;
      index += 1;
    }
    return candidate;
  }
}

export const releaseSlugService = new ReleaseSlugService();
