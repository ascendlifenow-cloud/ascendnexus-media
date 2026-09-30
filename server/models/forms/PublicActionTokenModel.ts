export interface PublicActionTokenRecord {
  publicActionTokenId: string;
  tokenType: "newsletter_confirmation" | "newsletter_unsubscribe";
  relatedEntityType: "newsletter_subscription";
  relatedEntityId: string;
  tokenHash: string;
  status: "active" | "used" | "expired" | "revoked";
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
  revokedAt?: string;
  attemptCount: number;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
