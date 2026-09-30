export type MemberAccountStatus = "PendingVerification" | "Active" | "Locked" | "Disabled" | "Deleted" | "Suspended";
export type MembershipTier = "Guest" | "Free Member" | "Premium Ready" | "Supporter Ready" | "VIP Ready" | "Staff" | "Administrator";
export type MemberSessionStatus = "active" | "expired" | "revoked" | "compromised";
export type MemberTokenStatus = "active" | "used" | "expired" | "revoked";

export interface MemberPreferences {
  notifications: {
    newReleases: boolean;
    artistUpdates: boolean;
    newsletter: boolean;
    marketing: boolean;
    systemNotifications: boolean;
    securityAlerts: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showFavorites: boolean;
  };
  language?: string;
  timezone?: string;
}

export interface MemberAccount {
  memberId: string;
  email: string;
  normalizedEmail: string;
  displayName: string;
  username?: string;
  avatar?: string;
  bio?: string;
  membershipTier: MembershipTier;
  status: MemberAccountStatus;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  lastLogin?: string;
  lastPasswordChange?: string;
  failedLoginCount: number;
  lockedUntil?: string;
  preferences: MemberPreferences;
  schemaVersion: number;
  metadata?: Record<string, unknown>;
}

export interface MemberSession {
  sessionId: string;
  memberId: string;
  tokenHash: string;
  status: MemberSessionStatus;
  rememberMe: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
  ipHash?: string;
  userAgentHash?: string;
  deviceLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface MemberVerificationToken {
  verificationTokenId: string;
  memberId: string;
  tokenHash: string;
  status: MemberTokenStatus;
  expiresAt: string;
  requestedAt: string;
  usedAt?: string;
  requestIpHash?: string;
  metadata?: Record<string, unknown>;
}

export interface MemberPasswordResetToken {
  resetTokenId: string;
  memberId: string;
  tokenHash: string;
  status: MemberTokenStatus;
  expiresAt: string;
  requestedAt: string;
  usedAt?: string;
  requestIpHash?: string;
  metadata?: Record<string, unknown>;
}

export interface MemberAccountResponse {
  memberId: string;
  email: string;
  displayName: string;
  username?: string;
  avatar?: string;
  bio?: string;
  membershipTier: MembershipTier;
  status: MemberAccountStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  authorizationVersion?: number;
  preferences: MemberPreferences;
}

export interface MemberSessionResponse {
  sessionId: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  deviceLabel?: string;
  current: boolean;
  rememberMe: boolean;
}

export const defaultMemberPreferences = (): MemberPreferences => ({
  notifications: {
    newReleases: true,
    artistUpdates: true,
    newsletter: false,
    marketing: false,
    systemNotifications: true,
    securityAlerts: true,
  },
  privacy: {
    publicProfile: false,
    showFavorites: false,
  },
});

export const sanitizeMemberAccount = (member: MemberAccount): MemberAccountResponse => ({
  memberId: member.memberId,
  email: member.email,
  displayName: member.displayName,
  username: member.username,
  avatar: member.avatar,
  bio: member.bio,
  membershipTier: member.membershipTier,
  status: member.status,
  emailVerified: member.emailVerified,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
  lastLogin: member.lastLogin,
  authorizationVersion: typeof member.metadata?.authorizationVersion === "number" ? member.metadata.authorizationVersion : 1,
  preferences: member.preferences,
});
