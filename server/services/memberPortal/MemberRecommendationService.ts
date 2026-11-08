import type { MemberAccountResponse } from "../../models/members/MemberModels";
import type { MemberDashboardContentCard } from "../../models/memberPortal/MemberPortalModels";
import { memberSongCatalogService } from "./MemberSongCatalogService";

export class MemberRecommendationService {
  async getRecommendations(member: MemberAccountResponse, limit = 6): Promise<MemberDashboardContentCard[]> {
    return (await memberSongCatalogService.list(member.memberId))
      .slice(0, limit)
      .map((release) => ({
        ...release,
        reason: member.preferences.privacy.showFavorites ? "Based on eligible releases and your current preferences." : "Editorial and new-release recommendation.",
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
