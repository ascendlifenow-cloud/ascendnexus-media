import { useQuery } from "@tanstack/react-query";
import { publicMediaApiClient } from "../../services/public/PublicMediaApiClient";

export const publicStaleTimes = {
  site: 15 * 60 * 1000,
  homepage: 5 * 60 * 1000,
  landing: 2 * 60 * 1000,
  artists: 10 * 60 * 1000,
  releases: 5 * 60 * 1000,
  gallery: 10 * 60 * 1000,
  metadata: 15 * 60 * 1000,
  search: 30 * 1000,
};

export const usePublicSiteConfig = () => useQuery({ queryKey: ["public-api", "site"], queryFn: () => publicMediaApiClient.getSiteConfiguration(), staleTime: publicStaleTimes.site });
export const usePublicHomepage = () => useQuery({ queryKey: ["public-api", "homepage"], queryFn: () => publicMediaApiClient.getHomepage(), staleTime: publicStaleTimes.homepage });
export const usePublicLanding = () => useQuery({ queryKey: ["public-api", "landing"], queryFn: () => publicMediaApiClient.getLandingExperience(), staleTime: publicStaleTimes.landing });
export const usePublicArtists = () => useQuery({ queryKey: ["public-api", "artists"], queryFn: () => publicMediaApiClient.listArtists(), staleTime: publicStaleTimes.artists });
export const usePublicArtist = (slug: string | undefined) => useQuery({ queryKey: ["public-api", "artist", slug], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getArtist(slug ?? ""), staleTime: publicStaleTimes.artists });
export const usePublicArtistReleases = (slug: string | undefined) => useQuery({ queryKey: ["public-api", "artist", slug, "releases"], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getArtistReleases(slug ?? ""), staleTime: publicStaleTimes.releases });
export const usePublicReleases = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ["public-api", "releases", filters], queryFn: () => publicMediaApiClient.listReleases(filters), staleTime: publicStaleTimes.releases });
export const useLatestPublicReleases = () => useQuery({ queryKey: ["public-api", "releases", "latest"], queryFn: () => publicMediaApiClient.getLatestReleases(), staleTime: publicStaleTimes.releases });
export const useFeaturedPublicReleases = () => useQuery({ queryKey: ["public-api", "releases", "featured"], queryFn: () => publicMediaApiClient.getFeaturedReleases(), staleTime: publicStaleTimes.releases });
export const usePublicRelease = (slug: string | undefined) => useQuery({ queryKey: ["public-api", "release", slug], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getRelease(slug ?? ""), staleTime: publicStaleTimes.releases });
export const usePublicGalleryApi = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ["public-api", "gallery", filters], queryFn: () => publicMediaApiClient.listGallery(filters), staleTime: publicStaleTimes.gallery });
export const usePublicGalleryItem = (slug: string | undefined) => useQuery({ queryKey: ["public-api", "gallery", slug], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getGalleryItem(slug ?? ""), staleTime: publicStaleTimes.gallery });
export const usePublicSearchApi = (query: string, filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ["public-api", "search", query, filters], queryFn: () => publicMediaApiClient.searchCatalog(query, filters), staleTime: publicStaleTimes.search });
export const usePublicSearchSuggestions = (query: string, filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ["public-api", "search", "suggestions", query, filters], enabled: query.trim().length >= 2, queryFn: () => publicMediaApiClient.searchSuggestions(query, filters), staleTime: publicStaleTimes.search });
export const usePublicBrowse = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ["public-api", "browse", filters], queryFn: () => publicMediaApiClient.browse(filters), staleTime: publicStaleTimes.search });
export const usePublicMetadata = (path: string) => useQuery({ queryKey: ["public-api", "metadata", path], queryFn: () => publicMediaApiClient.getMetadataForPath(path), staleTime: publicStaleTimes.metadata });
