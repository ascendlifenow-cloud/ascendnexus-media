import type { ArtistPublicProfile } from "../../models/artist";
import type { ExternalLink } from "../../models/ExternalLink";
import type { PublicGalleryItem } from "../../models/gallery";
import type { PublicSongRelease } from "../../models/release";
import type { AnalyticsConfig, PublicAnalyticsEvent, PublicAnalyticsMetadata } from "../../models/analytics";
import type { ConsentCategory, PublicConsentRecord } from "../public/publicConsentTypes";
import { publicConsentApiService } from "../public/PublicConsentApiService";
import {
  buildAnalyticsEvent,
  defaultAnalyticsConfig,
  isEventTypeEnabled,
  sanitizeAnalyticsMetadata,
} from "../../utils/analytics/analyticsUtils";
import {
  ConsoleAnalyticsAdapter,
  NoopAnalyticsAdapter,
  type AnalyticsProviderAdapter,
} from "./adapters";

type TrackableEvent = Omit<PublicAnalyticsEvent, "eventId" | "timestamp" | "sessionId"> & Partial<Pick<PublicAnalyticsEvent, "eventId" | "timestamp" | "sessionId">>;

const eventConsentCategory: Record<string, ConsentCategory> = {
  consent_banner_viewed: "necessary",
  consent_accepted_all: "necessary",
  consent_rejected_optional: "necessary",
  consent_preferences_saved: "necessary",
  consent_withdrawn: "necessary",
};

const approvedEventNames = new Set([
  "page_view",
  "navigation_clicked",
  "footer_link_clicked",
  "cta_clicked",
  "external_platform_clicked",
  "artist_viewed",
  "release_viewed",
  "gallery_item_viewed",
  "audio_preview_play_requested",
  "audio_preview_started",
  "audio_preview_paused",
  "audio_preview_resumed",
  "audio_preview_seeked",
  "audio_preview_completed",
  "audio_preview_error",
  "search_submitted",
  "search_results_viewed",
  "search_zero_results",
  "search_result_clicked",
  "search_filter_applied",
  "browse_mode_viewed",
  "contact_form_submitted",
  "contact_form_accepted",
  "contact_form_error",
  "newsletter_signup_submitted",
  "newsletter_signup_accepted",
  "newsletter_confirmation_completed",
  "newsletter_unsubscribed",
  "consent_banner_viewed",
  "consent_accepted_all",
  "consent_rejected_optional",
  "consent_preferences_saved",
  "consent_withdrawn",
  "public_client_error",
  "web_vital_reported",
]);

const forbiddenProperty = /email|phone|message|token|signed|storage|fullsong|full_song|private|admin/i;

const destinationCategory = (route?: string) => {
  if (!route) return "unknown";
  if (route.startsWith("/")) return route.startsWith("/admin") || route.startsWith("/api") ? "blocked" : "internal";
  try {
    const url = new URL(route);
    return url.hostname.replace(/^www\./, "").split(".")[0].slice(0, 40);
  } catch {
    return "unknown";
  }
};

export class AnalyticsService {
  private config: AnalyticsConfig;
  private adapter: AnalyticsProviderAdapter;
  private consent?: PublicConsentRecord;
  private lastPageViewKey?: string;

  constructor(config: AnalyticsConfig = defaultAnalyticsConfig, adapter?: AnalyticsProviderAdapter) {
    this.config = config;
    this.adapter = adapter ?? this.createAdapter(config);
  }

  setConfig(config: AnalyticsConfig) {
    this.config = config;
    this.adapter = this.createAdapter(config);
  }

  getConfig() {
    return this.config;
  }

  setConsent(consent: PublicConsentRecord | undefined) {
    this.consent = consent?.status === "active" ? consent : undefined;
  }

  reset() {
    this.consent = undefined;
    this.lastPageViewKey = undefined;
  }

  async trackEvent(event: TrackableEvent): Promise<void> {
    if (!isEventTypeEnabled(event.eventType, this.config)) return;
    const eventName = this.normalizeEventName(event.eventName);
    if (!eventName || !approvedEventNames.has(eventName)) return;
    const requiredCategory = eventConsentCategory[eventName] ?? "analytics";
    if (!this.hasConsent(requiredCategory)) return;

    const normalizedEvent = buildAnalyticsEvent({
      ...event,
      eventName,
      metadata: sanitizeAnalyticsMetadata({
        ...this.config.metadata,
        ...event.metadata,
      }),
    });

    try {
      await this.adapter.sendEvent(normalizedEvent);
      await publicConsentApiService.postAnalyticsEvents([this.toFirstPartyEvent(normalizedEvent, requiredCategory)]);
    } catch (error) {
      if (this.config.debug) {
        console.warn("[ANM Analytics] Provider failed", error);
      }
    }
  }

  trackPageView(route: string, metadata?: PublicAnalyticsMetadata) {
    const routeKey = route.split("#")[0].split("?")[0] || "/";
    if (routeKey.startsWith("/admin") || routeKey.startsWith("/api")) return Promise.resolve();
    if (this.lastPageViewKey === routeKey) return Promise.resolve();
    this.lastPageViewKey = routeKey;
    return this.trackEvent({
      eventType: "page_view",
      eventName: "page_view",
      route: routeKey,
      entityType: "page",
      metadata,
    });
  }

  trackArtistView(artist: ArtistPublicProfile) {
    return this.trackEvent({
      eventType: "artist_view",
      eventName: "artist_viewed",
      entityType: "artist",
      entityId: artist.artistId,
      entitySlug: artist.slug,
      artistId: artist.artistId,
      metadata: {
        artistId: artist.artistId,
        artistSlug: artist.slug,
        displayName: artist.displayName,
      },
    });
  }

  trackSongView(song: PublicSongRelease, artist?: ArtistPublicProfile) {
    return this.trackEvent({
      eventType: "song_view",
      eventName: "release_viewed",
      entityType: "song",
      entityId: song.songId,
      entitySlug: song.slug,
      artistId: song.artistId,
      releaseId: song.releaseId,
      metadata: {
        releaseId: song.releaseId,
        songId: song.songId,
        songSlug: song.slug,
        artistId: song.artistId,
        artistSlug: artist?.slug ?? null,
        genre: song.genre,
        styleTags: song.styleTags,
      },
    });
  }

  trackAudioPreviewPlay(song: PublicSongRelease) {
    return this.trackAudioPreviewEvent("play", song);
  }

  trackAudioPreviewPause(song: PublicSongRelease) {
    return this.trackAudioPreviewEvent("pause", song);
  }

  trackAudioPreviewEnded(song: PublicSongRelease) {
    return this.trackAudioPreviewEvent("ended", song);
  }

  trackAudioPreviewError(song: PublicSongRelease) {
    return this.trackAudioPreviewEvent("error", song, { sourceAvailable: Boolean(song.audioPreviewUrl) });
  }

  trackExternalLinkClick(link: ExternalLink, context?: PublicAnalyticsMetadata) {
    return this.trackEvent({
      eventType: "external_link",
      eventName: "external_platform_clicked",
      entityType: "external_link",
      metadata: {
        platform: link.platform,
        linkType: link.type ?? "custom",
        destinationCategory: link.platform ?? "custom",
        ...context,
      },
    });
  }

  trackCtaClick(label: string, route?: string, context?: PublicAnalyticsMetadata) {
    return this.trackEvent({
      eventType: "cta_click",
      eventName: "cta_clicked",
      route,
      entityType: "cta",
      metadata: {
        label,
        destinationCategory: destinationCategory(route),
        ...context,
      },
    });
  }

  trackSearch(query: string, resultCounts: { totalResults: number; artistResults: number; songResults: number; visualResults?: number }) {
    const queryLength = query.trim().length;
    return this.trackEvent({
      eventType: "search",
      eventName: resultCounts.totalResults === 0 ? "search_zero_results" : "search_submitted",
      entityType: "search",
      metadata: {
        queryLength,
        resultCount: resultCounts.totalResults,
        zeroResults: resultCounts.totalResults === 0,
      },
    });
  }

  trackBrowseFilter(filters: { genre?: string; tag?: string }, resultCount: number) {
    return this.trackEvent({
      eventType: "browse_filter",
      eventName: "browse_mode_viewed",
      entityType: "browse",
      metadata: {
        genre: filters.genre ?? null,
        tag: filters.tag ?? null,
        resultCount,
      },
    });
  }

  trackGalleryView(item: PublicGalleryItem) {
    return this.trackEvent({
      eventType: "gallery",
      eventName: "gallery_item_viewed",
      entityType: "gallery_item",
      entityId: item.galleryItemId,
      entitySlug: item.slug,
      artistId: item.artistId,
      releaseId: item.releaseId,
      metadata: {
        galleryItemId: item.galleryItemId,
        mediaType: item.mediaType,
        sourceType: item.sourceType,
      },
    });
  }

  trackGalleryFilter(filter: string, resultCount: number) {
    return this.trackEvent({
      eventType: "gallery",
      eventName: "search_filter_applied",
      entityType: "gallery_item",
      metadata: {
        filter,
        resultCount,
      },
    });
  }

  trackErrorState(errorType: string, route?: string, metadata?: PublicAnalyticsMetadata) {
    return this.trackEvent({
      eventType: "error",
      eventName: "public_client_error",
      route,
      entityType: "page",
      metadata: {
        errorType,
        errorCategory: errorType,
        ...metadata,
      },
    });
  }

  trackFormEvent(eventName: "contact_form_submitted" | "contact_form_accepted" | "contact_form_error" | "newsletter_signup_submitted" | "newsletter_signup_accepted" | "newsletter_confirmation_completed" | "newsletter_unsubscribed", metadata?: PublicAnalyticsMetadata) {
    return this.trackEvent({
      eventType: "custom",
      eventName,
      entityType: "page",
      metadata,
    });
  }

  trackConsentEvent(eventName: "consent_banner_viewed" | "consent_accepted_all" | "consent_rejected_optional" | "consent_preferences_saved" | "consent_withdrawn", metadata?: PublicAnalyticsMetadata) {
    return this.trackEvent({
      eventType: "custom",
      eventName,
      entityType: "page",
      metadata,
    });
  }

  private trackAudioPreviewEvent(action: "play" | "pause" | "ended" | "error", song: PublicSongRelease, metadata?: PublicAnalyticsMetadata) {
    const eventName = action === "play"
      ? "audio_preview_play_requested"
      : action === "ended"
        ? "audio_preview_completed"
        : action === "pause"
          ? "audio_preview_paused"
          : "audio_preview_error";
    return this.trackEvent({
      eventType: "audio_preview",
      eventName,
      entityType: "song",
      entityId: song.songId,
      entitySlug: song.slug,
      artistId: song.artistId,
      releaseId: song.releaseId,
      metadata: {
        releaseId: song.releaseId,
        songSlug: song.slug,
        artistId: song.artistId,
        sourceContext: "public_player",
        ...metadata,
      },
    });
  }

  private createAdapter(config: AnalyticsConfig): AnalyticsProviderAdapter {
    if (!config.enabled || config.provider === "none") return new NoopAnalyticsAdapter();
    if (config.provider === "console") return new ConsoleAnalyticsAdapter();
    return new NoopAnalyticsAdapter();
  }

  private hasConsent(category: ConsentCategory) {
    if (category === "necessary") return true;
    if (!this.config.consentRequired) return true;
    return this.consent?.choices[category] === true;
  }

  private normalizeEventName(eventName: string) {
    const legacy: Record<string, string> = {
      artist_view: "artist_viewed",
      song_view: "release_viewed",
      external_link_click: "external_platform_clicked",
      cta_click: "cta_clicked",
      search_query: "search_submitted",
      browse_filter: "browse_mode_viewed",
      gallery_item_view: "gallery_item_viewed",
      gallery_filter: "search_filter_applied",
      public_error_state: "public_client_error",
    };
    return legacy[eventName] ?? eventName;
  }

  private toFirstPartyEvent(event: PublicAnalyticsEvent, category: ConsentCategory) {
    const properties = Object.fromEntries(
      Object.entries(event.metadata ?? {}).filter(([key]) => !forbiddenProperty.test(key)),
    );
    return {
      eventName: event.eventName,
      eventVersion: "1",
      occurredAt: event.timestamp,
      route: event.route,
      entity: {
        entityType: event.entityType,
        entityId: event.entityId ?? event.releaseId ?? event.artistId,
      },
      properties,
      consentReference: category === "necessary" ? undefined : this.consent?.consentReference,
    };
  }
}

export const analyticsService = new AnalyticsService();
