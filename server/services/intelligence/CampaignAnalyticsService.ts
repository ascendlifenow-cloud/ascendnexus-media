import { campaignScheduleRepository } from "../../repositories/operations/OperationsRepository";
import { nowIso } from "./intelligenceShared";

export class CampaignAnalyticsService {
  async buildCampaignDashboard() {
    const campaigns = await campaignScheduleRepository.list({ includeArchived: true });
    return {
      campaigns,
      bestPerformingCampaigns: campaigns.filter((campaign) => campaign.status === "verified").slice(0, 10),
      failedCampaigns: campaigns.filter((campaign) => campaign.status === "failed"),
      scheduledCampaigns: campaigns.filter((campaign) => campaign.status === "scheduled"),
      checkedAt: nowIso(),
    };
  }
}

export const campaignAnalyticsService = new CampaignAnalyticsService();
