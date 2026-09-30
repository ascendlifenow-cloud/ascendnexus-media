import type { ArtistAdminStatus } from "../../models/admin";
import type { ReleaseStatus } from "../../models/release";

const artistTransitions: Record<ArtistAdminStatus, ArtistAdminStatus[]> = {
  draft: ["active", "archived"],
  active: ["archived"],
  archived: ["active"],
};

const releaseTransitions: Record<ReleaseStatus, ReleaseStatus[]> = {
  draft: ["published", "archived"],
  published: ["archived"],
  archived: ["published"],
};

export const canTransitionArtistStatus = (from: ArtistAdminStatus, to: ArtistAdminStatus): boolean =>
  from === to || artistTransitions[from]?.includes(to) === true;

export const canTransitionReleaseStatus = (from: ReleaseStatus, to: ReleaseStatus): boolean =>
  from === to || releaseTransitions[from]?.includes(to) === true;

export const validateStatusTransition = (
  contentType: "artist" | "release",
  from: ArtistAdminStatus | ReleaseStatus,
  to: ArtistAdminStatus | ReleaseStatus,
): string[] => {
  const isValid =
    contentType === "artist"
      ? canTransitionArtistStatus(from as ArtistAdminStatus, to as ArtistAdminStatus)
      : canTransitionReleaseStatus(from as ReleaseStatus, to as ReleaseStatus);

  return isValid ? [] : [`Cannot transition ${contentType} from ${from} to ${to}.`];
};
