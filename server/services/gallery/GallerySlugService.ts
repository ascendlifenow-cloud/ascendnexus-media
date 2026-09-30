import { galleryRepository } from "../../repositories/GalleryRepository";

const reservedSlugs = new Set(["admin", "api", "gallery", "artists", "songs", "search", "browse", "contact", "about", "privacy", "terms"]);

export class GallerySlugService {
  normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  validateSlug(slug: string): string[] {
    const errors: string[] = [];
    if (!slug) errors.push("Gallery slug is required.");
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("Gallery slug must be lowercase, URL-safe, and hyphen-separated.");
    if (reservedSlugs.has(slug)) errors.push("Gallery slug uses a reserved route.");
    return errors;
  }

  async ensureUniqueSlug(slug: string, excludeGalleryItemId?: string) {
    const normalized = this.normalizeSlug(slug);
    const errors = this.validateSlug(normalized);
    if (!errors.length && await galleryRepository.existsBySlug(normalized, excludeGalleryItemId)) errors.push("Gallery slug already exists.");
    return { valid: errors.length === 0, slug: normalized, errors };
  }

  async suggestUniqueSlug(title: string): Promise<string> {
    const base = this.normalizeSlug(title || "gallery-item") || "gallery-item";
    let candidate = base;
    let suffix = 2;
    while (await galleryRepository.existsBySlug(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

export const gallerySlugService = new GallerySlugService();
