import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { jsonDatabase } from "../media/JsonDatabase";
import { hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { memberIdentityService } from "../members/MemberIdentityService";
import { resolveInsideRoot } from "../../utils/media/mediaPathUtils";

interface RangeResult {
  start: number;
  end: number;
  status: 200 | 206;
}

const parseReference = (reference: string) => {
  const [authorizationId, token] = decodeURIComponent(reference).split(".");
  return authorizationId && token ? { authorizationId, token } : undefined;
};

const parseRange = (header: string | undefined, size: number): RangeResult | "invalid" => {
  if (!header) return { start: 0, end: size - 1, status: 200 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";
  if (match[1] === "" && match[2] === "") return "invalid";
  let start = match[1] ? Number(match[1]) : size - Number(match[2]);
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return "invalid";
  end = Math.min(end, size - 1);
  return { start, end, status: 206 };
};

export class ProtectedMediaGatewayService {
  async stream(request: IncomingMessage, response: ServerResponse, reference: string) {
    const validation = await this.validateReference(request, reference, "stream");
    if (!validation.ok) {
      this.safeDenied(response, validation.status, validation.code);
      return;
    }
    const absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, validation.storage.storagePath);
    const stat = await fsp.stat(absolutePath).catch(() => undefined);
    if (!stat?.isFile()) {
      this.safeDenied(response, 404, "PROTECTED_MEDIA_NOT_READY");
      return;
    }
    const range = parseRange(Array.isArray(request.headers.range) ? request.headers.range[0] : request.headers.range, stat.size);
    if (range === "invalid") {
      response.writeHead(416, {
        "Cache-Control": "private, no-store",
        "Content-Range": `bytes */${stat.size}`,
        "X-Content-Type-Options": "nosniff",
      });
      response.end();
      return;
    }
    await this.markUse(validation.authorization.authorizationId, false);
    const headers: Record<string, string | number> = {
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Type": validation.storage.mimeType,
      "Content-Length": range.end - range.start + 1,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    };
    if (range.status === 206) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${stat.size}`;
    response.writeHead(range.status, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = fs.createReadStream(absolutePath, { start: range.start, end: range.end });
    request.on("close", () => stream.destroy());
    stream.pipe(response);
  }

  async download(request: IncomingMessage, response: ServerResponse, reference: string) {
    const validation = await this.validateReference(request, reference, "download");
    if (!validation.ok) {
      this.safeDenied(response, validation.status, validation.code);
      return;
    }
    if (validation.authorization.maxUses && validation.authorization.useCount >= validation.authorization.maxUses) {
      this.safeDenied(response, 403, "PROTECTED_DOWNLOAD_AUTHORIZATION_USED");
      return;
    }
    const absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, validation.storage.storagePath);
    const stat = await fsp.stat(absolutePath).catch(() => undefined);
    if (!stat?.isFile()) {
      this.safeDenied(response, 404, "PROTECTED_MEDIA_NOT_READY");
      return;
    }
    await this.markUse(validation.authorization.authorizationId, true);
    response.writeHead(200, {
      "Cache-Control": "private, no-store",
      "Content-Type": validation.storage.mimeType,
      "Content-Length": stat.size,
      "Content-Disposition": `attachment; filename="${path.basename(validation.storage.fileName).replace(/["\r\n]/g, "_")}"`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = fs.createReadStream(absolutePath);
    request.on("close", () => stream.destroy());
    stream.pipe(response);
  }

  async validateReference(request: IncomingMessage, reference: string, action: "stream" | "download") {
    const parsed = parseReference(reference);
    if (!parsed) return { ok: false as const, status: 403, code: "PROTECTED_STREAM_SESSION_INVALID" };
    const session = await memberIdentityService.authenticateRequest(request).catch(() => undefined);
    if (!session) return { ok: false as const, status: 401, code: "PROTECTED_CONTENT_AUTHENTICATION_REQUIRED" };
    const data = await jsonDatabase.read();
    const authorization = data.protectedMediaAuthorizations.find((item) => item.authorizationId === parsed.authorizationId && item.action === action);
    if (!authorization) return { ok: false as const, status: 404, code: "PROTECTED_CONTENT_UNAVAILABLE" };
    if (authorization.status === "revoked") return { ok: false as const, status: 403, code: "PROTECTED_STREAM_AUTHORIZATION_REVOKED" };
    if (authorization.status === "used" && action === "download") return { ok: false as const, status: 403, code: "PROTECTED_DOWNLOAD_AUTHORIZATION_USED" };
    if (authorization.status !== "active") return { ok: false as const, status: 403, code: "PROTECTED_STREAM_AUTHORIZATION_REVOKED" };
    if (authorization.expiresAt <= new Date().toISOString()) return { ok: false as const, status: 403, code: "PROTECTED_STREAM_AUTHORIZATION_EXPIRED" };
    if (authorization.memberId !== session.member.memberId) return { ok: false as const, status: 403, code: "PROTECTED_MEDIA_WRONG_MEMBER" };
    if (authorization.sessionIdHash && authorization.sessionIdHash !== hashSecret(session.sessionId)) return { ok: false as const, status: 403, code: "PROTECTED_MEDIA_WRONG_SESSION" };
    if (authorization.authorizationTokenHash !== hashSecret(parsed.token)) return { ok: false as const, status: 403, code: "PROTECTED_MEDIA_TOKEN_TAMPERING" };
    const storageObjectId = String(authorization.metadata?.storageObjectId ?? "");
    const storage = data.mediaStorageObjects.find((item) => item.storageObjectId === storageObjectId || item.assetId === authorization.mediaId);
    if (!storage || storage.accessLevel === "public") return { ok: false as const, status: 404, code: "PROTECTED_MEDIA_NOT_READY" };
    return { ok: true as const, authorization, storage, session };
  }

  private async markUse(authorizationId: string, terminal: boolean) {
    await jsonDatabase.update((data) => {
      const authorization = data.protectedMediaAuthorizations.find((item) => item.authorizationId === authorizationId);
      if (!authorization) return;
      authorization.useCount += 1;
      authorization.lastUsedAt = new Date().toISOString();
      if (terminal) authorization.status = "used";
    });
  }

  private safeDenied(response: ServerResponse, status: number, code: string) {
    response.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(JSON.stringify({ success: false, errors: ["Protected content is unavailable."], code }));
  }
}

export const protectedMediaGatewayService = new ProtectedMediaGatewayService();
