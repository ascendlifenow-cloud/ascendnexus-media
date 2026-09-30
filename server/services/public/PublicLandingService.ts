import type { ArtistPublicProfile } from "../../../src/models/artist";
import type { PublicGalleryItem } from "../../../src/models/gallery";
import type { PublicSongRelease } from "../../../src/models/release";
import type {
  PublicLandingArtistCard,
  PublicLandingExperience,
  PublicLandingGalleryCard,
  PublicLandingReleaseCard,
} from "../../../src/models/publicExperience";
import { publicContentCacheService } from "./PublicContentCacheService";
import { publicContentDeliveryService } from "./PublicContentDeliveryService";
import { guestAccessPolicyService } from "./GuestAccessPolicyService";

type PublicSiteConfiguration = Awaited<ReturnType<typeof publicContentDeliveryService.getPublicSiteConfiguration>>;

const byDateDesc = (left: PublicSongRelease, right: PublicSongRelease) => new Date(right.releaseDate).getTime() - new Date(left.releaseDate).getTime();
const uniqueStrings = (values: Array<string | undefined>) => Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));

export class PublicLandingService {
  getPublicLandingExperience() {
    return publicContentCacheService.getOrSet("public:landing", () => this.buildPublicLandingExperience(), { ttlSeconds: 180, entityType: "landing" });
  }

  async buildPublicLandingExperience(): Promise<PublicLandingExperience> {
    const [site, artists, releases, featuredReleases, gallery] = await Promise.all([
      publicContentDeliveryService.getPublicSiteConfiguration(),
      publicContentDeliveryService.listPublicArtists(),
      publicContentDeliveryService.listPublicReleases(),
      publicContentDeliveryService.getFeaturedPublicReleases(),
      publicContentDeliveryService.listPublicGalleryItems(),
    ]);

    const releaseCards = this.buildReleaseCards(releases.sort(byDateDesc), artists);
    const featuredCards = this.buildReleaseCards((featuredReleases.length ? featuredReleases : releases.filter((release) => release.featured)).sort(byDateDesc), artists);
    const featuredArtists = this.buildArtistCards(artists, releases);
    const galleryCards = this.buildGalleryCards(gallery);
    const heroRelease = featuredCards[0]?.release ?? releaseCards[0]?.release;
    const heroArtist = heroRelease ? artists.find((artist) => artist.artistId === heroRelease.artistId) : featuredArtists[0]?.artist;
    const heroImage = heroRelease?.promoImageUrl ?? heroRelease?.coverArtUrl ?? heroArtist?.profileImage ?? galleryCards[0]?.item.thumbnailUrl ?? galleryCards[0]?.item.imageUrl;

    const payload: PublicLandingExperience = {
      version: "anm-web-110",
      generatedAt: new Date().toISOString(),
      site: {
        siteName: this.stringField(site, "siteName") || "Ascend Nexus Media",
        siteDescription: this.stringField(site, "siteDescription"),
      },
      hero: {
        headline: heroRelease ? `${heroRelease.title}` : this.stringField(site, "siteName") || "Ascend Nexus Media",
        subheadline: heroArtist ? `New public media from ${heroArtist.displayName || heroArtist.name}` : this.stringField(site, "siteDescription") || "Discover AI artists, cinematic releases, and public creative media.",
        body: heroRelease?.featuredDescription ?? "Explore published artists, playable audio previews, gallery drops, and public-safe media from Ascend Nexus Media.",
        imageUrl: heroImage,
        primaryCta: { label: "Explore releases", href: "/songs", variant: "primary" },
        secondaryCta: { label: "Browse artists", href: "/artists", variant: "secondary" },
      },
      latestReleases: releaseCards.slice(0, 12),
      featuredReleases: featuredCards.slice(0, 8),
      featuredArtists: featuredArtists.slice(0, 8),
      guestPreviews: releaseCards.filter((card) => card.release.audioPreviewUrl).slice(0, 10),
      galleryPreview: galleryCards.slice(0, 8),
      discovery: {
        genres: uniqueStrings(releases.map((release) => release.genre)).slice(0, 16),
        styleTags: uniqueStrings(releases.flatMap((release) => release.styleTags)).slice(0, 24),
        routes: [
          { label: "Artists", href: "/artists", variant: "ghost" },
          { label: "Songs", href: "/songs", variant: "ghost" },
          { label: "Gallery", href: "/gallery", variant: "ghost" },
          { label: "Search", href: "/search", variant: "ghost" },
        ],
      },
      membershipTeaser: {
        headline: "Create your member account",
        body: "Register to prepare favorites, artist follows, preferences, and release updates. Guest listening remains limited to approved previews.",
        loginHref: "/login",
        registerHref: "/register",
        status: "available",
      },
      sectionStates: [],
      safety: {
        publicSafe: true,
        checkedAt: new Date().toISOString(),
      },
    };

    payload.sectionStates = [
      { key: "hero", title: "Hero", enabled: true, itemCount: heroRelease || heroArtist ? 1 : 0 },
      { key: "latestReleases", title: "Latest releases", enabled: payload.latestReleases.length > 0, itemCount: payload.latestReleases.length },
      { key: "featuredReleases", title: "Featured releases", enabled: payload.featuredReleases.length > 0, itemCount: payload.featuredReleases.length },
      { key: "featuredArtists", title: "Featured artists", enabled: payload.featuredArtists.length > 0, itemCount: payload.featuredArtists.length },
      { key: "guestPreviews", title: "Playable previews", enabled: payload.guestPreviews.length > 0, itemCount: payload.guestPreviews.length },
      { key: "galleryPreview", title: "Gallery preview", enabled: payload.galleryPreview.length > 0, itemCount: payload.galleryPreview.length },
    ];

    const sanitized = guestAccessPolicyService.sanitizeForGuest(payload);
    const report = guestAccessPolicyService.buildGuestAccessReport(sanitized);
    sanitized.safety = { publicSafe: report.safe, checkedAt: report.checkedAt };
    return sanitized;
  }

  private buildReleaseCards(releases: PublicSongRelease[], artists: ArtistPublicProfile[]): PublicLandingReleaseCard[] {
    return releases
      .filter((release) => release.status === "published")
      .map((release) => ({
        release,
        artist: artists.find((artist) => artist.artistId === release.artistId),
        access: guestAccessPolicyService.buildPublicPolicy({ previewAvailable: Boolean(release.audioPreviewUrl), reason: release.audioPreviewUrl ? "Approved public audio preview" : "Public release page only" }),
      }))
      .filter((card) => guestAccessPolicyService.isVisibleToGuest(card.access));
  }

  private buildArtistCards(artists: ArtistPublicProfile[], releases: PublicSongRelease[]): PublicLandingArtistCard[] {
    return artists
      .filter((artist) => artist.status === "active")
      .sort((left, right) => Number(right.featured) - Number(left.featured) || left.sortOrder - right.sortOrder || left.displayName.localeCompare(right.displayName))
      .map((artist) => ({
        artist,
        latestRelease: releases.filter((release) => release.artistId === artist.artistId && release.status === "published").sort(byDateDesc)[0],
        access: guestAccessPolicyService.buildPublicPolicy(),
      }));
  }

  private buildGalleryCards(items: PublicGalleryItem[]): PublicLandingGalleryCard[] {
    return items
      .filter((item) => item.status === "published")
      .sort((left, right) => (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999) || (right.createdAt ?? "").localeCompare(left.createdAt ?? ""))
      .map((item) => ({ item, access: guestAccessPolicyService.buildPublicPolicy() }));
  }

  private stringField(site: PublicSiteConfiguration, key: string): string | undefined {
    const value = (site as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value : undefined;
  }
}

export const publicLandingService = new PublicLandingService();
