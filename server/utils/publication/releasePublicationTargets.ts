export type ReleasePublicationAudience = "public" | "free" | "premium" | "supporter" | "vip";
export type ReleasePublicationPlacement = "homepage" | "newReleases";

export interface ReleasePublicationTargets {
  audience: ReleasePublicationAudience;
  homepage: boolean;
  newReleases: boolean;
}

export const releasePublicationAudienceEntitlements: Record<ReleasePublicationAudience, string> = {
  public: "content.public.view",
  free: "content.free.view",
  premium: "content.premium.view",
  supporter: "content.supporter.view",
  vip: "content.vip.view",
};

// Only absent fields receive legacy defaults; malformed persisted values deny access.
export function parseReleasePublicationTargets(metadata: unknown): ReleasePublicationTargets | null {
  if (metadata === undefined) return { audience: "public", homepage: true, newReleases: true };
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const values = metadata as Record<string, unknown>;
  const audience = values.publicationAudience === undefined ? "public" : values.publicationAudience;
  const homepage = values.publicationHomepage === undefined ? true : values.publicationHomepage;
  const newReleases = values.publicationNewReleases === undefined ? true : values.publicationNewReleases;
  if (typeof audience !== "string" || !Object.hasOwn(releasePublicationAudienceEntitlements, audience)
    || typeof homepage !== "boolean" || typeof newReleases !== "boolean") return null;
  return { audience: audience as ReleasePublicationAudience, homepage, newReleases };
}
