import { releaseWorkflowService } from "./ReleaseWorkflowService";
import { publishingCalendarService } from "./PublishingCalendarService";

export class ReleaseSchedulingService {
  async scheduleRelease(workflowId: string, scheduledFor: string, actorId: string) {
    const workflow = await releaseWorkflowService.transitionWorkflow(workflowId, "scheduled", actorId, `Scheduled for ${scheduledFor}`);
    await publishingCalendarService.createEvent({
      title: workflow.title,
      eventType: "scheduled_release",
      status: "scheduled",
      startsAt: scheduledFor,
      workflowId,
      entityType: workflow.entityType,
      entityId: workflow.entityId,
    }, actorId);
    return workflow;
  }
}

export const releaseSchedulingService = new ReleaseSchedulingService();
