import type { IncomingMessage, ServerResponse } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";

export const parseCookies = (request: IncomingMessage): Record<string, string> => {
  const raw = request.headers.cookie ?? "";
  return Object.fromEntries(raw.split(";").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [decodeURIComponent(key), decodeURIComponent(rest.join("="))];
  }).filter(([key]) => key));
};

export const getSessionCookie = (request: IncomingMessage): string | undefined =>
  parseCookies(request)[getBackendConfig().auth.cookieName];

export const buildSessionCookie = (token: string, expiresAt: string): string => {
  const config = getBackendConfig();
  const parts = [
    `${encodeURIComponent(config.auth.cookieName)}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${config.auth.cookieSameSite}`,
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (config.auth.cookieSecure) parts.push("Secure");
  if (config.auth.cookieDomain) parts.push(`Domain=${config.auth.cookieDomain}`);
  return parts.join("; ");
};

export const buildClearSessionCookie = (): string => {
  const config = getBackendConfig();
  const parts = [
    `${encodeURIComponent(config.auth.cookieName)}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${config.auth.cookieSameSite}`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (config.auth.cookieSecure) parts.push("Secure");
  if (config.auth.cookieDomain) parts.push(`Domain=${config.auth.cookieDomain}`);
  return parts.join("; ");
};

export const setCookie = (response: ServerResponse, cookie: string) => {
  response.setHeader("Set-Cookie", cookie);
};
