import type { ArtistPublicProfile } from "../models/artist";

type ArtistInput = readonly ArtistPublicProfile[] | null | undefined;

const toArtistArray = (artists: ArtistInput): ArtistPublicProfile[] => (Array.isArray(artists) ? [...artists] : []);

export const filterActiveArtists = (artists: ArtistInput): ArtistPublicProfile[] =>
  toArtistArray(artists).filter((artist) => artist.status === "active");

export const sortArtistsForPublicDisplay = (artists: ArtistInput): ArtistPublicProfile[] =>
  toArtistArray(artists).sort((a, b) => {
    const sortOrderDelta = a.sortOrder - b.sortOrder;
    if (sortOrderDelta !== 0) return sortOrderDelta;
    return a.displayName.localeCompare(b.displayName);
  });

export const getActiveArtistsSorted = (artists: ArtistInput): ArtistPublicProfile[] =>
  sortArtistsForPublicDisplay(filterActiveArtists(artists));
