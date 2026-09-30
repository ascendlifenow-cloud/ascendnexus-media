import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../middleware/mediaErrorMiddleware";
import type { PublicApiResponse } from "../../models/public/PublicApiResponseModel";
import { publicResponseSafetyService } from "../../services/public/PublicResponseSafetyService";
import { createPublicError } from "./publicErrorUtils";

const stableForEtag = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableForEtag);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !["generatedAt", "checkedAt"].includes(key))
    .map(([key, child]) => [key, stableForEtag(child)]));
};

export const buildPublicEtag = (payload: unknown): string =>
  `"${crypto.createHash("sha1").update(JSON.stringify(stableForEtag(payload))).digest("hex")}"`;

export const sendPublicResponse = <T>(
  request: IncomingMessage,
  response: ServerResponse,
  payload: PublicApiResponse<T>,
  options: { cacheControl?: string; lastModified?: string } = {},
) => {
  const endpoint = request.url?.split("?")[0] ?? "public";
  const safety = publicResponseSafetyService.scanResponse(payload, { endpoint });
  if (!safety.safe) {
    throw createPublicError("PUBLIC_RESPONSE_SAFETY_VIOLATION", "Public response failed safety validation.", 500);
  }
  const etag = buildPublicEtag(payload);
  response.setHeader("ETag", etag);
  response.setHeader("Cache-Control", options.cacheControl ?? "public, max-age=60, stale-while-revalidate=300");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Public-Cache", String(payload.meta?.cacheStatus ?? payload.meta?.cache?.status ?? "bypass"));
  if (options.lastModified) response.setHeader("Last-Modified", options.lastModified);
  const ifModifiedSince = request.headers["if-modified-since"];
  if (request.headers["if-none-match"] === etag || (options.lastModified && typeof ifModifiedSince === "string" && new Date(ifModifiedSince).getTime() >= new Date(options.lastModified).getTime())) {
    response.statusCode = 304;
    response.end();
    return;
  }
  sendJson(response, 200, payload, {
    "Cache-Control": options.cacheControl ?? "public, max-age=60, stale-while-revalidate=300",
    "ETag": etag,
    ...(options.lastModified ? { "Last-Modified": options.lastModified } : {}),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Public-Cache": String(payload.meta?.cacheStatus ?? payload.meta?.cache?.status ?? "bypass"),
    "Access-Control-Allow-Credentials": "false",
  });
};

export const publicSuccess = <T>(data: T, meta?: PublicApiResponse<T>["meta"], warnings?: string[]): PublicApiResponse<T> => ({
  success: true,
  data,
  meta: { generatedAt: new Date().toISOString(), version: "public-v1", ...(meta ?? {}) },
  warnings,
});
