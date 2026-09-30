import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { MediaIntakeRecord } from "../../models/mediaIntake/MediaIntakeModels";
import { sanitizeFileName } from "../../utils/media/mediaPathUtils";
import { mediaUploadApiService } from "../media/MediaUploadApiService";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { mediaIntakeConfigService, type MediaIntakeConfig } from "./MediaIntakeConfigService";
import { mediaIntakeRecordRepository } from "./MediaIntakeRecordRepository";
import { mediaIntakeValidationService } from "./MediaIntakeValidationService";
import { mediaIntakeDuplicateService } from "./MediaIntakeDuplicateService";
import { mediaIntakeClassificationRuleRegistry } from "./MediaIntakeClassificationRuleRegistry";
import { mediaIntakeArtistMatcher } from "./MediaIntakeArtistMatcher";
import { mediaIntakeReleaseMatcher } from "./MediaIntakeReleaseMatcher";
import { artistArtworkAssignmentService } from "./ArtistArtworkAssignmentService";
import { releaseCoverArtAssignmentService } from "./ReleaseCoverArtAssignmentService";

const actorId = "system:media-intake";

const hashPath = (value: string): string => crypto.createHash("sha256").update(path.resolve(value)).digest("hex");

const safeMove = async (sourcePath: string, destinationFolder: string, filename: string): Promise<string> => {
  await fs.mkdir(destinationFolder, { recursive: true });
  const sanitized = sanitizeFileName(filename);
  let destination = path.join(destinationFolder, sanitized);
  let suffix = 1;
  while (await fs.stat(destination).then(() => true).catch(() => false)) {
    const extension = path.extname(sanitized);
    const base = path.basename(sanitized, extension);
    destination = path.join(destinationFolder, `${base}-${suffix}${extension}`);
    suffix += 1;
  }
  await fs.rename(sourcePath, destination).catch(async () => {
    await fs.copyFile(sourcePath, destination);
    await fs.unlink(sourcePath);
  });
  return destination;
};

const assetTypeFor = (classification: string, mediaType: string): string => {
  if (classification === "artist_character_art") return "artist_profile";
  if (classification === "release_cover_art") return "cover_art";
  if (mediaType === "audio") return "custom_audio";
  if (mediaType === "video") return "video";
  return "custom_image";
};

const terminalStatuses = new Set(["completed", "assigned", "review_required", "duplicate", "quarantined"]);

export class WatchedFolderMediaIngestionService {
  async ingest(filePath: string, options: { config?: MediaIntakeConfig; force?: boolean } = {}): Promise<MediaIntakeRecord> {
    const config = options.config ?? mediaIntakeConfigService.getConfig();
    const filename = path.basename(filePath);
    const sourcePathHash = hashPath(filePath);
    const now = new Date().toISOString();
    let record = await mediaIntakeRecordRepository.findBySourcePathHash(sourcePathHash);
    if (record && !options.force && terminalStatuses.has(record.status)) {
      const archivedPath = await safeMove(filePath, config.archiveFolder, filename).catch(() => undefined);
      const updated = await mediaIntakeRecordRepository.patch(record.intakeId, {
        completedAt: record.completedAt ?? now,
        lastErrorSafeMessage: record.status === "duplicate" ? "Exact file was already processed by watched-folder intake." : "File path was already processed by watched-folder intake.",
        metadata: {
          ...(record.metadata ?? {}),
          repeatedDropArchivedAt: now,
          repeatedDropArchivePath: archivedPath ?? null,
        },
      });
      return updated ?? record;
    }
    if (!record) {
      const stat = await fs.stat(filePath);
      record = await mediaIntakeRecordRepository.create({
        intakeId: `intake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sourceFilename: filename,
        sourcePathHash,
        sourceFolder: path.dirname(filePath),
        sourceExtension: path.extname(filename).replace(/^\./, "").toLowerCase(),
        fileSize: stat.size,
        status: "discovered",
        suggestedMatches: [],
        firstSeenAt: now,
        attemptCount: 0,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
    }

    await mediaIntakeRecordRepository.patch(record.intakeId, { status: "validating", attemptCount: record.attemptCount + 1 });
    const validation = await mediaIntakeValidationService.validate(filePath, config);
    if (!validation.valid) {
      await safeMove(filePath, config.quarantineFolder, filename).catch(() => undefined);
      return (await mediaIntakeRecordRepository.patch(record.intakeId, {
        status: "quarantined",
        detectedMimeType: validation.detectedMimeType,
        detectedMediaType: validation.detectedMediaType,
        lastErrorCode: "MEDIA_INTAKE_VALIDATION_FAILED",
        lastErrorSafeMessage: validation.errors.join(" "),
        failedAt: new Date().toISOString(),
        metadata: { validationWarnings: validation.warnings },
      }))!;
    }

    const checksum = await mediaIntakeDuplicateService.calculateChecksum(filePath);
    const duplicatePolicy = mediaIntakeDuplicateService.resolveDuplicatePolicy(
      await mediaIntakeDuplicateService.findExistingIntake(checksum),
      await mediaIntakeDuplicateService.findExistingMediaAsset(checksum),
    );
    if (duplicatePolicy.duplicate) {
      await safeMove(filePath, config.archiveFolder, filename).catch(() => undefined);
      return (await mediaIntakeRecordRepository.patch(record.intakeId, {
        status: "duplicate",
        checksum,
        detectedMimeType: validation.detectedMimeType,
        detectedMediaType: validation.detectedMediaType,
        completedAt: new Date().toISOString(),
        lastErrorSafeMessage: duplicatePolicy.reason,
      }))!;
    }

    const classification = mediaIntakeClassificationRuleRegistry.classify({
      filename,
      extension: validation.extension,
      detectedMediaType: validation.detectedMediaType,
      detectedMimeType: validation.detectedMimeType,
    });
    record = (await mediaIntakeRecordRepository.patch(record.intakeId, {
      status: "classified",
      checksum,
      detectedMimeType: validation.detectedMimeType,
      detectedMediaType: validation.detectedMediaType,
      classification: classification.classification,
      classificationRule: classification.classificationRule,
      parsedTokens: classification.parsedTokens,
      sequenceNumber: classification.sequenceNumber,
      assignedAssetRole: classification.assetRole,
    }))!;

    const buffer = await fs.readFile(filePath);
    const upload = await mediaUploadApiService.uploadSingle({
      fieldName: "file",
      fileName: filename,
      mimeType: validation.detectedMimeType ?? "application/octet-stream",
      size: validation.fileSize,
      buffer,
    }, {
      targetType: "media_library",
      targetId: "watched_intake",
      ownerType: "media_library",
      ownerId: "watched_intake",
      assetType: assetTypeFor(classification.classification, validation.detectedMediaType),
      intendedUse: classification.assetRole ?? classification.classification,
      accessLevel: "admin_only",
      title: path.basename(filename, path.extname(filename)).replace(/[_-]+/g, " "),
      metadata: {
        intakeId: record.intakeId,
        intakeSource: "watched_folder",
        sourceFilename: filename,
        sourcePathHash,
        checksum,
        classification: classification.classification,
        classificationRule: classification.classificationRule,
        assignmentReviewStatus: "review_required",
      },
    }, actorId);

    if (!upload.success || !upload.mediaAsset) {
      await safeMove(filePath, config.failedFolder, filename).catch(() => undefined);
      return (await mediaIntakeRecordRepository.patch(record.intakeId, {
        status: "failed",
        failedAt: new Date().toISOString(),
        lastErrorCode: "MEDIA_INTAKE_UPLOAD_FAILED",
        lastErrorSafeMessage: upload.errors?.join(" ") || "Managed media upload failed.",
      }))!;
    }

    record = (await mediaIntakeRecordRepository.patch(record.intakeId, {
      status: "matching",
      mediaAssetId: upload.mediaAsset.assetId,
      ingestedAt: new Date().toISOString(),
    }))!;

    const match = await this.matchRecord(record);
    const autoAllowed = config.autoAssignEnabled && match.confidence.decision === "auto_assign" && match.confidence.overallScore >= config.minConfidence && match.matches.length === 1;
    if (autoAllowed) {
      const assigned = await this.assign(record, match.matches[0].entityType, match.matches[0].entityId);
      await safeMove(filePath, config.deleteSourceAfterSuccess ? config.archiveFolder : config.archiveFolder, filename).catch(() => undefined);
      return assigned;
    }

    await safeMove(filePath, config.reviewFolder, filename).catch(() => undefined);
    await mediaAuditPersistenceService.record("media_intake_review_required", `Watched media "${filename}" requires assignment review`, {
      actorId,
      entityType: "media_intake_record",
      entityId: record.intakeId,
      metadata: { classification: classification.classification, mediaAssetId: upload.mediaAsset.assetId },
    });
    return (await mediaIntakeRecordRepository.patch(record.intakeId, {
      status: "review_required",
      assignmentConfidence: match.confidence,
      suggestedMatches: match.matches,
      lastErrorSafeMessage: match.confidence.reasons.join(" "),
      metadata: { ...(record.metadata ?? {}), reviewFolder: config.reviewFolder },
    }))!;
  }

  async matchRecord(record: MediaIntakeRecord) {
    if (record.classification === "artist_character_art") {
      return mediaIntakeArtistMatcher.findCandidateMatches(String(record.parsedTokens?.artistToken ?? ""));
    }
    if (record.classification === "release_cover_art") {
      return mediaIntakeReleaseMatcher.findCandidateMatches(String(record.parsedTokens?.releaseToken ?? ""));
    }
    return {
      matches: [],
      confidence: {
        overallScore: 0,
        ruleScore: 0,
        identifierScore: 0,
        nameScore: 0,
        titleScore: 0,
        aliasScore: 0,
        mediaTypeScore: record.detectedMediaType === "unsupported" ? 0 : 1,
        conflictPenalty: 0,
        candidateCount: 0,
        decision: "review_required" as const,
        reasons: ["No automatic assignment rule exists for this media type."],
      },
    };
  }

  async assign(record: MediaIntakeRecord, entityType: string, entityId: string): Promise<MediaIntakeRecord> {
    if (!record.mediaAssetId) throw new Error("Cannot assign intake record before media asset creation.");
    if (record.classification === "artist_character_art" && entityType === "artist") {
      if ((record.sequenceNumber ?? 0) === 0) await artistArtworkAssignmentService.assignProfileImage(entityId, record.mediaAssetId, { actorId, intakeId: record.intakeId });
      else await artistArtworkAssignmentService.assignCharacterArt(entityId, record.mediaAssetId, record.sequenceNumber ?? 1, { actorId, intakeId: record.intakeId });
    } else if (record.classification === "release_cover_art" && entityType === "release") {
      await releaseCoverArtAssignmentService.assignCoverArt(entityId, record.mediaAssetId, { actorId, intakeId: record.intakeId });
    } else {
      throw new Error("Intake assignment is not compatible with the classification.");
    }
    await mediaAuditPersistenceService.record("media_intake_auto_assigned", `Auto-assigned watched media "${record.sourceFilename}"`, {
      actorId,
      entityType: "media_intake_record",
      entityId: record.intakeId,
      metadata: { mediaAssetId: record.mediaAssetId, assignedEntityType: entityType, assignedEntityId: entityId },
    });
    return (await mediaIntakeRecordRepository.patch(record.intakeId, {
      status: "completed",
      assignedEntityType: entityType,
      assignedEntityId: entityId,
      assignedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }))!;
  }
}

export const watchedFolderMediaIngestionService = new WatchedFolderMediaIngestionService();
