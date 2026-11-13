import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { jsonDatabase } from "../media/JsonDatabase";
import { hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { memberIdentityService } from "../members/MemberIdentityService";
import { resolveInsideRoot } from "../../utils/media/mediaPathUtils";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { evaluateSongAction, recordSongDelivery, songMediaMatches } from "../access/SongUsageService";
import { protectedDeliveryTelemetryService, type DeliveryStage } from "./ProtectedDeliveryTelemetryService";
import { readProtectedStorageErrorCode } from "./ProtectedStorageErrorDiagnostics";
import { buildCorsHeaders } from "../../utils/security/securityHeaderUtils";

type Action = "stream" | "download";
type Data = Awaited<ReturnType<typeof jsonDatabase.read>>;
type Session = Awaited<ReturnType<typeof memberIdentityService.authenticateRequest>>;
type Reference = { authorizationId: string; token: string };
interface RangeResult { start: number; end: number; status: 200 | 206 }

const parseReference = (reference: string): Reference | undefined => {
  try {
    const parts = decodeURIComponent(reference).split(".");
    return parts.length === 2 && parts.every(Boolean) ? { authorizationId: parts[0], token: parts[1] } : undefined;
  } catch { return undefined; }
};

const parseRange = (header: string | undefined, size: number): RangeResult | "invalid" => {
  if (!header) return { start: 0, end: size - 1, status: 200 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return "invalid";
  const first = Number(match[1]);
  const last = Number(match[2]);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return "invalid";
  const start = match[1] ? first : Math.max(0, size - last);
  const end = match[1] && match[2] ? Math.min(last, size - 1) : size - 1;
  if ((!match[1] && last === 0) || start >= size || end < start) return "invalid";
  return { start, end, status: 206 };
};

const denied = (code = "PROTECTED_CONTENT_UNAVAILABLE", status = 403) => new AuthApiError(code as ConstructorParameters<typeof AuthApiError>[0], "Protected content is unavailable.", status);
// Serialize gateway commits in this process; database-wide concurrency remains the persistence layer's responsibility.
let usageQueue: Promise<unknown> = Promise.resolve();

export class ProtectedMediaGatewayService {
  constructor(private readonly requestTimeoutMs = 120_000) {}

  async refresh(request: IncomingMessage, reference: string) {
    const parsed = parseReference(reference);
    if (!parsed) throw denied("PROTECTED_STREAM_SESSION_INVALID");
    const session = await memberIdentityService.authenticateRequest(request);
    let expiresAt = "";
    const commit = usageQueue.then(() => jsonDatabase.update((data) => {
      const validated = this.check(data, session, parsed, "stream").authorization;
      const profile = data.mediaDeliveryProfiles.find((item) => item.profileKey === validated.metadata?.profileKey)!;
      if (Date.parse(validated.expiresAt) - Date.now() > 60000) { expiresAt = validated.expiresAt; return; }
      const origin = Date.parse(String(validated.metadata?.episodeStartedAt ?? validated.issuedAt));
      const now = Date.now();
      const expires = Math.min(now + Math.min(profile.tokenTtlSeconds, 900) * 1000, origin + 3600000);
      if (!Number.isFinite(origin) || expires <= now + 1000) throw denied("PROTECTED_STREAM_AUTHORIZATION_EXPIRED");
      const authorizations = structuredClone(data.protectedMediaAuthorizations);
      const playbacks = structuredClone(data.protectedPlaybackSessions);
      const authorization = authorizations.find(item => item.authorizationId === validated.authorizationId)!;
      authorization.metadata = { ...authorization.metadata, episodeStartedAt: new Date(origin).toISOString() };
      authorization.issuedAt = new Date(now).toISOString();
      authorization.expiresAt = new Date(expires).toISOString();
      for (const playback of playbacks) if (playback.authorizationId === authorization.authorizationId && ["authorized", "starting", "playing", "paused"].includes(playback.status)) playback.expiresAt = authorization.expiresAt;
      expiresAt = authorization.expiresAt;
      data.protectedMediaAuthorizations = authorizations;
      data.protectedPlaybackSessions = playbacks;
    }));
    usageQueue = commit.catch(() => undefined);
    await commit;
    return { expiresAt };
  }

  async stream(request: IncomingMessage, response: ServerResponse, reference: string) {
    await this.deliver(request, response, reference, "stream");
  }

  async download(request: IncomingMessage, response: ServerResponse, reference: string) {
    await this.deliver(request, response, reference, "download");
  }

  private check(data: Data, session: Session, parsed: Reference, action: Action) {
    const authorization = data.protectedMediaAuthorizations.find((item) => item.authorizationId === parsed.authorizationId && item.action === action);
    if (!authorization) throw denied("PROTECTED_CONTENT_UNAVAILABLE", 404);
    const member = data.memberAccounts.find((item) => item.memberId === session.member.memberId);
    const liveSession = data.memberSessions.find((item) => item.sessionId === session.sessionId && item.memberId === session.member.memberId);
    if (!member || member.status !== "Active" || !member.emailVerified || !liveSession || liveSession.status !== "active" ||
      !(Date.parse(liveSession.expiresAt) > Date.now()) || !(Date.parse(liveSession.absoluteExpiresAt) > Date.now())) throw denied("PROTECTED_CONTENT_AUTHENTICATION_REQUIRED", 401);
    const version = typeof member.metadata?.authorizationVersion === "number" ? member.metadata.authorizationVersion : 1;
    if (authorization.authorizationVersion !== (session.member.authorizationVersion ?? 1) || authorization.authorizationVersion !== version) throw denied("PROTECTED_STREAM_AUTHORIZATION_REVOKED");
    if (authorization.memberId !== member.memberId) throw denied("PROTECTED_MEDIA_WRONG_MEMBER");
    if (!authorization.sessionIdHash || authorization.sessionIdHash !== hashSecret(session.sessionId)) throw denied("PROTECTED_MEDIA_WRONG_SESSION");
    if (!authorization.authorizationTokenHash || authorization.authorizationTokenHash !== hashSecret(parsed.token)) throw denied("PROTECTED_MEDIA_TOKEN_TAMPERING");
    if (authorization.status !== "active") throw denied(action === "download" && authorization.status === "used" ? "PROTECTED_DOWNLOAD_AUTHORIZATION_USED" : "PROTECTED_STREAM_AUTHORIZATION_REVOKED");
    if (!(Date.parse(authorization.expiresAt) > Date.now())) throw denied("PROTECTED_STREAM_AUTHORIZATION_EXPIRED");
    const profileKey = authorization.metadata?.profileKey;
    const profiles = typeof profileKey === "string" && profileKey.length > 0
      ? data.mediaDeliveryProfiles.filter((item) => item.profileKey === profileKey) : [];
    const profile = profiles.length === 1 ? profiles[0] : undefined;
    const issuedAt = Date.parse(authorization.issuedAt);
    const expiresAt = Date.parse(authorization.expiresAt);
    if (!profile || profile.status !== "active" || profile.deliveryMode !== "protected_gateway" || !Array.isArray(profile.allowedActions) || !profile.allowedActions.includes(action) ||
      profile.publicCacheAllowed !== false || (action === "download" && profile.downloadAllowed !== true) ||
      !Number.isSafeInteger(profile.tokenTtlSeconds) || profile.tokenTtlSeconds <= 0 ||
      !Number.isFinite(issuedAt) || issuedAt > Date.now() || expiresAt <= issuedAt ||
      expiresAt - issuedAt > profile.tokenTtlSeconds * 1000) throw denied("PROTECTED_STREAM_AUTHORIZATION_REVOKED");
    if (!Number.isSafeInteger(authorization.useCount) || authorization.useCount < 0) throw denied();
    // A stream authorization represents one delivery, even when the player requests multiple ranges.
    if ((action === "download" || authorization.useCount === 0) && authorization.maxUses != null &&
      (!Number.isSafeInteger(authorization.maxUses) || authorization.useCount >= authorization.maxUses)) throw denied("PROTECTED_DOWNLOAD_AUTHORIZATION_USED");
    const resource = data.protectedMediaResources.find((item) => item.mediaAssetId === (authorization.mediaAssetId ?? authorization.mediaId) || item.protectedMediaResourceId === authorization.mediaId);
    if (!resource || resource.status !== "ready" || resource.contentType !== authorization.resourceType || resource.contentId !== authorization.resourceId) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
    const storageId = String(authorization.metadata?.storageObjectId ?? resource.privateObjectKey);
    const storage = data.mediaStorageObjects.find((item) => item.storageObjectId === storageId);
    const asset = data.mediaAssets.find((item) => item.assetId === resource.mediaAssetId);
    if (!storage || storage.publicUrl || !storage.mimeType.startsWith("audio/") || (storage.assetId ?? storage.storageObjectId) !== resource.mediaAssetId || !["private", "signed", "admin_only"].includes(storage.accessLevel) ||
      !["ready", "uploaded"].includes(storage.status) || !asset || !["draft", "published"].includes(asset.status) || asset.metadata?.deletedAt ||
      !Number.isSafeInteger(storage.fileSizeBytes) || storage.fileSizeBytes <= 0 ||
      data.protectedContentTakedowns.some((item) => item.resourceType === authorization.resourceType && item.resourceId === authorization.resourceId && item.status === "active")) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
    if (authorization.resourceType === "release") {
      if (!songMediaMatches(data, authorization.resourceId, resource.mediaAssetId, action)) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
      const decision = evaluateSongAction(data, member.memberId, authorization.resourceId, action, authorization.authorizationId);
      if (!decision.allowed) throw denied(decision.reasonCode);
    } else throw denied("PROTECTED_CONTENT_ACCESS_DENIED");
    return { authorization, storage, session };
  }

  async validateReference(request: IncomingMessage, reference: string, action: Action) {
    try {
      const parsed = parseReference(reference);
      if (!parsed) throw denied("PROTECTED_STREAM_SESSION_INVALID");
      const session = await memberIdentityService.authenticateRequest(request).catch(() => undefined);
      if (!session) throw denied("PROTECTED_CONTENT_AUTHENTICATION_REQUIRED", 401);
      return { ok: true as const, ...this.check(await jsonDatabase.read(), session, parsed, action) };
    } catch (error) {
      return { ok: false as const, status: error instanceof AuthApiError ? error.status : 503, code: error instanceof AuthApiError ? error.code : "PROTECTED_CONTENT_UNAVAILABLE" };
    }
  }

  private async deliver(request: IncomingMessage, response: ServerResponse, reference: string, action: Action) {
    for (const [key, value] of Object.entries(buildCorsHeaders(request))) response.setHeader(key, value);
    response.setHeader("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length");
    let source: Readable | undefined;
    let sourceFailed = false;
    let stage: DeliveryStage = "authorization";
    const observationId = protectedDeliveryTelemetryService.begin(action, request.method);
    let byteDeliveryCompleted = false;
    let failureStatus: number | undefined;
    let failureCode: string | undefined;
    let timedOut = false;
    let deliveryIntegrityFailed = false;
    let handle: Awaited<ReturnType<typeof fsp.open>> | undefined;
    const abort = new AbortController();
    const disconnect = () => { abort.abort(); source?.destroy(); };
    response.once("close", disconnect);
    request.once("aborted", disconnect);
    const timeout = setTimeout(() => {
      timedOut = true;
      disconnect();
      protectedDeliveryTelemetryService.finish(observationId, 504, false, "PROTECTED_DELIVERY_TIMEOUT");
      if (!response.destroyed) {
        if (!response.headersSent) this.safeDenied(response, 504, "PROTECTED_DELIVERY_TIMEOUT");
        else response.destroy();
      }
    }, this.requestTimeoutMs);
    try {
      if (request.method !== "GET" && request.method !== "HEAD") throw denied("PROTECTED_MEDIA_METHOD_NOT_ALLOWED", 405);
      const validation = await this.validateReference(request, reference, action);
      if (abort.signal.aborted || response.destroyed) return;
      if (!validation.ok) { this.safeDenied(response, validation.status, validation.code); return; }
      const provider = backendStorageProviderRegistry.getActiveProvider();
      if (provider.getProviderName() !== validation.storage.provider) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
      let size = validation.storage.fileSizeBytes;
      if (validation.storage.provider === "local") {
        handle = await fsp.open(resolveInsideRoot(mediaBackendConfig.uploadRoot, validation.storage.storagePath), "r");
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size !== size) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
        size = stat.size;
      }
      const range = parseRange(action === "stream" ? (Array.isArray(request.headers.range) ? request.headers.range.join(",") : request.headers.range) : undefined, size);
      if (range === "invalid") {
        response.writeHead(416, { "Cache-Control": "private, no-store", "Content-Range": `bytes */${size}`, "X-Content-Type-Options": "nosniff" });
        response.end(); return;
      }
      const length = Math.max(0, range.end - range.start + 1);
      if (request.method === "GET" && length > 0) {
        stage = "storage_read";
        protectedDeliveryTelemetryService.advance(observationId, stage);
        if (handle) {
          source = handle.createReadStream({ start: range.start, end: range.end, autoClose: false });
        } else {
          if (!["r2", "s3"].includes(validation.storage.provider)) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
          if (!provider.readObject) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
          const upstream = await provider.readObject(validation.storage, {
            signal: abort.signal, range: range.status === 206 ? `bytes=${range.start}-${range.end}` : undefined,
          });
          if (upstream.status !== range.status || !upstream.body || upstream.headers.get("content-length") !== String(length) ||
            (upstream.headers.get("content-encoding") && upstream.headers.get("content-encoding") !== "identity") ||
            (range.status === 206 ? upstream.headers.get("content-range") !== `bytes ${range.start}-${range.end}/${size}` : upstream.headers.has("content-range"))) {
            const upstreamErrorCode = upstream.status >= 400 ? await readProtectedStorageErrorCode(upstream, abort.signal) : "not_an_error_response";
            console.warn("[protected-delivery] upstream response rejected", { provider: validation.storage.provider, status: upstream.status, partial: range.status === 206,
              lengthMatches: upstream.headers.get("content-length") === String(length), rangeMatches: upstream.headers.get("content-range") === `bytes ${range.start}-${range.end}/${size}`,
              upstreamErrorCode, nodeVersion: process.version, regionIsAuto: mediaBackendConfig.region === "auto",
              forcePathStyle: mediaBackendConfig.forcePathStyle, bucketMatchesConfigured: validation.storage.bucket === mediaBackendConfig.bucket,
              r2ApiEndpoint: Boolean(mediaBackendConfig.endpoint && new URL(mediaBackendConfig.endpoint).hostname.endsWith(".r2.cloudflarestorage.com")),
              proxyEnvironmentPresent: ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"].some(key => Boolean(process.env[key])),
            });
            // Cleanup must not hold the denial open; finally also aborts the origin request.
            void upstream.body?.cancel().catch(() => undefined);
            throw denied("PROTECTED_MEDIA_NOT_READY", 502);
          }
          source = Readable.fromWeb(upstream.body as never);
        }
      }
      source?.on("error", () => { sourceFailed = true; });
      const parsed = parseReference(reference)!;
      // Reauthenticate after source opening, then recheck and account inside the same update, before headers or bytes.
      const session = await memberIdentityService.authenticateRequest(request);
      stage = "usage_commit";
      protectedDeliveryTelemetryService.advance(observationId, stage);
      const commit = usageQueue.then(() => jsonDatabase.update((data) => {
        if (sourceFailed) throw denied("PROTECTED_MEDIA_NOT_READY", 502);
        if (abort.signal.aborted || response.destroyed) throw denied();
        const current = this.check(data, session, parsed, action);
        if (JSON.stringify(current.storage) !== JSON.stringify(validation.storage)) throw denied("PROTECTED_MEDIA_NOT_READY", 404);
        if (request.method === "HEAD") return;
        if (action === "stream" && current.authorization.useCount > 0) return;
        // Local JSON updates expose their cache: isolate only the collections accounting mutates.
        const staged = { ...data, memberSongUsage: structuredClone(data.memberSongUsage),
          protectedMediaAuthorizations: structuredClone(data.protectedMediaAuthorizations), memberAccessHistory: structuredClone(data.memberAccessHistory) };
        const authorization = staged.protectedMediaAuthorizations.find(item => item.authorizationId === current.authorization.authorizationId)!;
        if (authorization.resourceType === "release") recordSongDelivery(staged, authorization, action);
        authorization.useCount += 1;
        authorization.lastUsedAt = new Date().toISOString();
        if (action === "download") authorization.status = "used";
        data.memberSongUsage = staged.memberSongUsage;
        data.protectedMediaAuthorizations = staged.protectedMediaAuthorizations;
        data.memberAccessHistory = staged.memberAccessHistory;
      }));
      usageQueue = commit.catch(() => undefined);
      await commit;
      if (abort.signal.aborted || response.destroyed) return;
      const headers: Record<string, string | number> = {
        "Cache-Control": "private, no-store", "Content-Type": validation.storage.mimeType,
        "Content-Length": length, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
      };
      if (action === "stream") headers["Accept-Ranges"] = "bytes";
      if (range.status === 206) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
      if (action === "download") headers["Content-Disposition"] = `attachment; filename="${path.basename(validation.storage.fileName).replace(/[^\x20-\x7e]|["\\]/g, "_")}"`;
      response.writeHead(range.status, headers);
      if (!source || request.method === "HEAD") { response.end(); return; }
      let delivered = 0;
      const bounded = new Transform({ transform(chunk, _encoding, callback) {
        delivered += chunk.length;
        if (delivered > length) deliveryIntegrityFailed = true;
        callback(deliveryIntegrityFailed ? denied("PROTECTED_MEDIA_NOT_READY", 502) : null, deliveryIntegrityFailed ? undefined : chunk);
      }, flush(callback) {
        if (delivered !== length) deliveryIntegrityFailed = true;
        callback(deliveryIntegrityFailed ? denied("PROTECTED_MEDIA_NOT_READY", 502) : null);
      } });
      stage = "byte_delivery";
      protectedDeliveryTelemetryService.advance(observationId, stage);
      await pipeline(source, bounded, response);
      byteDeliveryCompleted = true;
    } catch (error) {
      failureStatus = timedOut ? 504 : deliveryIntegrityFailed || sourceFailed ? 502 : request.aborted || (abort.signal.aborted && response.destroyed) ? 499 : error instanceof AuthApiError ? error.status : 503;
      failureCode = timedOut ? "PROTECTED_DELIVERY_TIMEOUT" : deliveryIntegrityFailed || sourceFailed ? "PROTECTED_MEDIA_NOT_READY" : error instanceof AuthApiError ? error.code : "PROTECTED_CONTENT_UNAVAILABLE";
      if (!request.aborted) console.warn("[protected-delivery] request failed", { stage, action, status: failureStatus, code: failureCode });
      if (!response.destroyed) this.safeDenied(response, failureStatus, failureCode);
    } finally {
      const finalStatus = timedOut ? 504 : failureStatus ?? (!byteDeliveryCompleted && abort.signal.aborted && response.destroyed && response.statusCode < 400 && request.method === "GET" ? 499 : response.statusCode);
      protectedDeliveryTelemetryService.finish(observationId, finalStatus, byteDeliveryCompleted, timedOut ? "PROTECTED_DELIVERY_TIMEOUT" : failureCode);
      clearTimeout(timeout);
      abort.abort();
      source?.destroy();
      await handle?.close().catch(() => undefined);
      response.off("close", disconnect);
      request.off("aborted", disconnect);
    }
  }

  private safeDenied(response: ServerResponse, status: number, code: string) {
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    response.end(JSON.stringify({ success: false, errors: ["Protected content is unavailable."], code }));
  }
}

export const protectedMediaGatewayService = new ProtectedMediaGatewayService();
