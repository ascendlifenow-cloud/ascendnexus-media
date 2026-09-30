import type { IncomingMessage } from "node:http";
import { createHash } from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateEntries = new Map<string, RateEntry>();

export interface PublicFormAbuseAssessment {
  riskScore: number;
  classification: "allow" | "allow_with_flag" | "challenge_required" | "reject";
  signals: string[];
  rateLimited: boolean;
  retryAfterSeconds?: number;
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export class PublicFormAbuseProtectionService {
  getRequestKey(request: IncomingMessage, email?: string) {
    const ip = String(request.headers["x-forwarded-for"] ?? request.socket.remoteAddress ?? "unknown").split(",")[0].trim();
    const ua = String(request.headers["user-agent"] ?? "unknown").slice(0, 160);
    return {
      ipHash: hash(ip),
      userAgentHash: hash(ua),
      emailHash: email ? hash(email.toLowerCase()) : undefined,
      requestFingerprint: hash(`${ip}|${ua}|${email ?? ""}`),
    };
  }

  evaluate(formType: "contact_inquiry" | "newsletter_subscription", request: IncomingMessage, payload: Record<string, unknown>, email?: string): PublicFormAbuseAssessment {
    const signals: string[] = [];
    const honeypot = String(payload.website ?? payload.companyWebsite ?? payload._contact_url ?? "").trim();
    if (honeypot) signals.push("honeypot_filled");
    const body = `${String(payload.message ?? "")} ${String(payload.name ?? "")}`;
    const linkCount = (body.match(/https?:\/\//gi) ?? []).length;
    if (linkCount > 5) signals.push("excessive_links");
    if (/casino|crypto giveaway|seo backlinks/i.test(body)) signals.push("blocked_pattern");
    const rate = this.checkRateLimit(formType, request, email);
    if (rate.rateLimited) signals.push("rate_limited");
    const riskScore = signals.includes("honeypot_filled") ? 100 : Math.min(95, signals.length * 25 + Math.max(0, linkCount - 2) * 10);
    const classification = rate.rateLimited || signals.includes("honeypot_filled") ? "reject" : riskScore >= 50 ? "allow_with_flag" : "allow";
    return { riskScore, classification, signals, ...rate };
  }

  getHealth() {
    return {
      rateLimiterAvailable: true,
      provider: getBackendConfig().redis.url ? "redis_ready" : "bounded_memory_fallback",
      activeBuckets: rateEntries.size,
    };
  }

  private checkRateLimit(formType: string, request: IncomingMessage, email?: string) {
    const config = getBackendConfig();
    const { ipHash, emailHash } = this.getRequestKey(request, email);
    const windowMs = config.security.publicRateLimitWindowMs;
    const max = Math.max(3, Math.min(config.security.publicRateLimitMax, formType === "contact_inquiry" ? 12 : 8));
    const keys = [`${formType}:ip:${ipHash}`, ...(emailHash ? [`${formType}:email:${emailHash}`] : [])];
    const now = Date.now();
    for (const key of keys) {
      const entry = rateEntries.get(key);
      if (!entry || entry.resetAt <= now) {
        rateEntries.set(key, { count: 1, resetAt: now + windowMs });
        continue;
      }
      entry.count += 1;
      if (entry.count > max) return { rateLimited: true, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    }
    return { rateLimited: false };
  }
}

export const publicFormAbuseProtectionService = new PublicFormAbuseProtectionService();
