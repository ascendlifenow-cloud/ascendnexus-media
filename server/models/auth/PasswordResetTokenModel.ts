export type PasswordResetTokenStatus = "active" | "used" | "expired" | "revoked";

export interface PasswordResetToken {
  resetTokenId: string;
  userId: string;
  tokenHash: string;
  status: PasswordResetTokenStatus;
  expiresAt: string;
  usedAt?: string;
  requestedAt: string;
  requestIpHash?: string;
  metadata?: Record<string, unknown>;
}
