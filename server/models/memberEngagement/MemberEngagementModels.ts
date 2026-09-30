export type EngagementResourceType = "song" | "release" | "album" | "artist" | "video" | "gallery" | "playlist" | "collection" | "search";
export type MemberFavoriteStatus = "active" | "removed";
export type MemberFollowStatus = "active" | "unfollowed";
export type MemberPlaylistVisibility = "private" | "public_readiness" | "unlisted_readiness";
export type MemberPlaylistStatus = "active" | "archived" | "deleted";
export type MemberHistoryEventType = "played" | "completed" | "skipped" | "viewed" | "resumed";
export type MemberNotificationType = "new_artist_release" | "favorite_artist_release" | "playlist_updated" | "exclusive_content" | "early_access" | "membership_update" | "system_message" | "security_notification" | "platform_announcement";
export type MemberNotificationStatus = "unread" | "read" | "archived";
export type MemberRecommendationFeedbackAction = "liked" | "hidden" | "not_interested" | "favorited";
export type MemberCollectionStatus = "active" | "archived" | "deleted";
export type MemberSavedSearchStatus = "active" | "deleted";

export interface MemberEngagementResourceRef {
  resourceType: EngagementResourceType;
  resourceId: string;
  title?: string;
  slug?: string;
  imageUrl?: string;
  metadataSafe?: Record<string, unknown>;
}

export interface MemberFavoriteRecord {
  favoriteId: string;
  memberId: string;
  resource: MemberEngagementResourceRef;
  status: MemberFavoriteStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberFollowRecord {
  followId: string;
  memberId: string;
  resource: MemberEngagementResourceRef;
  status: MemberFollowStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberPlaylistRecord {
  playlistId: string;
  memberId: string;
  name: string;
  description?: string;
  visibility: MemberPlaylistVisibility;
  status: MemberPlaylistStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberPlaylistItemRecord {
  playlistItemId: string;
  playlistId: string;
  memberId: string;
  resource: MemberEngagementResourceRef;
  position: number;
  addedAt: string;
  schemaVersion: number;
}

export interface MemberPlaybackHistoryRecord {
  historyId: string;
  memberId: string;
  resource: MemberEngagementResourceRef;
  eventType: MemberHistoryEventType;
  lastPositionSeconds?: number;
  durationSeconds?: number;
  listenedSeconds?: number;
  playbackDevice?: "web" | "mobile_web" | "unknown";
  occurredAt: string;
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}

export interface MemberViewingHistoryRecord {
  viewingHistoryId: string;
  memberId: string;
  resource: MemberEngagementResourceRef;
  occurredAt: string;
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}

export interface MemberNotificationRecord {
  notificationId: string;
  memberId: string;
  type: MemberNotificationType;
  title: string;
  body: string;
  resource?: MemberEngagementResourceRef;
  delivery: {
    inApp: boolean;
    emailReady: boolean;
    pushReady: boolean;
    digestReady: boolean;
  };
  status: MemberNotificationStatus;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  schemaVersion: number;
}

export interface MemberRecommendationFeedbackRecord {
  feedbackId: string;
  memberId: string;
  recommendationId?: string;
  resource: MemberEngagementResourceRef;
  action: MemberRecommendationFeedbackAction;
  reason?: string;
  createdAt: string;
  schemaVersion: number;
}

export interface MemberSavedSearchRecord {
  savedSearchId: string;
  memberId: string;
  name: string;
  query: string;
  filters?: Record<string, string>;
  status: MemberSavedSearchStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberCollectionRecord {
  collectionId: string;
  memberId: string;
  name: string;
  description?: string;
  status: MemberCollectionStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberCollectionItemRecord {
  collectionItemId: string;
  collectionId: string;
  memberId: string;
  resource: MemberEngagementResourceRef;
  position: number;
  addedAt: string;
  schemaVersion: number;
}
