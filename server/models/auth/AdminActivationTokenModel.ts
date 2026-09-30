export type AdminActivationTokenStatus = "active" | "used" | "expired" | "revoked";

export interface AdminActivationToken {
  activationTokenId: string;
  userId: string;
  tokenHash: string;
  status: AdminActivationTokenStatus;
  expiresAt: string;
  createdAt: string;
  createdBy?: string;
  usedAt?: string;
  revokedAt?: string;
  metadata?: Record<string, unknown>;
}
