import type { ReleaseExternalLinks } from "../models/release";

export const createSeedExternalLinks = (slug: string, extras: ReleaseExternalLinks = {}): ReleaseExternalLinks => ({
  website: `/songs/${slug}`,
  ...extras,
});
