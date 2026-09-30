import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";

export const hashSecret = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

export const createOpaqueToken = (bytes = 32): string => crypto.randomBytes(bytes).toString("base64url");

export const hashRequestIp = (request: IncomingMessage): string | undefined => {
  const value = request.headers["x-forwarded-for"] ?? request.socket.remoteAddress;
  const ip = Array.isArray(value) ? value[0] : value?.split(",")[0]?.trim();
  return ip ? hashSecret(ip) : undefined;
};

export const hashUserAgent = (request: IncomingMessage): string | undefined => {
  const value = request.headers["user-agent"];
  return typeof value === "string" ? hashSecret(value) : undefined;
};

export const getDeviceLabel = (request: IncomingMessage): string => {
  const ua = request.headers["user-agent"] ?? "";
  if (typeof ua !== "string") return "Unknown Browser";
  const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Safari") ? "Safari" : ua.includes("Firefox") ? "Firefox" : "Unknown Browser";
  const os = ua.includes("Mac OS") ? "macOS" : ua.includes("iPhone") ? "iPhone" : ua.includes("Windows") ? "Windows" : ua.includes("Android") ? "Android" : "Unknown OS";
  return `${browser} on ${os}`;
};
