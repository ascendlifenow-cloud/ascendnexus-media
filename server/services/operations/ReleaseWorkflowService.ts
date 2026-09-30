import type { ReleaseWorkflowRecord, ReleaseWorkflowStatus, ReleaseWorkflowType } from "../../models/operations/OperationsModels";
import { releaseWorkflowRepository, publishingCalendarEventRepository } from "../../repositories/operations/OperationsRepository";
import { asRecord, asString, buildDefaultPipeline, id, nowIso, releaseWorkflowTypes } from "./operationsShared";

const allowedTransitions: Record<ReleaseWorkflowStatus, ReleaseWorkflowStatus[]> = {
  draft: ["internal_review", "content_review", "cancelled", "archived"],
  internal_review: ["content_review", "draft", "cancelled"],
  content_review: ["artwork_review", "metadata_review", "draft", "cancelled"],
  artwork_review: ["metadata_review", "content_review", "cancelled"],
  metadata_review: ["seo_review", "artwork_review", "cancelled"],
  seo_review: ["publishing_review", "metadata_review", "cancelled"],
  publishing_review: ["scheduled", "publishing", "seo_review", "cancelled"],
  scheduled: ["publishing", "cancelled", "archived"],
  publishing: ["published", "paused", "failed", "rollback"],
  published: ["verified", "rollback", "archived"],
  verified: ["archived", "rollback"],
  archived: ["draft"],
  cancelled: ["draft", "archived"],
  rollback: ["draft", "failed", "archived"],
  paused: ["publishing", "failed", "cancelled"],
  failed: ["paused", "publishing", "rollback", "archived"],
};

export class ReleaseWorkflowService {
  async listWorkflows() {
    return releaseWorkflowRepository.list({ sort: "updatedAt", direction: "desc", includeArchived: true });
  }

  async getWorkflow(workflowId: string) {
    const workflow = await releaseWorkflowRepository.get(workflowId);
    if (!workflow) throw new Error("Release workflow not found.");
    return workflow;
  }

  async createWorkflow(payload: unknown, actorId: string): Promise<ReleaseWorkflowRecord> {
    const body = asRecord(payload);
    const releaseType = releaseWorkflowTypes.includes(body.releaseType as ReleaseWorkflowType) ? body.releaseType as ReleaseWorkflowType : "single";
    const title = asString(body.title, "Untitled Release Workflow");
    const createdAt = nowIso();
    const workflow: ReleaseWorkflowRecord = {
      workflowId: id("workflow"),
      releaseType,
      title,
      status: "draft",
      entityType: asString(body.entityType) || undefined,
      entityId: asString(body.entityId) || undefined,
      artistId: asString(body.artistId) || undefined,
      releaseId: asString(body.releaseId) || undefined,
      galleryItemId: asString(body.galleryItemId) || undefined,
      scheduledFor: asString(body.scheduledFor) || undefined,
      embargoUntil: asString(body.embargoUntil) || undefined,
      timezone: asString(body.timezone, "UTC"),
      approvalState: {},
      pipeline: buildDefaultPipeline(),
      automationEnabled: body.automationEnabled !== false,
      createdBy: actorId,
      createdAt,
      updatedAt: createdAt,
      metadata: { source: "admin_operations", ...(asRecord(body.metadata)) },
      schemaVersion: 1,
    };
    const created = await releaseWorkflowRepository.create(workflow as ReleaseWorkflowRecord & Record<string, unknown>);
    if (created.scheduledFor) {
      await publishingCalendarEventRepository.create({
        calendarEventId: id("calendar_event"),
        title: created.title,
        eventType: "scheduled_release",
        status: "scheduled",
        startsAt: created.scheduledFor,
        workflowId: created.workflowId,
        entityType: created.entityType,
        entityId: created.entityId,
        createdBy: actorId,
        createdAt,
        updatedAt: createdAt,
        metadata: {},
        schemaVersion: 1,
      });
    }
    return created;
  }

  async transitionWorkflow(workflowId: string, nextStatus: ReleaseWorkflowStatus, actorId: string, note?: string) {
    const workflow = await this.getWorkflow(workflowId);
    const allowed = allowedTransitions[workflow.status] ?? [];
    if (!allowed.includes(nextStatus)) throw new Error(`Invalid workflow transition from ${workflow.status} to ${nextStatus}.`);
    const history = Array.isArray(workflow.metadata?.transitionHistory) ? workflow.metadata.transitionHistory as unknown[] : [];
    const updated = await releaseWorkflowRepository.update(workflowId, {
      status: nextStatus,
      updatedBy: actorId,
      failureReason: nextStatus === "failed" ? note ?? workflow.failureReason : undefined,
      metadata: {
        ...workflow.metadata,
        transitionHistory: [...history, { from: workflow.status, to: nextStatus, actorId, note, at: nowIso() }],
      },
    });
    if (!updated) throw new Error("Release workflow update failed.");
    return updated;
  }

  async markStep(workflowId: string, stepId: string, status: ReleaseWorkflowRecord["pipeline"][number]["status"], issues: string[] = [], warnings: string[] = []) {
    const workflow = await this.getWorkflow(workflowId);
    const pipeline = workflow.pipeline.map((step) => step.stepId === stepId ? {
      ...step,
      status,
      blockingIssues: issues,
      warnings,
      completedAt: ["passed", "failed", "skipped", "blocked"].includes(status) ? nowIso() : step.completedAt,
      startedAt: status === "running" && !step.startedAt ? nowIso() : step.startedAt,
    } : step);
    const updated = await releaseWorkflowRepository.update(workflowId, {
      pipeline,
      currentStep: stepId,
      status: status === "failed" || status === "blocked" ? "paused" : workflow.status,
    });
    if (!updated) throw new Error("Release workflow pipeline update failed.");
    return updated;
  }
}

export const releaseWorkflowService = new ReleaseWorkflowService();
