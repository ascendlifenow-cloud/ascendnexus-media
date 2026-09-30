import type { SongReleaseAdminRecord } from "../../models/admin";

const normalizeRouteSegment = (value: string | null | undefined): string =>
  encodeURIComponent((value ?? "").trim());

export const releaseRouteBuilder = {
  getPublicReleasePath(release: Pick<SongReleaseAdminRecord, "slug" | "songId" | "releaseId">): string {
    const segment = normalizeRouteSegment(release.slug || release.songId || release.releaseId);
    return segment ? `/songs/${segment}` : "/songs";
  },

  getAdminEditPath(release: Pick<SongReleaseAdminRecord, "releaseId">): string {
    return `/admin/releases/${normalizeRouteSegment(release.releaseId)}/edit`;
  },

  canOpenPublicRelease(release: Pick<SongReleaseAdminRecord, "slug" | "songId" | "releaseId">): boolean {
    return Boolean((release.slug || release.songId || release.releaseId).trim());
  },
};
