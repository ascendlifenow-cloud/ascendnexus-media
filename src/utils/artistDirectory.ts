import type { ArtistPublicProfile } from "../models/artist";
import { filterActiveArtists, sortArtistsForPublicDisplay } from "./artistFilters";
import { searchArtists as searchPublicArtists } from "./publicSearch";

export { filterActiveArtists };

export const sortArtistsForDirectory = sortArtistsForPublicDisplay;

export const searchArtists = (artists: ArtistPublicProfile[], query: string) => {
  if (!query.trim()) return artists;
  return searchPublicArtists(artists, query);
};
