export type MediaIntakeStatus =
  | "discovered"
  | "waiting_for_stability"
  | "ready"
  | "validating"
  | "quarantined"
  | "classified"
  | "matching"
  | "auto_assignment_pending"
  | "processing"
  | "assignment_pending"
  | "review_required"
  | "assigned"
  | "completed"
  | "failed"
  | "ignored"
  | "duplicate"
  | "superseded";

export type MediaIntakeClassification =
  | "artist_character_art"
  | "release_cover_art"
  | "unclassified_image"
  | "unclassified_audio"
  | "unclassified_video"
  | "unsupported_file";

export type MediaIntakeMediaType = "image" | "audio" | "video" | "unsupported";
export type MediaIntakeDecision = "auto_assign" | "review_recommended" | "review_required" | "reject";

export interface MediaIntakeSuggestedMatch {
  entityType: "artist" | "release" | "gallery_item" | "media_asset";
  entityId: string;
  label: string;
  score: number;
  reasons: string[];
}

export interface MediaAssignmentConfidence {
  overallScore: number;
  ruleScore: number;
  identifierScore: number;
  nameScore: number;
  titleScore: number;
  aliasScore: number;
  mediaTypeScore: number;
  conflictPenalty: number;
  candidateCount: number;
  decision: MediaIntakeDecision;
  reasons: string[];
}

export interface MediaIntakeRecord {
  intakeId: string;
  sourceFilename: string;
  sourcePathHash: string;
  sourceFolder: string;
  sourceExtension: string;
  detectedMimeType?: string;
  detectedMediaType?: MediaIntakeMediaType;
  fileSize: number;
  checksum?: string;
  status: MediaIntakeStatus;
  classification?: MediaIntakeClassification;
  classificationRule?: string;
  parsedTokens?: Record<string, unknown>;
  assignmentConfidence?: MediaAssignmentConfidence;
  suggestedMatches: MediaIntakeSuggestedMatch[];
  assignedEntityType?: string;
  assignedEntityId?: string;
  assignedAssetRole?: string;
  sequenceNumber?: number;
  mediaAssetId?: string;
  processingJobId?: string;
  firstSeenAt: string;
  stableAt?: string;
  ingestedAt?: string;
  assignedAt?: string;
  reviewedAt?: string;
  completedAt?: string;
  failedAt?: string;
  attemptCount: number;
  lastErrorCode?: string;
  lastErrorSafeMessage?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  metadata?: Record<string, unknown>;
}
