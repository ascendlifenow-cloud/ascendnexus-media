import type { MemberAccountResponse, MemberAccountStatus } from "../members/MemberModels";

export type MemberPortalFeatureStatus = "available" | "coming_soon" | "unavailable";
export type MemberRecommendationSource = "editorial" | "new_release" | "trending" | "genre_affinity" | "membership_feature";
export type MemberAnnouncementAudience = "all_members" | "free" | "premium" | "supporter" | "vip" | "specific_entitlement";
export type MemberDashboardConfigurationStatus = "draft" | "published" | "archived";
export type MemberAnnouncementStatus = "draft" | "published" | "archived";
export type MemberRecommendationStatus = "active" | "dismissed" | "expired" | "invalidated";

export interface MemberDashboardConfigurationRecord {
  configurationId: string;
  version: number;
  status: MemberDashboardConfigurationStatus;
  sections: string[];
  defaultLayout: string;
  tierOverrides?: Record<string, string[]>;
  announcementPolicy?: Record<string, unknown>;
  recommendationPolicy?: Record<string, unknown>;
  fallbackPolicy?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberRecommendationRecord {
  recommendationId: string;
  memberId: string;
  contentType: "release" | "artist" | "gallery" | "announcement";
  contentId: string;
  source: MemberRecommendationSource;
  score: number;
  reasonCode: string;
  generatedAt: string;
  expiresAt: string;
  accessDecisionVersion: number;
  status: MemberRecommendationStatus;
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}

export interface MemberAnnouncementRecord {
  announcementId: string;
  title: string;
  body: string;
  image?: string;
  cta?: { label: string; href: string };
  audiencePolicy: {
    audience: MemberAnnouncementAudience;
    entitlementKey?: string;
  };
  startsAt: string;
  endsAt?: string;
  priority: number;
  dismissible?: boolean;
  status: MemberAnnouncementStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberDashboardContentCard {
  contentType: "release" | "gallery" | "artist" | "announcement";
  contentId: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
  releaseDate?: string;
  accessState: "public" | "allowed" | "preview" | "upgrade_required" | "coming_soon";
  accessLabel: string;
  previewAvailable?: boolean;
  streamAvailable?: boolean;
  downloadAvailable?: boolean;
  reason?: string;
}

export interface MemberReadinessSummary {
  status: MemberPortalFeatureStatus;
  label: string;
  message: string;
  count?: number;
  href?: string;
}

export interface MemberDashboardResponse {
  member: Pick<MemberAccountResponse, "memberId" | "displayName" | "avatar" | "status" | "emailVerified" | "createdAt" | "updatedAt" | "authorizationVersion">;
  membership?: {
    tierKey: string;
    name: string;
    status: string;
    startsAt?: string;
    endsAt?: string;
    billingReadiness: "not_configured" | "readiness_only" | "configured";
  };
  capabilities: Array<{ category: string; label: string; status: MemberPortalFeatureStatus }>;
  welcome: {
    displayName: string;
    memberSince: string;
    greeting: string;
    primaryAction: { label: string; href: string };
    accountState?: MemberAccountStatus;
  };
  continueListening: MemberReadinessSummary;
  recentReleases: MemberDashboardContentCard[];
  recommendations: MemberDashboardContentCard[];
  followedArtists: MemberReadinessSummary;
  earlyAccess: MemberDashboardContentCard[];
  exclusiveContent: MemberDashboardContentCard[];
  memberGalleries: MemberDashboardContentCard[];
  favorites: MemberReadinessSummary;
  playlists: MemberReadinessSummary;
  history: MemberReadinessSummary;
  notifications: MemberReadinessSummary;
  announcements: MemberDashboardContentCard[];
  membershipCta: { label: string; href: string; message: string; status: MemberPortalFeatureStatus };
  accountStatus: MemberAccountStatus;
  dashboardVersion: number;
  generatedAt: string;
}
