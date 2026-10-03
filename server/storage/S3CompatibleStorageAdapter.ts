import { createHmac, createHash } from "node:crypto";
import { mediaBackendConfig } from "../config/mediaBackendConfig";
import type { MediaStorageObject } from "../models/mediaModels";
import { getFileExtension, sanitizeFileName } from "../utils/media/mediaPathUtils";
import { joinBaseUrlAndPath, isPublicStoragePath } from "../utils/media/storageUrlUtils";
import { normalizeStorageProviderError, StorageProviderError } from "../utils/media/storageProviderErrorUtils";
import type { BackendStorageProviderAdapter, BackendStorageUploadInput } from "./StorageProviderAdapter";

interface S3CompatibleOptions {
  providerName: "r2" | "s3";
  service?: string;
}

const sha256Hex = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const hmac = (key: string | Buffer, value: string): Buffer => createHmac("sha256", key).update(value).digest();
const hmacHex = (key: string | Buffer, value: string): string => createHmac("sha256", key).update(value).digest("hex");
const amzDate = (date = new Date()): string => date.toISOString().replace(/[:-]|\.\d{3}/g, "");
const shortDate = (date: string): string => date.slice(0, 8);
const awsEncode = (value: string): string => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const encodePath = (storagePath: string): string => storagePath.split("/").map(awsEncode).join("/");
const lexicalCompare = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;
const cleanMetadataValue = (value: unknown): string => String(value ?? "").replace(/[\r\n]/g, " ").slice(0, 1024);
const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const getSigningKey = (secret: string, date: string, region: string, service: string): Buffer => {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
};

export class S3CompatibleStorageAdapter implements BackendStorageProviderAdapter {
  private readonly service: string;

  constructor(private readonly options: S3CompatibleOptions) {
    this.service = options.service ?? "s3";
  }

  getProviderName(): string {
    return this.options.providerName;
  }

  isConfigured(): boolean {
    return Boolean(
      mediaBackendConfig.endpoint &&
      mediaBackendConfig.bucket &&
      mediaBackendConfig.region &&
      mediaBackendConfig.accessKeyId &&
      mediaBackendConfig.secretAccessKey,
    );
  }

  supportsDirectUpload(): boolean {
    return this.isConfigured();
  }

  async createMultipartUpload(storagePath: string, options: {
    mimeType: string;
    fileSizeBytes: number;
    assetType: string;
    accessLevel: string;
    checksum?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ multipartUploadId: string; requiredHeaders?: Record<string, string> }> {
    this.assertConfigured();
    const response = await this.signedFetch("POST", storagePath, {
      query: { uploads: "" },
      contentType: options.mimeType,
      contentLength: 0,
      checksum: options.checksum,
      cacheControl: this.getCacheControl(options.accessLevel, options.assetType),
      metadata: {
        ...(options.metadata ?? {}),
        accessLevel: options.accessLevel,
        assetType: options.assetType,
        expectedFileSizeBytes: options.fileSizeBytes,
      },
    });
    if (!response.ok) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "multipart_create"));
    const text = await response.text();
    const multipartUploadId = /<UploadId>([^<]+)<\/UploadId>/i.exec(text)?.[1];
    if (!multipartUploadId) throw new StorageProviderError({
      code: "DIRECT_UPLOAD_PROVIDER_UNAVAILABLE",
      message: "Storage provider did not return a multipart upload id.",
      retryable: true,
      provider: this.getProviderName(),
      stage: "multipart_create",
    });
    return { multipartUploadId };
  }

  async createPresignedPartUploadUrl(storagePath: string, multipartUploadId: string, partNumber: number, options: {
    expiresInSeconds: number;
    contentLength?: number;
    mimeType?: string;
  }): Promise<{ uploadUrl: string; expiresAt: string; requiredHeaders?: Record<string, string> }> {
    this.assertConfigured();
    const expiresInSeconds = Math.min(options.expiresInSeconds, mediaBackendConfig.maxSignedUrlExpirationSeconds);
    return {
      uploadUrl: this.createPresignedUrl("PUT", storagePath, expiresInSeconds, {
        partNumber: String(partNumber),
        uploadId: multipartUploadId,
      }),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      requiredHeaders: options.mimeType ? { "Content-Type": options.mimeType } : undefined,
    };
  }

  async completeMultipartUpload(storagePath: string, multipartUploadId: string, completedParts: Array<{ partNumber: number; etag: string }>): Promise<{ etag?: string; metadata?: Record<string, unknown> }> {
    this.assertConfigured();
    const body = Buffer.from([
      "<CompleteMultipartUpload>",
      ...completedParts
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((part) => `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${escapeXml(part.etag)}</ETag></Part>`),
      "</CompleteMultipartUpload>",
    ].join(""));
    const response = await this.signedFetch("POST", storagePath, {
      query: { uploadId: multipartUploadId },
      body,
      contentType: "application/xml",
      contentLength: body.byteLength,
    });
    if (!response.ok) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "multipart_complete"));
    const text = await response.text();
    const etag = /<ETag>"?([^"<]+)"?<\/ETag>/i.exec(text)?.[1] ?? response.headers.get("etag")?.replace(/"/g, "") ?? undefined;
    return { etag, metadata: { completedPartCount: completedParts.length } };
  }

  async abortMultipartUpload(storagePath: string, multipartUploadId: string): Promise<boolean> {
    this.assertConfigured();
    const response = await this.signedFetch("DELETE", storagePath, { query: { uploadId: multipartUploadId } });
    if (response.status === 404) return false;
    if (!response.ok && response.status !== 204) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "multipart_abort"));
    return true;
  }

  async listUploadedParts(storagePath: string, multipartUploadId: string): Promise<Array<{ partNumber: number; etag?: string; sizeBytes?: number }>> {
    this.assertConfigured();
    const response = await this.signedFetch("GET", storagePath, { query: { uploadId: multipartUploadId } });
    if (!response.ok) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "multipart_list_parts"));
    const text = await response.text();
    return [...text.matchAll(/<Part>[\s\S]*?<PartNumber>(\d+)<\/PartNumber>[\s\S]*?<ETag>"?([^"<]+)"?<\/ETag>[\s\S]*?(?:<Size>(\d+)<\/Size>)?[\s\S]*?<\/Part>/gi)]
      .map((match) => ({ partNumber: Number(match[1]), etag: match[2], sizeBytes: match[3] ? Number(match[3]) : undefined }));
  }

  async upload(input: BackendStorageUploadInput): Promise<MediaStorageObject> {
    this.assertConfigured();
    const accessLevel = input.target.assetType === "full_song" ? "admin_only" : input.target.accessLevel ?? "admin_only";
    const cacheControl = this.getCacheControl(accessLevel, input.target.assetType);
    const response = await this.signedFetch("PUT", input.storagePath, {
      body: input.file.buffer,
      contentType: input.file.mimeType,
      contentLength: input.file.size,
      checksum: input.checksum,
      cacheControl,
      metadata: {
        ...(input.target.metadata ?? {}),
        accessLevel,
        assetType: input.target.assetType,
        checksum: input.checksum,
      },
    });
    if (!response.ok) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "upload"));
    const etag = response.headers.get("etag")?.replace(/"/g, "") ?? undefined;
    const now = new Date().toISOString();
    return {
      storageObjectId: `storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: this.getProviderName(),
      bucket: mediaBackendConfig.bucket,
      storagePath: input.storagePath,
      publicUrl: accessLevel === "public" ? this.getPublicUrl(input.storagePath) : undefined,
      fileName: sanitizeFileName(input.file.fileName),
      originalFileName: input.file.fileName,
      mimeType: input.file.mimeType,
      fileExtension: getFileExtension(input.file.fileName),
      fileSizeBytes: input.file.size,
      mediaCategory: input.file.mimeType.startsWith("audio/") ? "audio" : input.file.mimeType.startsWith("video/") ? "video" : input.file.mimeType.startsWith("image/") ? "image" : "custom",
      assetType: input.target.assetType,
      accessLevel,
      status: "ready",
      checksum: input.checksum,
      uploadedBy: input.uploadedBy,
      uploadedAt: now,
      updatedAt: now,
      metadata: {
        etag,
        cacheControl,
        productionProvider: true,
      },
    };
  }

  async delete(storagePath: string): Promise<boolean> {
    this.assertConfigured();
    const response = await this.signedFetch("DELETE", storagePath);
    if (response.status === 404) return false;
    if (!response.ok && response.status !== 204) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "delete"));
    return true;
  }

  async copyFile(sourcePath: string, destinationPath: string, options: { accessLevel?: string; assetType?: string; mimeType?: string; metadata?: Record<string, unknown> } = {}): Promise<{ etag?: string; publicUrl?: string; metadata?: Record<string, unknown> }> {
    this.assertConfigured();
    const accessLevel = options.accessLevel ?? (isPublicStoragePath(destinationPath, mediaBackendConfig.publicPrefix) ? "public" : "admin_only");
    const response = await this.signedFetch("PUT", destinationPath, {
      copySource: `/${mediaBackendConfig.bucket}/${sourcePath.replace(/^\/+/, "")}`,
      contentType: options.mimeType,
      cacheControl: this.getCacheControl(accessLevel, options.assetType ?? "asset"),
      metadata: {
        ...(options.metadata ?? {}),
        copiedFromPath: sourcePath,
        accessLevel,
      },
    });
    if (!response.ok) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "copy"));
    const text = await response.text().catch(() => "");
    const etag = /<ETag>"?([^"<]+)"?<\/ETag>/i.exec(text)?.[1] ?? response.headers.get("etag")?.replace(/"/g, "") ?? undefined;
    return {
      etag,
      publicUrl: accessLevel === "public" ? this.getPublicUrl(destinationPath) : undefined,
      metadata: { copiedFromPath: sourcePath },
    };
  }

  async fileExists(storagePath: string) {
    this.assertConfigured();
    const response = await this.signedFetch("HEAD", storagePath);
    if (response.status === 404) return { exists: false, storagePath, provider: this.getProviderName() };
    if (!response.ok) throw new StorageProviderError(normalizeStorageProviderError(`${response.status}`, this.getProviderName(), "head"));
    return {
      exists: true,
      storagePath,
      provider: this.getProviderName(),
      metadata: {
        etag: response.headers.get("etag")?.replace(/"/g, "") ?? null,
        contentLength: response.headers.get("content-length") ?? null,
        contentType: response.headers.get("content-type") ?? null,
      },
    };
  }

  async getObjectMetadata(storagePath: string): Promise<Record<string, unknown> | undefined> {
    const result = await this.fileExists(storagePath);
    return result.exists ? result.metadata : undefined;
  }

  async getSignedUrl(storageObject: MediaStorageObject, expirationSeconds: number, purpose: string): Promise<string | undefined> {
    this.assertConfigured();
    return this.createPresignedUrl("GET", storageObject.storagePath, Math.min(expirationSeconds, mediaBackendConfig.maxSignedUrlExpirationSeconds), {
      "response-content-disposition": purpose === "download" ? `attachment; filename="${storageObject.fileName}"` : "inline",
    });
  }

  getPublicUrl(storagePath: string): string | undefined {
    if (!isPublicStoragePath(storagePath, mediaBackendConfig.publicPrefix)) return undefined;
    const base = mediaBackendConfig.cdnEnabled && mediaBackendConfig.cdnBaseUrl
      ? mediaBackendConfig.cdnBaseUrl
      : mediaBackendConfig.publicBaseUrl;
    return base ? joinBaseUrlAndPath(base, storagePath) : undefined;
  }

  async getHealthStatus() {
    const configured = this.isConfigured();
    if (!configured) {
      return {
        provider: this.getProviderName(),
        configured,
        available: false,
        bucketConfigured: Boolean(mediaBackendConfig.bucket),
        publicUrlConfigured: Boolean(mediaBackendConfig.publicBaseUrl || mediaBackendConfig.cdnBaseUrl),
        signedUrlsSupported: true,
        deleteSupported: true,
        copySupported: true,
        multipartSupported: true,
        message: "Production storage provider is not fully configured.",
        checkedAt: new Date().toISOString(),
      };
    }
    try {
      const response = await this.signedFetch("HEAD", "");
      return {
        provider: this.getProviderName(),
        configured: true,
        available: response.ok || response.status === 403,
        bucketConfigured: Boolean(mediaBackendConfig.bucket),
        publicUrlConfigured: Boolean(mediaBackendConfig.publicBaseUrl || mediaBackendConfig.cdnBaseUrl),
        signedUrlsSupported: true,
        deleteSupported: true,
        copySupported: true,
        multipartSupported: true,
        message: response.ok || response.status === 403 ? "Production storage provider is reachable." : "Production storage health check returned a non-ready status.",
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        provider: this.getProviderName(),
        configured: true,
        available: false,
        bucketConfigured: Boolean(mediaBackendConfig.bucket),
        publicUrlConfigured: Boolean(mediaBackendConfig.publicBaseUrl || mediaBackendConfig.cdnBaseUrl),
        signedUrlsSupported: true,
        deleteSupported: true,
        copySupported: true,
        multipartSupported: true,
        message: "Production storage provider is unavailable.",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private async signedFetch(method: string, storagePath: string, options: {
    body?: Buffer;
    contentType?: string;
    contentLength?: number;
    checksum?: string;
    cacheControl?: string;
    metadata?: Record<string, unknown>;
    copySource?: string;
    query?: Record<string, string>;
  } = {}): Promise<Response> {
    const url = this.objectUrl(storagePath);
    Object.entries(options.query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const headers = this.signedHeaders(method, url, storagePath, options);
    return fetch(url, { method, headers, body: options.body });
  }

  private signedHeaders(method: string, url: URL, storagePath: string, options: {
    body?: Buffer;
    contentType?: string;
    contentLength?: number;
    checksum?: string;
    cacheControl?: string;
    metadata?: Record<string, unknown>;
    copySource?: string;
    query?: Record<string, string>;
  }): Headers {
    const now = amzDate();
    const date = shortDate(now);
    // Header-authenticated S3 requests need the real empty-payload digest.
    // UNSIGNED-PAYLOAD is reserved for the presigned URL flow below.
    const payloadHash = sha256Hex(options.body ?? Buffer.alloc(0));
    const host = url.host;
    const baseHeaders: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": now,
    };
    if (options.contentType) baseHeaders["content-type"] = options.contentType;
    if (options.contentLength !== undefined) baseHeaders["content-length"] = String(options.contentLength);
    if (options.cacheControl) baseHeaders["cache-control"] = options.cacheControl;
    if (options.copySource) baseHeaders["x-amz-copy-source"] = options.copySource.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    if (options.checksum) baseHeaders["x-amz-meta-checksum-sha256"] = options.checksum;
    Object.entries(options.metadata ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === null || typeof value === "object") return;
      baseHeaders[`x-amz-meta-${key.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`] = cleanMetadataValue(value);
    });
    const canonicalHeaders = Object.entries(baseHeaders)
      .sort(([a], [b]) => lexicalCompare(a, b))
      .map(([key, value]) => `${key}:${value.trim()}\n`)
      .join("");
    const signedHeaders = Object.keys(baseHeaders).sort().join(";");
    const canonicalRequest = [
      method,
      url.pathname || "/",
      this.canonicalQuery(url),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const scope = `${date}/${mediaBackendConfig.region}/${this.service}/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", now, scope, sha256Hex(canonicalRequest)].join("\n");
    const signature = hmacHex(getSigningKey(mediaBackendConfig.secretAccessKey as string, date, mediaBackendConfig.region, this.service), stringToSign);
    const headers = new Headers(baseHeaders);
    headers.set("Authorization", `AWS4-HMAC-SHA256 Credential=${mediaBackendConfig.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`);
    return headers;
  }

  private createPresignedUrl(method: string, storagePath: string, expirationSeconds: number, responseParams: Record<string, string> = {}): string {
    const now = amzDate();
    const date = shortDate(now);
    const url = this.objectUrl(storagePath);
    const scope = `${date}/${mediaBackendConfig.region}/${this.service}/aws4_request`;
    url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
    url.searchParams.set("X-Amz-Credential", `${mediaBackendConfig.accessKeyId}/${scope}`);
    url.searchParams.set("X-Amz-Date", now);
    url.searchParams.set("X-Amz-Expires", String(expirationSeconds));
    url.searchParams.set("X-Amz-SignedHeaders", "host");
    Object.entries(responseParams).forEach(([key, value]) => url.searchParams.set(key, value));
    const canonicalRequest = [method, url.pathname || "/", this.canonicalQuery(url), `host:${url.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", now, scope, sha256Hex(canonicalRequest)].join("\n");
    const signature = hmacHex(getSigningKey(mediaBackendConfig.secretAccessKey as string, date, mediaBackendConfig.region, this.service), stringToSign);
    url.searchParams.set("X-Amz-Signature", signature);
    return url.toString();
  }

  private canonicalQuery(url: URL): string {
    return [...url.searchParams.entries()]
      .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => lexicalCompare(leftKey, rightKey) || lexicalCompare(leftValue, rightValue))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  }

  private objectUrl(storagePath: string): URL {
    const endpoint = mediaBackendConfig.endpoint as string;
    const cleanPath = storagePath.replace(/^\/+/, "");
    if (mediaBackendConfig.forcePathStyle) {
      return new URL(`${endpoint.replace(/\/+$/, "")}/${mediaBackendConfig.bucket}/${encodePath(cleanPath)}`);
    }
    const base = new URL(endpoint);
    return new URL(`${base.protocol}//${mediaBackendConfig.bucket}.${base.host}/${encodePath(cleanPath)}`);
  }

  private getCacheControl(accessLevel: string, assetType: string): string {
    if (accessLevel !== "public") return "private, no-store";
    if (assetType === "audio_preview") return "public, max-age=86400";
    return "public, max-age=31536000, immutable";
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new StorageProviderError({
        code: "STORAGE_PROVIDER_NOT_CONFIGURED",
        message: "Production storage provider is not configured.",
        retryable: false,
        provider: this.getProviderName(),
        stage: "config",
      });
    }
  }
}
