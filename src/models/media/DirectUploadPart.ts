export type DirectUploadPartStatus = "pending" | "uploading" | "completed" | "failed" | "canceled";

export interface DirectUploadPart {
  partNumber: number;
  sizeBytes: number;
  etag?: string;
  checksum?: string;
  status: DirectUploadPartStatus;
  attempts: number;
  uploadedAt?: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

export interface DirectUploadPartAuthorization {
  partNumber: number;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders?: Record<string, string>;
}
