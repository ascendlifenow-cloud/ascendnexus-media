import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicGalleryItem } from "../../models/gallery";
import type { HomepageContent } from "../../models/homepage";
import type { PublicLandingExperience } from "../../models/publicExperience";
import type { PublicSongRelease } from "../../models/release";
import { ArtistService } from "../ArtistService";
import { ReleaseService } from "../ReleaseService";
import { GalleryService } from "../GalleryService";
import { HomepageService } from "../HomepageService";
import { PublicSearchService } from "../PublicSearchService";

interface PublicPaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PublicApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown> & { pagination?: PublicPaginationMeta };
  warnings?: string[];
  errors?: string[];
}

const seedFallbackEnabled = () => {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const explicit = env.VITE_PUBLIC_API_SEED_FALLBACK_ENABLED;
  if (explicit === "true" || explicit === true) return true;
  if (explicit === "false" || explicit === false) return false;
  return import.meta.env.DEV;
};

const envValue = (key: string): string | undefined => {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const apiBase = (): string => (envValue("VITE_PUBLIC_API_BASE_URL") ?? "").replace(/\/+$/, "");

export class PublicMediaApiClient {
  private readonly artists = new ArtistService();
  private readonly releases = new ReleaseService();
  private readonly gallery = new GalleryService();
  private readonly homepage = new HomepageService();
  private readonly search = new PublicSearchService();

  async getSiteConfiguration() {
    return this.get("/api/public/site", async () => ({
      siteName: "Ascend Nexus Media",
      siteDescription: "AI persona artists, cinematic releases, and public creative media from Ascend Nexus Media.",
      navigation: [],
      footer: {},
      socialLinks: {},
      contactSettings: {},
      theme: {},
    }));
  }

  async getHomepage(): Promise<HomepageContent> {
    return this.get("/api/public/homepage", () => this.homepage.getHomepageContent());
  }

  async getLandingExperience(): Promise<PublicLandingExperience> {
    return this.get("/api/public/landing", async () => {
      const [site, homepage, artists, releases, gallery] = await Promise.all([
        this.getSiteConfiguration(),
        this.homepage.getHomepageContent(),
        this.artists.getPublicArtists(),
        this.releases.getPublishedReleases(),
        this.gallery.getPublishedGalleryItems(),
      ]);
      const siteRecord = site as { siteName?: string; siteDescription?: string };
      const artistProfiles = Array.isArray(artists) ? artists : [];
      const publishedReleases = Array.isArray(releases) ? releases : [];
      return {
        version: "development-seed-fallback",
        generatedAt: new Date().toISOString(),
        site: {
          siteName: siteRecord.siteName ?? "Ascend Nexus Media",
          siteDescription: siteRecord.siteDescription,
        },
        hero: {
          headline: homepage.featuredRelease?.release.title ?? "Ascend Nexus Media",
          subheadline: homepage.featuredRelease?.artist.displayName ?? "Discover AI artists and public media previews.",
          body: "Explore published artists, songs, gallery drops, and playable public previews.",
          imageUrl: homepage.featuredRelease?.release.coverArtUrl ?? homepage.featuredArtists[0]?.profileImage,
          primaryCta: { label: "Explore releases", href: "/songs", variant: "primary" },
          secondaryCta: { label: "Browse artists", href: "/artists", variant: "secondary" },
        },
        latestReleases: publishedReleases.slice(0, 12).map((release) => ({ release, artist: artistProfiles.find((artist) => artist.artistId === release.artistId), access: { accessLevel: release.audioPreviewUrl ? "guest_preview" : "public", previewAvailable: Boolean(release.audioPreviewUrl), requiresAccount: false, requiresMembership: false } })),
        featuredReleases: publishedReleases.filter((release) => release.featured).slice(0, 8).map((release) => ({ release, artist: artistProfiles.find((artist) => artist.artistId === release.artistId), access: { accessLevel: release.audioPreviewUrl ? "guest_preview" : "public", previewAvailable: Boolean(release.audioPreviewUrl), requiresAccount: false, requiresMembership: false } })),
        featuredArtists: artistProfiles.slice(0, 8).map((artist) => ({ artist, latestRelease: publishedReleases.find((release) => release.artistId === artist.artistId), access: { accessLevel: "public", previewAvailable: false, requiresAccount: false, requiresMembership: false } })),
        guestPreviews: publishedReleases.filter((release) => release.audioPreviewUrl).slice(0, 10).map((release) => ({ release, artist: artistProfiles.find((artist) => artist.artistId === release.artistId), access: { accessLevel: "guest_preview", previewAvailable: true, requiresAccount: false, requiresMembership: false } })),
        galleryPreview: gallery.slice(0, 8).map((item) => ({ item, access: { accessLevel: "public", previewAvailable: false, requiresAccount: false, requiresMembership: false } })),
        discovery: {
          genres: Array.from(new Set(publishedReleases.map((release) => release.genre).filter(Boolean))).slice(0, 16),
          styleTags: Array.from(new Set(publishedReleases.flatMap((release) => release.styleTags))).slice(0, 24),
          routes: [
            { label: "Artists", href: "/artists", variant: "ghost" },
            { label: "Songs", href: "/songs", variant: "ghost" },
            { label: "Gallery", href: "/gallery", variant: "ghost" },
            { label: "Search", href: "/search", variant: "ghost" },
          ],
        },
        membershipTeaser: {
          headline: "Create your member account",
          body: "Guest listening remains limited to approved public previews while members can manage account preferences.",
          loginHref: "/login",
          registerHref: "/register",
          status: "available",
        },
        sectionStates: [],
        safety: { publicSafe: true, checkedAt: new Date().toISOString() },
      };
    });
  }

  async listArtists(): Promise<ArtistPublicProfile[]> {
    return this.listAllPages("/api/public/artists", {}, () => this.artists.getPublicArtists());
  }

  async getArtist(slug: string): Promise<ArtistPublicProfile | undefined> {
    return this.get(`/api/public/artists/${encodeURIComponent(slug)}`, () => this.artists.getArtistBySlug(slug), true);
  }

  async getArtistReleases(slug: string): Promise<PublicSongRelease[]> {
    return this.get(`/api/public/artists/${encodeURIComponent(slug)}/releases`, async () => {
      const artist = (await this.artists.getArtistBySlug(slug)) ?? (await this.artists.getArtistById(slug));
      return artist ? this.releases.getPublishedReleasesByArtistId(artist.artistId) : [];
    });
  }

  async listReleases(filters: Record<string, string | undefined> = {}): Promise<PublicSongRelease[]> {
    return this.listAllPages("/api/public/releases", filters, () => this.releases.getPublishedReleases());
  }

  async getLatestReleases() {
    return this.get("/api/public/releases/latest", () => this.releases.getHomepageLatestReleaseGroups());
  }

  async getFeaturedReleases(): Promise<PublicSongRelease[]> {
    return this.get("/api/public/releases/featured", () => this.releases.getFeaturedReleases());
  }

  async getRelease(slug: string): Promise<PublicSongRelease | undefined> {
    return this.get(`/api/public/releases/${encodeURIComponent(slug)}`, () => this.releases.getPublishedReleaseBySlug(slug), true);
  }

  async listGallery(filters: Record<string, string | undefined> = {}): Promise<PublicGalleryItem[]> {
    return this.listAllPages("/api/public/gallery", filters, () => this.gallery.getPublishedGalleryItems());
  }

  async getGalleryItem(slug: string): Promise<PublicGalleryItem | undefined> {
    return this.get(`/api/public/gallery/${encodeURIComponent(slug)}`, async () => (await this.gallery.getPublishedGalleryItems()).find((item) => item.slug === slug), true);
  }

  async searchCatalog(query: string, filters: Record<string, string | undefined> = {}) {
    return this.get(`/api/public/search${this.query({ ...filters, q: query })}`, () => this.search.searchCatalog(query));
  }

  async searchSuggestions(query: string, filters: Record<string, string | undefined> = {}) {
    return this.get(`/api/public/search/suggestions${this.query({ ...filters, q: query })}`, async () => ({ query, suggestions: [] }));
  }

  async getRelatedReleases(slugOrId: string, limit = "6") {
    return this.get(`/api/public/discovery/related/releases/${encodeURIComponent(slugOrId)}${this.query({ limit })}`, async () => ({ releaseId: slugOrId, related: [] }));
  }

  async browse(filters: Record<string, string | undefined> = {}) {
    return this.get(`/api/public/browse${this.query(filters)}`, async () => ({
      artists: await this.artists.getPublicArtists(),
      releases: await this.releases.getPublishedReleases(),
      gallery: await this.gallery.getPublishedGalleryItems(),
    }));
  }

  async getMetadataForPath(path: string) {
    return this.get(`/api/public/metadata${this.query({ path })}`, async () => ({ title: "Ascend Nexus Media", description: "Ascend Nexus Media" }), true);
  }

  private async get<T>(path: string, fallback: () => Promise<T> | T, allowUndefined = false): Promise<T> {
    try {
      const payload = await this.fetchPublic<T>(path, allowUndefined);
      if (!payload) return undefined as T;
      return payload.data;
    } catch (error) {
      return this.handlePublicRequestError(error, fallback);
    }
  }

  private async listAllPages<T>(path: string, filters: Record<string, string | undefined>, fallback: () => Promise<T[]> | T[]): Promise<T[]> {
    try {
      const firstPayload = await this.fetchPublic<T[]>(path + this.query({ ...filters, page: "1", pageSize: "100" }));
      if (!firstPayload) return [];
      const items = Array.isArray(firstPayload.data) ? [...firstPayload.data] : [];
      const totalPages = Math.max(1, firstPayload.meta?.pagination?.totalPages ?? 1);
      for (let page = 2; page <= totalPages; page += 1) {
        const pagePayload = await this.fetchPublic<T[]>(path + this.query({ ...filters, page: String(page), pageSize: "100" }));
        if (pagePayload && Array.isArray(pagePayload.data)) items.push(...pagePayload.data);
      }
      return items;
    } catch (error) {
      return this.handlePublicRequestError(error, fallback);
    }
  }

  private async fetchPublic<T>(path: string, allowUndefined = false): Promise<PublicApiResponse<T> | undefined> {
    const base = apiBase();
    const response = await fetch(`${base}${path}`);
    if (response.status === 404 && allowUndefined) return undefined;
    if (!response.ok) throw new Error(`Public API request failed: ${response.status}`);
    const payload = await response.json() as PublicApiResponse<T>;
    if (!payload.success) throw new Error(payload.errors?.[0] ?? "Public API request failed.");
    return payload;
  }

  private async handlePublicRequestError<T>(error: unknown, fallback: () => Promise<T> | T): Promise<T> {
    if (seedFallbackEnabled()) {
      console.warn("[PublicMediaApiClient] Public API unavailable; using development seed fallback.", error);
      return this.fallback(fallback);
    }
    throw error;
  }

  private async fallback<T>(loader: () => Promise<T> | T): Promise<T> {
    return loader();
  }
  private query(filters: Record<string, string | undefined>): string {
    const params = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));
    return params.size ? `?${params}` : "";
  }
}

export const PublicApiClient = PublicMediaApiClient;
export const publicMediaApiClient = new PublicMediaApiClient();
