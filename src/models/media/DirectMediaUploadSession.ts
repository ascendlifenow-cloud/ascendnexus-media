import type { MediaAccessLevel, MediaCategory } from "./MediaStorageObject";
import type { DirectUploadPart } from "./DirectUploadPart";

export type DirectMediaUploadSessionStatus =
  | "created"
  | "authorized"
  | "uploading"
  | "paused"
  | "verifying"
  | "completing"
  | "completed"
  | "failed"
  | "expired"
  | "canceled";

export interface DirectMediaUploadSession {
  uploadSessionId: string;
  uploadJobId: string;
  provider: string;
  bucket?: string;
  storagePath: string;
  assetType: string;
  mediaCategory: MediaCategory;
  targetType: string;
  targetId?: string;
  ownerType?: string;
  ownerId?: string;
  intendedUse: string;
  accessLevel: MediaAccessLevel;
  originalFileName: string;
  sanitizedFileName: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
  checksum?: string;
  multipartUploadId?: string;
  partSizeBytes?: number;
  totalParts?: number;
  uploadedParts: DirectUploadPart[];
  status: DirectMediaUploadSessionStatus;
  expiresAt: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateDirectUploadSessionRequest {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  assetType: string;
  targetType: string;
  targetId?: string;
  ownerType?: string;
  ownerId?: string;
  intendedUse: string;
  accessLevel?: MediaAccessLevel;
  checksum?: string;
  metadata?: Record<string, unknown>;
}
