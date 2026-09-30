import type { SongReleaseAdminRecord } from "../../models/admin";
import { slugifyReleaseValue, validateReleaseSlug } from "../utils/adminReleaseFormUtils";

export const releaseSlugClientService = {
  generateFromTitle(title: string): string {
    return slugifyReleaseValue(title);
  },

  normalize(value: string): string {
    return slugifyReleaseValue(value);
  },

  validate(value: string): boolean {
    return validateReleaseSlug(value);
  },

  findConflict(slug: string, releases: SongReleaseAdminRecord[], excludeReleaseId?: string): SongReleaseAdminRecord | null {
    const normalized = this.normalize(slug);
    if (!normalized) return null;
    return releases.find((release) => release.slug === normalized && release.releaseId !== excludeReleaseId) ?? null;
  },
};
