import type { AnalyticsConfig } from "../../models/analytics";
import type {
  PublicAnalyticsEvent,
  PublicAnalyticsEventType,
  PublicAnalyticsMetadata,
} from "../../models/analytics/PublicAnalyticsEvent";

const isDevelopment = import.meta.env.DEV;

let inMemorySessionId: string | undefined;

const createId = (prefix: string) => {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
};

export const getAnalyticsSessionId = () => {
  if (!inMemorySessionId) {
    inMemorySessionId = createId("anm_session");
  }

  return inMemorySessionId;
};

export const createAnalyticsEventId = () => createId("anm_event");

export const defaultAnalyticsConfig: AnalyticsConfig = {
  enabled: true,
  debug: isDevelopment,
  provider: isDevelopment ? "console" : "none",
  trackPageViews: true,
  trackClicks: true,
  trackAudioPreview: true,
  trackSearch: true,
  trackBrowse: true,
  trackGallery: true,
  consentRequired: true,
};

export const sanitizeRoute = (route: string | undefined): string | undefined => {
  if (!route) return undefined;
  const [path] = route.split("#");
  return path.split("?")[0] || "/";
};

export const sanitizeAnalyticsMetadata = (metadata: PublicAnalyticsMetadata | undefined): PublicAnalyticsMetadata | undefined => {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) return [key, value.slice(0, 12)];
        if (typeof value === "string") return [key, value.slice(0, 160)];
        return [key, value];
      }),
  );
};

export const buildAnalyticsEvent = (
  event: Omit<PublicAnalyticsEvent, "eventId" | "timestamp" | "sessionId"> & {
    timestamp?: string;
    sessionId?: string;
    eventId?: string;
  },
): PublicAnalyticsEvent => ({
  ...event,
  eventId: event.eventId ?? createAnalyticsEventId(),
  route: sanitizeRoute(event.route),
  metadata: sanitizeAnalyticsMetadata(event.metadata),
  timestamp: event.timestamp ?? new Date().toISOString(),
  sessionId: event.sessionId ?? getAnalyticsSessionId(),
});

export const isEventTypeEnabled = (eventType: PublicAnalyticsEventType, config: AnalyticsConfig): boolean => {
  if (!config.enabled) return false;

  if (eventType === "page_view") return config.trackPageViews;
  if (eventType === "audio_preview") return config.trackAudioPreview;
  if (eventType === "search") return config.trackSearch;
  if (eventType === "browse_filter") return config.trackBrowse;
  if (eventType === "gallery") return config.trackGallery;
  if (eventType === "external_link" || eventType === "cta_click") return config.trackClicks;

  return true;
};
