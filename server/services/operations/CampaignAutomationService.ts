import { campaignScheduleRepository } from "../../repositories/operations/OperationsRepository";
import { asRecord, asString, asStringArray, id, nowIso } from "./operationsShared";

export class CampaignAutomationService {
  listCampaigns() {
    return campaignScheduleRepository.list({ includeArchived: true, sort: "scheduledFor", direction: "asc" });
  }

  async scheduleCampaign(payload: unknown, actorId: string) {
    const body = asRecord(payload);
    const campaignType = asString(body.campaignType, "social") as "social" | "newsletter" | "email" | "announcement" | "promotion";
    const title = asString(body.title, `${campaignType} campaign`);
    const scheduledFor = asString(body.scheduledFor) || undefined;
    return campaignScheduleRepository.create({
      campaignId: id("campaign"),
      campaignType,
      title,
      status: scheduledFor ? "scheduled" : "draft",
      workflowId: asString(body.workflowId) || undefined,
      entityType: asString(body.entityType) || undefined,
      entityId: asString(body.entityId) || undefined,
      scheduledFor,
      channels: asStringArray(body.channels).length ? asStringArray(body.channels) : [campaignType],
      generatedContent: asRecord(body.generatedContent),
      createdBy: actorId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      metadata: asRecord(body.metadata),
      schemaVersion: 1,
    });
  }

  async generateReleaseCampaign(workflowId: string, actorId: string) {
    return this.scheduleCampaign({
      campaignType: "social",
      title: `Release announcement for ${workflowId}`,
      workflowId,
      channels: ["website", "social", "newsletter"],
      generatedContent: {
        posts: [{ channel: "social", body: "New Ascend Nexus Media release is scheduled. Final copy requires operations review." }],
        subject: "New release from Ascend Nexus Media",
      },
    }, actorId);
  }
}

export const campaignAutomationService = new CampaignAutomationService();
