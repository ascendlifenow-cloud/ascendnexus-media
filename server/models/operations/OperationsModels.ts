export type ReleaseWorkflowType =
  | "single"
  | "ep"
  | "album"
  | "music_video"
  | "gallery_collection"
  | "blog"
  | "news_announcement"
  | "playlist"
  | "featured_collection"
  | "artist_launch"
  | "seasonal_event"
  | "promotional_campaign";

export type ReleaseWorkflowStatus =
  | "draft"
  | "internal_review"
  | "content_review"
  | "artwork_review"
  | "metadata_review"
  | "seo_review"
  | "publishing_review"
  | "scheduled"
  | "publishing"
  | "published"
  | "verified"
  | "archived"
  | "cancelled"
  | "rollback"
  | "paused"
  | "failed";

export type OperationsPipelineStepStatus = "pending" | "running" | "passed" | "failed" | "skipped" | "blocked";

export interface OperationsPipelineStep {
  stepId: string;
  name: string;
  status: OperationsPipelineStepStatus;
  required: boolean;
  startedAt?: string;
  completedAt?: string;
  blockingIssues: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface ReleaseWorkflowRecord {
  workflowId: string;
  releaseType: ReleaseWorkflowType;
  title: string;
  status: ReleaseWorkflowStatus;
  entityType?: string;
  entityId?: string;
  artistId?: string;
  releaseId?: string;
  galleryItemId?: string;
  scheduledFor?: string;
  embargoUntil?: string;
  timezone?: string;
  approvalState: {
    internalReview?: string;
    contentReview?: string;
    artworkReview?: string;
    metadataReview?: string;
    seoReview?: string;
    publishingReview?: string;
  };
  pipeline: OperationsPipelineStep[];
  lastVerificationId?: string;
  automationEnabled: boolean;
  currentStep?: string;
  failureReason?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export type PublishingCalendarEventType =
  | "upcoming_release"
  | "scheduled_release"
  | "publishing_window"
  | "social_campaign"
  | "email_campaign"
  | "content_deadline"
  | "production_milestone"
  | "marketing_event"
  | "platform_promotion"
  | "homepage_feature"
  | "artist_spotlight"
  | "anniversary"
  | "seasonal_release";

export interface PublishingCalendarEventRecord {
  calendarEventId: string;
  title: string;
  eventType: PublishingCalendarEventType;
  status: "planned" | "scheduled" | "active" | "completed" | "cancelled" | "archived";
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  workflowId?: string;
  entityType?: string;
  entityId?: string;
  campaignId?: string;
  sortOrder?: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface ReleaseTemplateRecord {
  releaseTemplateId: string;
  name: string;
  releaseType: ReleaseWorkflowType;
  status: "active" | "archived";
  checklist: string[];
  defaultPipeline: OperationsPipelineStep[];
  defaultCampaigns: string[];
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface CampaignScheduleRecord {
  campaignId: string;
  campaignType: "social" | "newsletter" | "email" | "announcement" | "promotion";
  title: string;
  status: "draft" | "scheduled" | "queued" | "sent" | "verified" | "failed" | "cancelled" | "archived";
  workflowId?: string;
  entityType?: string;
  entityId?: string;
  scheduledFor?: string;
  channels: string[];
  generatedContent?: {
    subject?: string;
    body?: string;
    posts?: Array<{ channel: string; body: string; scheduledFor?: string }>;
  };
  verification?: {
    checkedAt?: string;
    status?: "pending" | "passed" | "failed";
    issues?: string[];
  };
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface ReleaseVerificationRecord {
  verificationId: string;
  workflowId?: string;
  entityType: string;
  entityId?: string;
  status: "pending" | "passed" | "failed" | "warning";
  checks: Array<{
    checkId: string;
    name: string;
    status: "passed" | "failed" | "warning" | "skipped";
    message: string;
    checkedAt: string;
  }>;
  blockingIssues: string[];
  warnings: string[];
  verifiedAt: string;
  createdBy: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface ContentLifecycleRecord {
  lifecycleId: string;
  entityType: string;
  entityId: string;
  lifecycleStage: "planned" | "draft" | "review" | "scheduled" | "published" | "optimize" | "stale" | "archived";
  healthStatus: "healthy" | "warning" | "critical" | "unknown";
  nextReviewAt?: string;
  recommendations: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface OperationalMetricsSnapshotRecord {
  snapshotId: string;
  period: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  measuredAt: string;
  metrics: Record<string, number>;
  warnings: string[];
  blockingIssues: string[];
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface OptimizationRecommendationRecord {
  recommendationId: string;
  category:
    | "missing_artwork"
    | "missing_metadata"
    | "weak_description"
    | "duplicate_seo"
    | "broken_link"
    | "low_engagement"
    | "unused_gallery"
    | "stale_homepage"
    | "inactive_artist"
    | "orphaned_media"
    | "storage_optimization"
    | "cdn_optimization"
    | "search_optimization"
    | "performance";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "accepted" | "resolved" | "dismissed" | "archived";
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  detectedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface OperationalReportRecord {
  reportId: string;
  reportType: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  status: "generated" | "failed" | "archived";
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: string;
  sections: Array<{ sectionId: string; title: string; body: string; metrics?: Record<string, number>; warnings?: string[] }>;
  blockingIssues: string[];
  warnings: string[];
  createdBy: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export type DistributionDestination =
  | "website"
  | "homepage"
  | "artist_pages"
  | "release_pages"
  | "gallery"
  | "rss_feed"
  | "search_index"
  | "seo_index"
  | "newsletter"
  | "email_campaigns"
  | "youtube"
  | "youtube_shorts"
  | "instagram"
  | "instagram_reels"
  | "facebook"
  | "threads"
  | "tiktok"
  | "spotify"
  | "apple_music"
  | "amazon_music"
  | "soundcloud"
  | "bandcamp"
  | "discord"
  | "patreon"
  | "x"
  | "pinterest"
  | "mastodon"
  | "podcast_platforms"
  | "future_platform";

export type DistributionJobStatus = "queued" | "running" | "completed" | "failed" | "retrying" | "dead_letter" | "cancelled" | "paused";
export type DistributionQueueName = "media_transformation" | "platform_upload" | "verification" | "retry" | "analytics_sync" | "cleanup";

export interface DistributionPipelineStep {
  stepId: string;
  name: string;
  status: OperationsPipelineStepStatus;
  required: boolean;
  startedAt?: string;
  completedAt?: string;
  blockingIssues: string[];
  warnings: string[];
}

export interface DistributionJobRecord {
  distributionJobId: string;
  entityType: "song" | "album" | "music_video" | "short" | "reel" | "artwork" | "gallery_collection" | "promotional_graphic" | "blog_post" | "news_article" | "rss_feed" | "podcast_episode" | "livestream_metadata" | "release" | "gallery_item" | "artist";
  entityId: string;
  assetId?: string;
  destinations: DistributionDestination[];
  status: DistributionJobStatus;
  priority: "low" | "normal" | "high" | "urgent";
  scheduledFor?: string;
  queueName: DistributionQueueName;
  currentDestination?: DistributionDestination;
  pipeline: DistributionPipelineStep[];
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface PlatformConnectorRecord {
  connectorId: string;
  platform: DistributionDestination;
  displayName: string;
  status: "enabled" | "disabled" | "needs_configuration" | "unavailable" | "archived";
  supportsUpload: boolean;
  supportsUpdate: boolean;
  supportsDelete: boolean;
  supportsAnalytics: boolean;
  authStatus: "configured" | "missing" | "expired" | "revoked" | "not_required";
  rateLimitStatus: "ok" | "limited" | "exhausted" | "unknown";
  lastHealthCheckAt?: string;
  warnings: string[];
  errors: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface MediaTransformationRecord {
  transformationId: string;
  distributionJobId?: string;
  assetId?: string;
  transformationType: "image_size" | "thumbnail" | "square_artwork" | "portrait_artwork" | "landscape_artwork" | "banner" | "social_graphic" | "quote_graphic" | "video_thumbnail" | "preview_clip" | "waveform_video" | "animated_cover" | "short_clip" | "preview_audio" | "trailer_video" | "gif" | "platform_export";
  targetPlatform?: DistributionDestination;
  status: "queued" | "processing" | "completed" | "failed" | "skipped";
  sourceAssetId?: string;
  outputAssetId?: string;
  checksum?: string;
  durationMs?: number;
  warnings: string[];
  errors: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface PlatformUploadRecord {
  uploadId: string;
  distributionJobId: string;
  platform: DistributionDestination;
  connectorId?: string;
  status: "queued" | "uploading" | "uploaded" | "verified" | "failed" | "retrying" | "deleted";
  platformId?: string;
  platformUrl?: string;
  title?: string;
  description?: string;
  hashtags: string[];
  attemptCount: number;
  lastAttemptAt?: string;
  verifiedAt?: string;
  retryable: boolean;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface DistributionAnalyticsRecord {
  analyticsId: string;
  platform: DistributionDestination;
  platformId?: string;
  distributionJobId?: string;
  collectedAt: string;
  metrics: {
    views?: number;
    streams?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    subscribers?: number;
    followers?: number;
    ctr?: number;
    watchTimeSeconds?: number;
    retentionRate?: number;
    playlistAdds?: number;
    platformRanking?: number;
    revenue?: number;
  };
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface DistributionAuditEventRecord {
  distributionAuditEventId: string;
  distributionJobId?: string;
  platform?: DistributionDestination;
  eventType: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  actorId?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export type IntelligencePeriod = "day" | "week" | "month" | "quarter" | "year" | "lifetime" | "custom";

export interface ArtistIntelligenceSnapshotRecord {
  intelligenceSnapshotId: string;
  artistId: string;
  period: IntelligencePeriod;
  periodStart?: string;
  periodEnd?: string;
  audience: Record<string, number>;
  contentPerformance: Record<string, number>;
  platformPerformance: Record<string, number>;
  seoPerformance: Record<string, number>;
  revenueReadiness: Record<string, number | string>;
  topSongs: Array<{ releaseId: string; title: string; score: number }>;
  topVideos: Array<{ entityId: string; title: string; score: number }>;
  topAlbums: Array<{ releaseId: string; title: string; score: number }>;
  recommendations: string[];
  generatedAt: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface IntelligenceInsightRecord {
  insightId: string;
  scope: "global" | "artist" | "release" | "campaign" | "platform" | "seo" | "audience";
  entityType?: string;
  entityId?: string;
  insightType: "trend" | "recommendation" | "forecast" | "alert" | "answer";
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  summary: string;
  confidence: number;
  status: "open" | "acknowledged" | "resolved" | "dismissed" | "archived";
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface IntelligenceReportRecord {
  intelligenceReportId: string;
  reportType: "daily_artist" | "weekly_artist" | "monthly_growth" | "quarterly_executive" | "annual_performance" | "platform_comparison" | "campaign" | "seo" | "audience" | "release";
  scope: "global" | "artist" | "release" | "platform" | "campaign";
  entityId?: string;
  status: "generated" | "failed" | "archived";
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: string;
  metrics: Record<string, number>;
  insights: string[];
  recommendations: string[];
  warnings: string[];
  createdBy: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}

export interface GrowthForecastRecord {
  forecastId: string;
  scope: "global" | "artist" | "release" | "platform";
  entityId?: string;
  metric: "followers" | "streams" | "traffic" | "audience_size" | "campaign_performance" | "publishing_volume" | "platform_growth" | "storage_growth" | "processing_needs";
  horizonDays: number;
  currentValue: number;
  forecastValue: number;
  confidence: number;
  generatedAt: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  schemaVersion: number;
}
