import type { MediaIntakeRecord } from "../../models/mediaIntake/MediaIntakeModels";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaIntakeConfigService } from "./MediaIntakeConfigService";
import { mediaIntakeRecordRepository } from "./MediaIntakeRecordRepository";
import { watchedFolderMediaIngestionService } from "./WatchedFolderMediaIngestionService";

export async function automaticAssignmentBlocker(record: MediaIntakeRecord, entityType: string, entityId: string): Promise<string | undefined> {
  const data = await jsonDatabase.read();
  const asset = data.mediaAssets.find((item) => item.assetId === record.mediaAssetId);
  if (!asset || ["archived", "deleted"].includes(asset.status)) return "Asset is unavailable.";
  if (data.mediaAssetLinks.some((link) => link.assetId === asset.assetId && link.status === "active")) return "Asset is already assigned.";
  const entity = entityType === "release" ? data.releaseRecords.find((item) => item.releaseId === entityId) : data.artistRecords.find((item) => item.artistId === entityId);
  if (!entity || entity.status !== "draft" || entity.publicVisibility || entity.publicationState !== "draft") return "Published, active, or unavailable targets require manual review.";
  if (data.adminAuditEvents.some((event) => event.entityId === entityId && event.action === "production_draft_ingested")) return "Production bundles require explicit asset revision review.";
  const field = entityType === "release" ? "coverArtUrl" : (record.sequenceNumber ?? 0) === 0 ? "profileImage" : "characterArtUrl";
  if (data.mediaAssetLinks.some((link) => link.entityId === entityId && link.fieldKey === field && link.status === "active")) return "The target slot is already occupied.";
  if (entityType === "release" && (("coverArtUrl" in entity && entity.coverArtUrl) || entity.metadata?.coverArtAssetId)) return "Existing cover art requires replacement review.";
  if (entityType === "artist" && (("profileImage" in entity && entity.profileImage) || entity.metadata?.profileImageAssetId || entity.metadata?.characterArtAssets)) return "Existing artist artwork requires replacement review.";
  return undefined;
}

let running = false;
export async function reprocessPendingIntake(dryRun = true) {
  if (running) throw new Error("Automatic assignment is already running. Retry after it completes.");
  running = true;
  try {
    const config = mediaIntakeConfigService.getConfig();
    const pending = (await mediaIntakeRecordRepository.list()).filter((record) => ["review_required", "assignment_pending"].includes(record.status)).slice(0, 100);
    const results: { intakeId: string; score: number; status: string; reason?: string }[] = [];
    for (const original of pending) {
      const record = await mediaIntakeRecordRepository.get(original.intakeId);
      if (!record || !["review_required", "assignment_pending"].includes(record.status)) continue;
      try {
        const current = await jsonDatabase.read();
        const existingLink = current.mediaAssetLinks.find((link) => link.assetId === record.mediaAssetId && link.status === "active");
        const linkedAsset = current.mediaAssets.find((asset) => asset.assetId === record.mediaAssetId && !["deleted", "archived"].includes(asset.status));
        const linkedTarget = existingLink?.entityType === "release" ? current.releaseRecords.find((item) => item.releaseId === existingLink.entityId) : existingLink?.entityType === "artist" ? current.artistRecords.find((item) => item.artistId === existingLink.entityId) : undefined;
        if (existingLink && linkedAsset && linkedTarget && !["deleted", "archived"].includes(linkedTarget.status)) {
          if (!dryRun) await mediaIntakeRecordRepository.patch(record.intakeId, { status: "completed", assignedEntityType: existingLink.entityType, assignedEntityId: existingLink.entityId, completedAt: new Date().toISOString() });
          results.push({ intakeId: record.intakeId, score: 1, status: dryRun ? "already_assigned" : "reconciled" });
          continue;
        }
        const match = await watchedFolderMediaIngestionService.matchRecord(record);
        const target = match.matches[0];
        const reason = !config.autoAssignEnabled ? "Automatic assignment is disabled." : !target || match.matches.length !== 1 || match.confidence.decision !== "auto_assign" || match.confidence.overallScore <= config.minConfidence ? "Match is below threshold, ambiguous, or unsupported." : await automaticAssignmentBlocker(record, target.entityType, target.entityId);
        if (reason) { results.push({ intakeId: record.intakeId, score: match.confidence.overallScore, status: "review_required", reason }); continue; }
        if (!dryRun) {
          await mediaIntakeRecordRepository.patch(record.intakeId, { assignmentConfidence: match.confidence, suggestedMatches: match.matches });
          await watchedFolderMediaIngestionService.assign(record, target.entityType, target.entityId);
        }
        results.push({ intakeId: record.intakeId, score: match.confidence.overallScore, status: dryRun ? "eligible" : "assigned" });
      } catch { results.push({ intakeId: record.intakeId, score: 0, status: "failed", reason: "Assignment could not complete; item remains available for review." }); }
    }
    return { success: true, dryRun, threshold: config.minConfidence, assessed: results.length, assigned: results.filter((result) => result.status === "assigned").length, reconciled: results.filter((result) => result.status === "reconciled").length, results };
  } finally { running = false; }
}
