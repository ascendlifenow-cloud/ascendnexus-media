export type PublicAnalyticsEventType =
  | "page_view"
  | "artist_view"
  | "song_view"
  | "audio_preview"
  | "external_link"
  | "cta_click"
  | "search"
  | "browse_filter"
  | "gallery"
  | "error"
  | "custom";

export type PublicAnalyticsEntityType =
  | "page"
  | "artist"
  | "song"
  | "release"
  | "gallery_item"
  | "external_link"
  | "cta"
  | "search"
  | "browse"
  | "custom";

export type PublicAnalyticsMetadataValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | boolean[];

export type PublicAnalyticsMetadata = Record<string, PublicAnalyticsMetadataValue>;

export interface PublicAnalyticsEvent {
  eventId?: string;
  eventType: PublicAnalyticsEventType;
  eventName: string;
  route?: string;
  entityType?: PublicAnalyticsEntityType;
  entityId?: string;
  entitySlug?: string;
  artistId?: string;
  releaseId?: string;
  metadata?: PublicAnalyticsMetadata;
  timestamp: string;
  sessionId?: string;
}
