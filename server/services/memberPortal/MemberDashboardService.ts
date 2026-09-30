import type { MemberAccountResponse } from "../../models/members/MemberModels";
import type { MemberDashboardContentCard, MemberDashboardResponse, MemberReadinessSummary } from "../../models/memberPortal/MemberPortalModels";
import { effectiveEntitlementService } from "../access/EffectiveEntitlementService";
import { membershipAssignmentService } from "../membership/MembershipAssignmentService";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { jsonDatabase } from "../media/JsonDatabase";
import { memberPortalCacheService } from "./MemberPortalCacheService";
import { memberRecommendationService } from "./MemberRecommendationService";
import { favoritesService, followingService, listeningHistoryService, notificationService, playlistService } from "../memberEngagement/MemberEngagementServices";

const forbiddenPattern = /(private\/|signedUrl|signature=|token=|storagePath|privateObjectKey|full[-_]?song)/i;
const safeImage = (value?: string) => value && !forbiddenPattern.test(value) ? value : undefined;

const readiness = (label: string, message: string, href?: string, count = 0, status: MemberReadinessSummary["status"] = "available"): MemberReadinessSummary => ({
  status,
  label,
  message,
  href,
  count,
});

export class MemberDashboardService {
  async getDashboard(member: MemberAccountResponse): Promise<MemberDashboardResponse> {
    const cacheKey = `member:${member.memberId}:dashboard:v${member.authorizationVersion ?? 1}:${member.updatedAt}`;
    return memberPortalCacheService.getOrSet(cacheKey, () => this.buildDashboard(member), 45);
  }

  async getMembershipSummary(member: MemberAccountResponse) {
    const current = await membershipAssignmentService.getCurrentMembership(member.memberId);
    return current?.tier ? {
      tierKey: current.tier.tierKey,
      name: current.tier.name,
      status: current.assignment?.status ?? "active",
      startsAt: current.assignment?.startsAt,
      endsAt: current.assignment?.endsAt,
      billingReadiness: current.tier.isPaidReady ? "readiness_only" as const : "not_configured" as const,
    } : undefined;
  }

  async getRecentReleases(limit = 8): Promise<MemberDashboardContentCard[]> {
    const releases = await publicContentDeliveryService.listPublicReleases();
    return releases.slice(0, limit).map((release) => ({
      contentType: "release",
      contentId: release.releaseId,
      title: release.title,
      subtitle: release.genre,
      href: `/songs/${release.slug}`,
      imageUrl: safeImage(release.coverArtUrl),
      releaseDate: release.releaseDate,
      accessState: "public",
      accessLabel: "Public",
      previewAvailable: Boolean(release.audioPreviewUrl),
      streamAvailable: false,
      downloadAvailable: false,
    }));
  }

  async getMemberGalleries(limit = 6): Promise<MemberDashboardContentCard[]> {
    const galleryItems = await publicContentDeliveryService.listPublicGalleryItems();
    return galleryItems.slice(0, limit).map((item) => ({
      contentType: "gallery",
      contentId: item.galleryItemId ?? item.slug,
      title: item.title,
      subtitle: "Gallery",
      href: `/gallery#${item.slug}`,
      imageUrl: typeof item.media === "string" ? safeImage(item.media) : safeImage(item.media?.url ?? item.media?.thumbnailUrl),
      accessState: "public",
      accessLabel: "Public",
      previewAvailable: true,
      streamAvailable: false,
      downloadAvailable: false,
    }));
  }

  async getAnnouncements(member: MemberAccountResponse): Promise<MemberDashboardContentCard[]> {
    const membership = await this.getMembershipSummary(member);
    const tierKey = membership?.tierKey ?? "free";
    const now = Date.now();
    const data = await jsonDatabase.read();
    const published = data.memberAnnouncements
      .filter((announcement) => announcement.status === "published")
      .filter((announcement) => Date.parse(announcement.startsAt) <= now)
      .filter((announcement) => !announcement.endsAt || Date.parse(announcement.endsAt) > now)
      .filter((announcement) => announcement.audiencePolicy.audience === "all_members" || announcement.audiencePolicy.audience === tierKey)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4);
    const records = published.length ? published : [{
      announcementId: "member-portal-readiness",
      title: "Member portal is active",
      body: "Your dashboard is connected to current membership, access, profile, security, and protected media systems.",
      startsAt: new Date().toISOString(),
      priority: 1,
      status: "published" as const,
      audiencePolicy: { audience: "all_members" as const },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    }];
    return records.map((announcement) => ({
      contentType: "announcement",
      contentId: announcement.announcementId,
      title: announcement.title,
      subtitle: announcement.body,
      href: announcement.cta?.href ?? "/member",
      imageUrl: safeImage(announcement.image),
      accessState: "allowed",
      accessLabel: "Member",
    }));
  }

  async getEarlyAccess(member: MemberAccountResponse, limit = 6): Promise<MemberDashboardContentCard[]> {
    const entitlements = await effectiveEntitlementService.getForMember(member);
    if (!entitlements.allowed.includes("release.early_access")) return [];
    return (await this.getRecentReleases(limit)).map((card) => ({
      ...card,
      accessState: "allowed",
      accessLabel: "Early Access",
      reason: "Visible because your current membership has early-access readiness.",
    }));
  }

  async getExclusiveContent(member: MemberAccountResponse, limit = 6): Promise<MemberDashboardContentCard[]> {
    const entitlements = await effectiveEntitlementService.getForMember(member);
    const exclusive = entitlements.allowed.some((key) => key.includes("premium") || key.includes("supporter") || key.includes("vip") || key === "audio.stream.full");
    if (!exclusive) return [];
    return (await this.getRecentReleases(limit)).map((card) => ({
      ...card,
      accessState: "allowed",
      accessLabel: "Exclusive",
      streamAvailable: entitlements.allowed.includes("audio.stream.full"),
      reason: "Available to your current membership tier where content policy allows.",
    }));
  }

  async getHealth() {
    const data = await jsonDatabase.read();
    const [recent, recommendations] = await Promise.all([
      this.getRecentReleases(3),
      memberRecommendationService.getHealth(),
    ]);
    return {
      overallStatus: "available",
      dashboardReady: true,
      memberScopedCacheReady: memberPortalCacheService.getHealth().cacheAvailable,
      publishedReleaseCount: recent.length,
      recommendations,
      announcementCount: data.memberAnnouncements.length,
      configurationCount: data.memberDashboardConfigurations.length,
      warnings: data.memberDashboardConfigurations.some((item) => item.status === "published") ? [] : ["Default dashboard configuration is code-backed until an admin-published configuration exists."],
      errors: [],
      checkedAt: new Date().toISOString(),
    };
  }

  private async buildDashboard(member: MemberAccountResponse): Promise<MemberDashboardResponse> {
    const [membership, entitlements, recentReleases, recommendations, earlyAccess, exclusiveContent, memberGalleries, announcements, continueListening, favorites, follows, playlists, notifications] = await Promise.all([
      this.getMembershipSummary(member),
      effectiveEntitlementService.getForMember(member),
      this.getRecentReleases(),
      memberRecommendationService.getRecommendations(member),
      this.getEarlyAccess(member),
      this.getExclusiveContent(member),
      this.getMemberGalleries(),
      this.getAnnouncements(member),
      listeningHistoryService.continueListening(member),
      favoritesService.list(member),
      followingService.list(member),
      playlistService.list(member),
      notificationService.list(member),
    ]);
    const hasFullStream = entitlements.allowed.includes("audio.stream.full");
    const hasDownloads = entitlements.allowed.some((key) => key.endsWith(".download") || key === "audio.download");
    const capabilities = [
      { category: "Listening", label: hasFullStream ? "Full protected streams where licensed" : "Public previews and free access", status: "available" as const },
      { category: "Viewing", label: "Public and member-safe content discovery", status: "available" as const },
      { category: "Downloads", label: hasDownloads ? "Download authorization available where content allows" : "Download benefits are not active for this membership", status: hasDownloads ? "available" as const : "coming_soon" as const },
      { category: "Early Access", label: entitlements.allowed.includes("release.early_access") ? "Early-access releases can appear here" : "Early access unlocks with future tiers or grants", status: entitlements.allowed.includes("release.early_access") ? "available" as const : "coming_soon" as const },
      { category: "Engagement", label: "Favorites, following, playlists, history, and notifications are active", status: "available" as const },
    ];
    return {
      member: {
        memberId: member.memberId,
        displayName: member.displayName,
        avatar: safeImage(member.avatar),
        status: member.status,
        emailVerified: member.emailVerified,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        authorizationVersion: member.authorizationVersion,
      },
      membership,
      capabilities,
      welcome: {
        displayName: member.displayName,
        memberSince: member.createdAt,
        greeting: member.emailVerified ? "Welcome back to your member hub." : "Verify your email to unlock the full member experience.",
        primaryAction: member.emailVerified ? { label: "Browse releases", href: "/releases" } : { label: "Verify email", href: "/verify-email" },
        accountState: member.status,
      },
      continueListening: readiness("Continue listening", continueListening.length ? `${continueListening.length} resumable item${continueListening.length === 1 ? "" : "s"} available.` : "Playback history is active. Items appear after member playback events.", "/member/history", continueListening.length),
      recentReleases,
      recommendations,
      followedArtists: readiness("Followed artists", follows.length ? `${follows.length} followed resource${follows.length === 1 ? "" : "s"}.` : "Follow artists, albums, playlists, and collections from member pages.", "/member/following", follows.length),
      earlyAccess,
      exclusiveContent,
      memberGalleries,
      favorites: readiness("Favorites", favorites.length ? `${favorites.length} favorite${favorites.length === 1 ? "" : "s"} saved.` : "Save songs, albums, artists, galleries, playlists, and collections.", "/member/favorites", favorites.length),
      playlists: readiness("Playlists", playlists.length ? `${playlists.length} playlist${playlists.length === 1 ? "" : "s"} created.` : "Create private playlists and add songs from member flows.", "/member/playlists", playlists.length),
      history: readiness("Listening history", "Listening and viewing history are active and private to your account.", "/member/history", continueListening.length),
      notifications: readiness("Notifications", notifications.filter((item) => item.status === "unread").length ? `${notifications.filter((item) => item.status === "unread").length} unread notification${notifications.filter((item) => item.status === "unread").length === 1 ? "" : "s"}.` : "Notification center is active for platform, membership, release, and security messages.", "/member/notifications", notifications.length),
      announcements,
      membershipCta: {
        label: membership?.tierKey === "free" ? "Explore membership" : "Manage membership",
        href: "/member/membership",
        message: membership?.tierKey === "free" ? "Premium, supporter, and VIP plans are readiness-only until billing integration." : "Your current benefits are driven by server-side assignments and entitlements.",
        status: membership?.tierKey === "free" ? "coming_soon" : "available",
      },
      accountStatus: member.status,
      dashboardVersion: 1,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const memberDashboardService = new MemberDashboardService();
