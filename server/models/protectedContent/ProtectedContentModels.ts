export type MediaAccessClassification =
  | "public"
  | "guest_preview"
  | "member_preview"
  | "protected_stream"
  | "protected_download"
  | "supporter_exclusive"
  | "vip_exclusive"
  | "early_access"
  | "embargoed"
  | "unlisted"
  | "staff_only"
  | "admin_only"
  | "private_master"
  | "quarantined"
  | "blocked";

export type ProtectedDeliveryMode = "public_cdn" | "protected_gateway" | "signed_cdn_url" | "signed_cdn_cookie" | "direct_private_stream";
export type ProtectedDeliveryAction = "view" | "preview" | "stream" | "download" | "thumbnail" | "transcript" | "caption" | "waveform";

export interface MediaDeliveryProfileRecord {
  deliveryProfileId: string;
  profileKey: string;
  name: string;
  mediaType: "audio" | "video" | "image" | "document" | "custom";
  accessClassification: MediaAccessClassification;
  deliveryMode: ProtectedDeliveryMode;
  requiredEntitlementKey: string;
  allowedActions: ProtectedDeliveryAction[];
  tokenTtlSeconds: number;
  maxUses?: number;
  rangeRequestsAllowed: boolean;
  downloadAllowed: boolean;
  publicCacheAllowed: boolean;
  privateCacheAllowed: boolean;
  cdnAllowed: boolean;
  sessionBindingRequired: boolean;
  memberBindingRequired: boolean;
  watermarkingReadiness: "disabled" | "ready";
  status: "draft" | "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface ProtectedMediaResourceRecord {
  protectedMediaResourceId: string;
  mediaAssetId: string;
  contentType: string;
  contentId: string;
  mediaType: "audio" | "video" | "image" | "document" | "custom";
  deliveryProfileId: string;
  storageProvider: string;
  privateObjectKey: string;
  publicPreviewAssetId?: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  checksum?: string;
  status: "processing" | "ready" | "blocked" | "quarantined" | "archived" | "deleted";
  publicationVersion?: string;
  accessPolicyId?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface ProtectedPlaybackSessionRecord {
  playbackSessionId: string;
  memberId: string;
  sessionIdHash: string;
  mediaAssetId: string;
  contentId: string;
  authorizationId: string;
  status: "authorized" | "starting" | "playing" | "paused" | "completed" | "expired" | "revoked" | "failed";
  startedAt: string;
  lastHeartbeatAt?: string;
  endedAt?: string;
  expiresAt: string;
  maxConcurrentStreams?: number;
  clientCategory?: string;
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}

export interface ProtectedContentTakedownRecord {
  takedownId: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  status: "active" | "restored";
  createdBy?: string;
  createdAt: string;
  restoredBy?: string;
  restoredAt?: string;
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}
