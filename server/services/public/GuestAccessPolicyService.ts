import type { GuestAccessLevel, GuestAccessPolicy } from "../../../src/models/publicExperience";
import { publicResponseSafetyService } from "./PublicResponseSafetyService";

const restrictedLevels = new Set<GuestAccessLevel>(["member_preview", "premium_member", "admin_only", "private"]);

export interface GuestAccessReport {
  safe: boolean;
  accessLevelCounts: Record<GuestAccessLevel, number>;
  forbiddenFields: string[];
  privateUrls: string[];
  signedUrls: string[];
  storagePaths: string[];
  fullSongReferences: string[];
  adminMetadata: string[];
  checkedAt: string;
}

export class GuestAccessPolicyService {
  buildPublicPolicy(options: { previewAvailable?: boolean; reason?: string } = {}): GuestAccessPolicy {
    return {
      accessLevel: options.previewAvailable ? "guest_preview" : "public",
      previewAvailable: Boolean(options.previewAvailable),
      requiresAccount: false,
      requiresMembership: false,
      reason: options.reason,
    };
  }

  isVisibleToGuest(policy?: Partial<GuestAccessPolicy> | null): boolean {
    if (!policy?.accessLevel) return true;
    return !restrictedLevels.has(policy.accessLevel);
  }

  sanitizeForGuest<T>(payload: T): T {
    return publicResponseSafetyService.sanitizeOptionalUnsafeFields(payload);
  }

  buildGuestAccessReport(payload: unknown): GuestAccessReport {
    const safety = publicResponseSafetyService.buildSafetyReport(payload, { endpoint: "/api/public/landing" });
    return {
      safe: safety.safe,
      accessLevelCounts: this.countAccessLevels(payload),
      forbiddenFields: safety.forbiddenKeys,
      privateUrls: safety.privateUrls,
      signedUrls: safety.signedUrls,
      storagePaths: safety.storagePaths,
      fullSongReferences: safety.fullSongReferences,
      adminMetadata: safety.adminMetadata,
      checkedAt: safety.checkedAt,
    };
  }

  private countAccessLevels(payload: unknown): Record<GuestAccessLevel, number> {
    const counts: Record<GuestAccessLevel, number> = {
      public: 0,
      guest_preview: 0,
      member_preview: 0,
      premium_member: 0,
      admin_only: 0,
      private: 0,
    };
    const walk = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      const record = value as Record<string, unknown>;
      if (typeof record.accessLevel === "string" && record.accessLevel in counts) counts[record.accessLevel as GuestAccessLevel] += 1;
      Object.values(record).forEach(walk);
    };
    walk(payload);
    return counts;
  }
}

export const guestAccessPolicyService = new GuestAccessPolicyService();
