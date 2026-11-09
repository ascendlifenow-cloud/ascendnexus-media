import { publicationRefreshOptions } from "../publicationFreshness";
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

export const usePublicSiteConfig = () => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "site"], queryFn: () => publicMediaApiClient.getSiteConfiguration(), staleTime: Math.min(publicStaleTimes.site, publicationRefreshOptions.staleTime) });
export const usePublicHomepage = () => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "homepage"], queryFn: () => publicMediaApiClient.getHomepage(), staleTime: Math.min(publicStaleTimes.homepage, publicationRefreshOptions.staleTime) });
export const usePublicLanding = () => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "landing"], queryFn: () => publicMediaApiClient.getLandingExperience(), staleTime: Math.min(publicStaleTimes.landing, publicationRefreshOptions.staleTime) });
export const usePublicArtists = () => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "artists"], queryFn: () => publicMediaApiClient.listArtists(), staleTime: Math.min(publicStaleTimes.artists, publicationRefreshOptions.staleTime) });
export const usePublicArtist = (slug: string | undefined) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "artist", slug], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getArtist(slug ?? ""), staleTime: Math.min(publicStaleTimes.artists, publicationRefreshOptions.staleTime) });
export const usePublicArtistReleases = (slug: string | undefined) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "artist", slug, "releases"], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getArtistReleases(slug ?? ""), staleTime: Math.min(publicStaleTimes.releases, publicationRefreshOptions.staleTime) });
export const usePublicReleases = (filters: Record<string, string | undefined> = {}) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "releases", filters], queryFn: () => publicMediaApiClient.listReleases(filters), staleTime: Math.min(publicStaleTimes.releases, publicationRefreshOptions.staleTime) });
export const useLatestPublicReleases = () => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "releases", "latest"], queryFn: () => publicMediaApiClient.getLatestReleases(), staleTime: Math.min(publicStaleTimes.releases, publicationRefreshOptions.staleTime) });
export const useFeaturedPublicReleases = () => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "releases", "featured"], queryFn: () => publicMediaApiClient.getFeaturedReleases(), staleTime: Math.min(publicStaleTimes.releases, publicationRefreshOptions.staleTime) });
export const usePublicRelease = (slug: string | undefined) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "release", slug], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getRelease(slug ?? ""), staleTime: Math.min(publicStaleTimes.releases, publicationRefreshOptions.staleTime) });
export const usePublicGalleryApi = (filters: Record<string, string | undefined> = {}) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "gallery", filters], queryFn: () => publicMediaApiClient.listGallery(filters), staleTime: Math.min(publicStaleTimes.gallery, publicationRefreshOptions.staleTime) });
export const usePublicGalleryItem = (slug: string | undefined) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "gallery", slug], enabled: Boolean(slug), queryFn: () => publicMediaApiClient.getGalleryItem(slug ?? ""), staleTime: Math.min(publicStaleTimes.gallery, publicationRefreshOptions.staleTime) });
export const usePublicSearchApi = (query: string, filters: Record<string, string | undefined> = {}) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "search", query, filters], queryFn: () => publicMediaApiClient.searchCatalog(query, filters), staleTime: Math.min(publicStaleTimes.search, publicationRefreshOptions.staleTime) });
export const usePublicSearchSuggestions = (query: string, filters: Record<string, string | undefined> = {}) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "search", "suggestions", query, filters], enabled: query.trim().length >= 2, queryFn: () => publicMediaApiClient.searchSuggestions(query, filters), staleTime: Math.min(publicStaleTimes.search, publicationRefreshOptions.staleTime) });
export const usePublicBrowse = (filters: Record<string, string | undefined> = {}) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "browse", filters], queryFn: () => publicMediaApiClient.browse(filters), staleTime: Math.min(publicStaleTimes.search, publicationRefreshOptions.staleTime) });
export const usePublicMetadata = (path: string) => useQuery({ ...publicationRefreshOptions, queryKey: ["public-api", "metadata", path], queryFn: () => publicMediaApiClient.getMetadataForPath(path), staleTime: Math.min(publicStaleTimes.metadata, publicationRefreshOptions.staleTime) });
