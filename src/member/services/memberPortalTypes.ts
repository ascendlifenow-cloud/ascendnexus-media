import type { MemberAccountResponse, MemberSessionResponse, MemberPreferences } from "../../../server/models/members/MemberModels";

export type MemberPortalFeatureStatus = "available" | "coming_soon" | "unavailable";

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
    accountState?: string;
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
  accountStatus: string;
  dashboardVersion: number;
  generatedAt: string;
}

export interface MemberPortalSession {
  authenticated: true;
  member: MemberAccountResponse;
  sessionId: string;
  sessionExpiresAt: string;
}

export type { MemberAccountResponse, MemberSessionResponse, MemberPreferences };
