export type AdminSessionStatus = "active" | "expired" | "revoked" | "compromised";

export interface AdminSession {
  sessionId: string;
  userId: string;
  tokenHash: string;
  status: AdminSessionStatus;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  absoluteExpiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
  ipHash?: string;
  userAgentHash?: string;
  deviceLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminSessionResponse {
  sessionId: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  deviceLabel?: string;
  current: boolean;
}
