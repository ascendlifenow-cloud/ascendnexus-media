import type { MediaUploadResult } from "./MediaUploadResult";
import type { DirectMediaUploadSession } from "./DirectMediaUploadSession";
import type { DirectUploadPartAuthorization } from "./DirectUploadPart";

export type DirectUploadStrategy = "single_presigned" | "multipart_presigned" | "backend_proxy";

export interface DirectUploadError {
  code: string;
  message: string;
  stage: string;
  retryable: boolean;
  partNumber?: number;
  uploadSessionId?: string;
}

export interface DirectUploadSessionResponse {
  success: boolean;
  uploadSessionId?: string;
  uploadJobId?: string;
  provider?: string;
  storagePathKey?: string;
  uploadStrategy: DirectUploadStrategy;
  partSizeBytes?: number;
  totalParts?: number;
  expiresAt?: string;
  parts?: DirectUploadPartAuthorization[];
  singleUploadUrl?: string;
  requiredHeaders?: Record<string, string>;
  session?: DirectMediaUploadSession;
  result?: MediaUploadResult;
  warnings?: string[];
  errors?: string[];
}
