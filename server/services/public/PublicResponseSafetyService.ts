import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";

export interface PublicResponseSafetyContext {
  endpoint: string;
  entityType?: string;
  entityId?: string;
}

export interface PublicResponseSafetyReport {
  safe: boolean;
  forbiddenKeys: string[];
  privateUrls: string[];
  signedUrls: string[];
  storagePaths: string[];
  fullSongReferences: string[];
  adminMetadata: string[];
  checkedAt: string;
}

const forbiddenKeyPatterns = [
  /password/i,
  /passwordHash/i,
  /token/i,
  /tokenHash/i,
  /secret/i,
  /session/i,
  /resetToken/i,
  /accessKey/i,
  /privatePath/i,
  /storagePath/i,
  /signedUrl/i,
  /fullSongUrl/i,
  /fullSongAssetId/i,
  /adminNotes/i,
  /audit/i,
  /processingJob/i,
  /uploadJob/i,
  /publicationLock/i,
  /internalMetadata/i,
  /createdByEmail/i,
  /updatedByEmail/i,
  /^_id$/,
];

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const looksLikePublicResourceLocator = (value: string): boolean => {
  const lower = value.toLowerCase();
  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith("/") ||
    lower.includes("storage/") ||
    lower.includes("uploads/") ||
    lower.includes("bucket=") ||
    lower.includes("signature=") ||
    lower.includes("token=") ||
    lower.includes("x-amz-")
  );
};

export class PublicResponseSafetyService {
  scanResponse(payload: unknown, context: PublicResponseSafetyContext): PublicResponseSafetyReport {
    const report: PublicResponseSafetyReport = {
      safe: true,
      forbiddenKeys: [],
      privateUrls: [],
      signedUrls: [],
      storagePaths: [],
      fullSongReferences: [],
      adminMetadata: [],
      checkedAt: new Date().toISOString(),
    };
    this.walk(payload, context.endpoint || "response", report);
    report.safe = !report.forbiddenKeys.length && !report.privateUrls.length && !report.signedUrls.length && !report.storagePaths.length && !report.fullSongReferences.length && !report.adminMetadata.length;
    return report;
  }

  async assertPublicSafe(payload: unknown, context: PublicResponseSafetyContext): Promise<void> {
    const report = this.scanResponse(payload, context);
    if (report.safe) return;
    await mediaAuditPersistenceService.record("public_response_safety_violation", `Blocked unsafe public response for ${context.endpoint}`, {
      entityType: "public_delivery",
      entityId: context.entityId ?? context.endpoint,
      metadata: {
        endpoint: context.endpoint,
        entityType: context.entityType,
        forbiddenKeyCount: report.forbiddenKeys.length,
        privateUrlCount: report.privateUrls.length,
        signedUrlCount: report.signedUrls.length,
        storagePathCount: report.storagePaths.length,
        fullSongReferenceCount: report.fullSongReferences.length,
      },
    });
    throw new Error(`PUBLIC_RESPONSE_SAFETY_VIOLATION:${context.endpoint}`);
  }

  buildSafetyReport(payload: unknown, context: PublicResponseSafetyContext) {
    return this.scanResponse(payload, context);
  }

  findForbiddenKeys(payload: unknown) {
    return this.scanResponse(payload, { endpoint: "scan" }).forbiddenKeys;
  }

  findPrivateUrls(payload: unknown) {
    return this.scanResponse(payload, { endpoint: "scan" }).privateUrls;
  }

  findSignedUrls(payload: unknown) {
    return this.scanResponse(payload, { endpoint: "scan" }).signedUrls;
  }

  findStoragePaths(payload: unknown) {
    return this.scanResponse(payload, { endpoint: "scan" }).storagePaths;
  }

  findFullSongReferences(payload: unknown) {
    return this.scanResponse(payload, { endpoint: "scan" }).fullSongReferences;
  }

  findAdminMetadata(payload: unknown) {
    return this.scanResponse(payload, { endpoint: "scan" }).adminMetadata;
  }

  sanitizeOptionalUnsafeFields<T>(payload: T): T {
    if (Array.isArray(payload)) return payload.map((item) => this.sanitizeOptionalUnsafeFields(item)) as T;
    if (!isObject(payload)) return payload;
    return Object.fromEntries(Object.entries(payload)
      .filter(([key]) => !forbiddenKeyPatterns.some((pattern) => pattern.test(key)))
      .map(([key, value]) => [key, this.sanitizeOptionalUnsafeFields(value)])) as T;
  }

  private walk(value: unknown, path: string, report: PublicResponseSafetyReport): void {
    if (value == null) return;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      const isResourceLocator = looksLikePublicResourceLocator(value);
      if (isResourceLocator && (lower.includes("private/") || lower.includes("/private"))) report.privateUrls.push(path);
      if (isResourceLocator && (/(^|[/?&#._-])signed([/?&#._=-]|$)/i.test(lower) || lower.includes("signature=") || lower.includes("token=") || lower.includes("x-amz-"))) report.signedUrls.push(path);
      if (isResourceLocator && (lower.includes("storage/objects/") || lower.includes("storagepath") || lower.includes("bucket="))) report.storagePaths.push(path);
      if (isResourceLocator && (lower.includes("fullsong") || lower.includes("full-song") || lower.includes("full_song"))) report.fullSongReferences.push(path);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => this.walk(item, `${path}[${index}]`, report));
      return;
    }
    if (!isObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (forbiddenKeyPatterns.some((pattern) => pattern.test(key))) report.forbiddenKeys.push(childPath);
      if (/^(adminNotes|adminMetadata|internalMetadata|audit|auditHistory|publicationState|publicVisibility|processingJobs?|uploadJobs?)$/i.test(key)) report.adminMetadata.push(childPath);
      this.walk(child, childPath, report);
    }
  }
}

export const publicResponseSafetyService = new PublicResponseSafetyService();
