import { createHash } from "node:crypto";

const idempotencyResults = new Map<string, { expiresAt: number; result: unknown }>();

const stableStringify = (value: unknown): string => {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
};

const hash = (value: unknown) => createHash("sha256").update(stableStringify(value)).digest("hex");

export class PublicFormIdempotencyService {
  buildContactKey(payload: Record<string, unknown>, requestFingerprint: string, token?: string) {
    return `contact:${token || hash({ requestFingerprint, email: payload.email, name: payload.name, subject: payload.subject, message: payload.message })}`;
  }

  buildNewsletterKey(payload: Record<string, unknown>, requestFingerprint: string, token?: string) {
    return `newsletter:${token || hash({ requestFingerprint, email: payload.email, preferences: payload.preferences })}`;
  }

  findExistingResult<T>(key: string): T | undefined {
    const existing = idempotencyResults.get(key);
    if (!existing) return undefined;
    if (existing.expiresAt < Date.now()) {
      idempotencyResults.delete(key);
      return undefined;
    }
    return existing.result as T;
  }

  storeResult(key: string, result: unknown, ttlMs = 10 * 60 * 1000) {
    idempotencyResults.set(key, { result, expiresAt: Date.now() + ttlMs });
  }

  buildFingerprint(payload: Record<string, unknown>) {
    return hash(payload);
  }
}

export const publicFormIdempotencyService = new PublicFormIdempotencyService();
