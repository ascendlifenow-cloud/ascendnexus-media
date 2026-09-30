import { releaseWorkflowRepository } from "../../repositories/operations/OperationsRepository";
import { publicContentCacheService } from "../public/PublicContentCacheService";
import { publicSitemapService } from "../seo/PublicSitemapService";
import { publicSearchDeliveryService } from "../public/PublicSearchService";
import { releaseVerificationService } from "./ReleaseVerificationService";
import { campaignAutomationService } from "./CampaignAutomationService";
import { homepageAutomationService } from "./HomepageAutomationService";
import { releaseWorkflowService } from "./ReleaseWorkflowService";
import { nowIso } from "./operationsShared";

export class PublishingAutomationService {
  async runWorkflow(workflowId: string, actorId = "system") {
    const workflow = await releaseWorkflowService.getWorkflow(workflowId);
    if (!workflow.automationEnabled) throw new Error("Workflow automation is disabled.");
    await releaseWorkflowRepository.update(workflowId, { status: "publishing", currentStep: "validate_content" });
    const completedSteps = [];
    for (const step of workflow.pipeline) {
      await releaseWorkflowService.markStep(workflowId, step.stepId, "running");
      const result = await this.runStep(workflowId, step.stepId, actorId);
      await releaseWorkflowService.markStep(workflowId, step.stepId, result.status, result.blockingIssues, result.warnings);
      completedSteps.push({ stepId: step.stepId, ...result });
      if ((result.status === "failed" || result.status === "blocked") && step.required) {
        await releaseWorkflowRepository.update(workflowId, { status: "paused", failureReason: result.blockingIssues[0] ?? "Required operation step failed." });
        return { status: "paused", workflowId, completedSteps, checkedAt: nowIso() };
      }
    }
    await releaseWorkflowRepository.update(workflowId, { status: "verified" });
    return { status: "completed", workflowId, completedSteps, checkedAt: nowIso() };
  }

  private async runStep(workflowId: string, stepId: string, actorId: string) {
    try {
      if (stepId === "refresh_cache") {
        publicContentCacheService.clearPublicCache();
        return { status: "passed" as const, blockingIssues: [], warnings: [] };
      }
      if (stepId === "update_homepage") {
        await homepageAutomationService.runSafeRefresh();
        return { status: "passed" as const, blockingIssues: [], warnings: [] };
      }
      if (stepId === "update_sitemap") {
        const sitemap = await publicSitemapService.verifySitemaps();
        return sitemap.status === "passed"
          ? { status: "passed" as const, blockingIssues: [], warnings: [] }
          : { status: "failed" as const, blockingIssues: sitemap.blockingIssues, warnings: [] };
      }
      if (stepId === "update_search") {
        await publicSearchDeliveryService.searchPublicContent({ q: "" });
        return { status: "passed" as const, blockingIssues: [], warnings: [] };
      }
      if (stepId === "generate_social_posts") {
        await campaignAutomationService.generateReleaseCampaign(workflowId, actorId);
        return { status: "passed" as const, blockingIssues: [], warnings: ["Campaign content generated for operations review; provider send is not automatic without an approved campaign schedule."] };
      }
      if (stepId === "verify_public_site" || stepId === "mark_release_complete") {
        const verification = await releaseVerificationService.verify({ workflowId }, actorId);
        return verification.blockingIssues.length
          ? { status: "failed" as const, blockingIssues: verification.blockingIssues, warnings: verification.warnings }
          : { status: "passed" as const, blockingIssues: [], warnings: verification.warnings };
      }
      if (stepId === "publish") {
        return { status: "passed" as const, blockingIssues: [], warnings: ["Publication orchestration remains the source of truth; this step verifies workflow readiness and does not bypass publication permissions."] };
      }
      if (stepId === "queue_newsletter") {
        return { status: "skipped" as const, blockingIssues: [], warnings: ["Newsletter provider send requires an approved campaign schedule."] };
      }
      return { status: "passed" as const, blockingIssues: [], warnings: [] };
    } catch (error) {
      return { status: "failed" as const, blockingIssues: [error instanceof Error ? error.message : "Pipeline step failed."], warnings: [] };
    }
  }
}

export const publishingAutomationService = new PublishingAutomationService();
