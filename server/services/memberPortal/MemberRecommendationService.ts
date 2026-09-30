import type { MemberAccountResponse } from "../../models/members/MemberModels";
import type { MemberDashboardContentCard } from "../../models/memberPortal/MemberPortalModels";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";

const safeImage = (value?: string) => value && !/(private\/|signedUrl|signature=|token=|storagePath|full[-_]?song)/i.test(value) ? value : undefined;

export class MemberRecommendationService {
  async getRecommendations(member: MemberAccountResponse, limit = 6): Promise<MemberDashboardContentCard[]> {
    const [featured, latest] = await Promise.all([
      publicContentDeliveryService.getFeaturedPublicReleases(),
      publicContentDeliveryService.listPublicReleases(),
    ]);
    const byId = new Map([...featured, ...latest].map((release) => [release.releaseId, release]));
    return Array.from(byId.values())
      .slice(0, limit)
      .map((release) => ({
        contentType: "release" as const,
        contentId: release.releaseId,
        title: release.title,
        subtitle: [release.genre, release.featured ? "Featured" : ""].filter(Boolean).join(" · "),
        href: `/songs/${release.slug}`,
        imageUrl: safeImage(release.coverArtUrl),
        releaseDate: release.releaseDate,
        accessState: "public" as const,
        accessLabel: "Public",
        previewAvailable: Boolean(release.audioPreviewUrl),
        streamAvailable: false,
        downloadAvailable: false,
        reason: member.preferences.privacy.showFavorites ? "Based on public releases and your current preferences." : "Editorial and new-release recommendation.",
      }));
  }

  getHealth() {
    return {
      overallStatus: "available",
      sources: ["editorial", "new_release", "trending_readiness"],
      personalizedHistoryReady: false,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const memberRecommendationService = new MemberRecommendationService();
