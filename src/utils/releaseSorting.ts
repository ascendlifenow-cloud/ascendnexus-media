import type { PublicSongRelease } from "../models/release";
import { toReleaseArray, type ReleaseInput } from "./releaseFiltering";

const getReleaseTime = (release: PublicSongRelease): number | null => {
  if (!release.releaseDate) return null;
  const time = new Date(`${release.releaseDate}T00:00:00`).getTime();
  return Number.isNaN(time) ? null : time;
};

export const sortReleasesNewestFirst = (releases: ReleaseInput): PublicSongRelease[] =>
  toReleaseArray(releases).sort((a, b) => {
    const aTime = getReleaseTime(a);
    const bTime = getReleaseTime(b);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });

export const sortReleasesOldestFirst = (releases: ReleaseInput): PublicSongRelease[] =>
  toReleaseArray(releases).sort((a, b) => {
    const aTime = getReleaseTime(a);
    const bTime = getReleaseTime(b);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
  });
