import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { PublicActionTokenRecord } from "../../models/forms/PublicActionTokenModel";
import { publicActionTokenRepository } from "../../repositories/PublicActionTokenRepository";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export class PublicFormTokenService {
  async createToken(tokenType: PublicActionTokenRecord["tokenType"], relatedEntityId: string, ttlMs: number) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const now = new Date().toISOString();
    const record: PublicActionTokenRecord = {
      publicActionTokenId: `pact_${randomUUID()}`,
      tokenType,
      relatedEntityType: "newsletter_subscription",
      relatedEntityId,
      tokenHash,
      status: "active",
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      createdAt: now,
      attemptCount: 0,
      schemaVersion: 1,
    };
    await publicActionTokenRepository.create(record as PublicActionTokenRecord & Record<string, unknown>);
    return { token, tokenHash, record };
  }

  async consumeToken(token: string, tokenType: PublicActionTokenRecord["tokenType"]) {
    const tokenHash = hashToken(token);
    const record = await publicActionTokenRepository.findByTokenHash(tokenHash);
    if (!record || record.tokenType !== tokenType) return { valid: false as const, reason: "invalid" as const };
    const stored = Buffer.from(record.tokenHash);
    const incoming = Buffer.from(tokenHash);
    if (stored.length !== incoming.length || !timingSafeEqual(stored, incoming)) return { valid: false as const, reason: "invalid" as const };
    if (record.status === "used") return { valid: false as const, reason: "used" as const, record };
    if (record.status !== "active") return { valid: false as const, reason: record.status as "expired" | "revoked", record };
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await publicActionTokenRepository.update(record.publicActionTokenId, { status: "expired", attemptCount: (record.attemptCount ?? 0) + 1 });
      return { valid: false as const, reason: "expired" as const, record };
    }
    await publicActionTokenRepository.update(record.publicActionTokenId, { status: "used", usedAt: new Date().toISOString(), attemptCount: (record.attemptCount ?? 0) + 1 });
    return { valid: true as const, record };
  }

  hashToken(token: string) {
    return hashToken(token);
  }
}

export const publicFormTokenService = new PublicFormTokenService();
