import type { EntitlementDefinitionRecord, MembershipPlanRecord, MembershipTierRecord, TierEntitlementGrantRecord } from "../../models/membership/MembershipAccessModels";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";

const nowIso = () => new Date().toISOString();

export const defaultEntitlementKeys = [
  "content.public.view",
  "content.member.view",
  "content.free.view",
  "content.premium.view",
  "content.supporter.view",
  "content.vip.view",
  "audio.preview.basic",
  "audio.preview.extended",
  "audio.stream.full",
  "audio.download",
  "video.public.view",
  "video.member.view",
  "video.premium.view",
  "video.download",
  "gallery.public.view",
  "gallery.member.view",
  "gallery.premium.view",
  "gallery.download",
  "release.early_access",
  "release.exclusive_access",
  "artist.follow",
  "content.favorite",
  "playlist.create",
  "playlist.share",
  "history.view",
  "notifications.receive",
  "comments.create",
  "polls.vote",
  "community.access",
] as const;

const tierEntitlements: Record<MembershipTierRecord["tierKey"], string[]> = {
  guest: ["content.public.view", "audio.preview.basic", "video.public.view", "gallery.public.view"],
  free: ["content.public.view", "content.member.view", "content.free.view", "audio.preview.basic", "audio.preview.extended", "video.public.view", "video.member.view", "gallery.public.view", "gallery.member.view", "artist.follow", "content.favorite", "playlist.create", "history.view", "notifications.receive"],
  premium: ["content.public.view", "content.member.view", "content.free.view", "content.premium.view", "audio.preview.basic", "audio.preview.extended", "audio.stream.full", "video.public.view", "video.member.view", "video.premium.view", "gallery.public.view", "gallery.member.view", "gallery.premium.view", "release.early_access", "artist.follow", "content.favorite", "playlist.create", "playlist.share", "history.view", "notifications.receive"],
  supporter: ["content.public.view", "content.member.view", "content.free.view", "content.premium.view", "content.supporter.view", "audio.preview.basic", "audio.preview.extended", "audio.stream.full", "video.public.view", "video.member.view", "video.premium.view", "gallery.public.view", "gallery.member.view", "gallery.premium.view", "release.early_access", "release.exclusive_access", "artist.follow", "content.favorite", "playlist.create", "playlist.share", "history.view", "notifications.receive", "community.access"],
  vip: [...defaultEntitlementKeys],
};

export class MembershipCatalogService {
  async ensureDefaultCatalog(actorId = "system") {
    const now = nowIso();
    await jsonDatabase.update((data) => {
      if (!data.entitlementDefinitions.length) {
        data.entitlementDefinitions = defaultEntitlementKeys.map((key): EntitlementDefinitionRecord => ({
          entitlementId: `entitlement-${key.replace(/[^a-z0-9]+/gi, "-")}`,
          entitlementKey: key,
          name: key.split(".").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
          description: `Allows ${key}.`,
          category: key.startsWith("audio") ? "audio" : key.startsWith("video") ? "video" : key.startsWith("gallery") ? "gallery" : key.startsWith("playlist") ? "playlist" : key.startsWith("notifications") ? "notification" : key.startsWith("release") ? "early_access" : "content",
          resourceTypes: [key.split(".")[0]],
          actions: [key.split(".").slice(1).join(".")],
          status: "active",
          defaultDeny: true,
          supportsConditions: true,
          supportsQuota: key.includes("download"),
          supportsTimeWindow: true,
          supportsContentOverride: true,
          publicDescription: key,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        }));
      }
      if (!data.membershipTiers.length) {
        const tiers: Array<Pick<MembershipTierRecord, "tierKey" | "name" | "description" | "rank" | "isDefault" | "isPaidReady">> = [
          { tierKey: "guest", name: "Guest", description: "Public visitor access.", rank: 0, isDefault: false, isPaidReady: false },
          { tierKey: "free", name: "Free Member", description: "Registered member access.", rank: 10, isDefault: true, isPaidReady: false },
          { tierKey: "premium", name: "Premium Ready", description: "Premium access readiness before billing.", rank: 20, isDefault: false, isPaidReady: true },
          { tierKey: "supporter", name: "Supporter Ready", description: "Supporter access readiness before billing.", rank: 30, isDefault: false, isPaidReady: true },
          { tierKey: "vip", name: "VIP Ready", description: "VIP access readiness before billing.", rank: 40, isDefault: false, isPaidReady: true },
        ];
        data.membershipTiers = tiers.map((tier): MembershipTierRecord => ({
          tierId: `tier-${tier.tierKey}`,
          ...tier,
          status: "active",
          isPubliclyVisible: true,
          isStaffTier: false,
          entitlementKeys: tierEntitlements[tier.tierKey],
          displayMetadata: { billingReadiness: tier.isPaidReady ? "readiness_only" : "included" },
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        }));
      }
      if (!data.tierEntitlementGrants.length) {
        data.tierEntitlementGrants = data.membershipTiers.flatMap((tier) => tier.entitlementKeys.map((entitlementKey): TierEntitlementGrantRecord => ({
          tierEntitlementGrantId: `tiergrant-${tier.tierKey}-${entitlementKey.replace(/[^a-z0-9]+/gi, "-")}`,
          tierId: tier.tierId,
          entitlementKey,
          effect: "allow",
          status: "active",
          createdBy: actorId,
          updatedBy: actorId,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        })));
      }
      if (!data.membershipPlans.length) {
        data.membershipPlans = data.membershipTiers.filter((tier) => tier.tierKey !== "guest").map((tier): MembershipPlanRecord => ({
          planId: `plan-${tier.tierKey}`,
          planKey: `${tier.tierKey}-readiness`,
          name: `${tier.name} Plan`,
          description: `${tier.name} plan readiness.`,
          tierId: tier.tierId,
          status: "active",
          billingStatus: tier.isPaidReady ? "readiness_only" : "not_configured",
          priceDisplay: tier.isPaidReady ? "Billing coming later" : "Included",
          isPubliclyVisible: true,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        }));
      }
    });
    await mediaAuditPersistenceService.record("membership_catalog_verified", "Membership catalog verified.", { actorId, entityType: "membership_catalog" });
    return this.getCatalog();
  }

  async getCatalog() {
    const data = await jsonDatabase.read();
    if (!data.membershipTiers.length || !data.entitlementDefinitions.length) return this.ensureDefaultCatalog();
    return {
      tiers: data.membershipTiers,
      plans: data.membershipPlans,
      entitlements: data.entitlementDefinitions,
      tierGrants: data.tierEntitlementGrants,
    };
  }

  async getPublicTiers() {
    const catalog = await this.getCatalog();
    return catalog.tiers
      .filter((tier) => tier.status === "active" && tier.isPubliclyVisible)
      .sort((a, b) => a.rank - b.rank)
      .map((tier) => ({
        tierKey: tier.tierKey,
        name: tier.name,
        description: tier.description,
        benefits: tier.entitlementKeys.filter((key) => !key.includes("download")),
        availability: tier.isPaidReady ? "readiness" : "available",
        billingReadiness: tier.isPaidReady ? "readiness_only" : "included",
        comingSoon: tier.isPaidReady,
        displayMetadata: tier.displayMetadata,
      }));
  }

  async getTierByKey(tierKey: string) {
    const catalog = await this.getCatalog();
    return catalog.tiers.find((tier) => tier.tierKey === tierKey && tier.status === "active");
  }

  async getDefaultFreeTier() {
    const catalog = await this.getCatalog();
    return catalog.tiers.find((tier) => tier.tierKey === "free" && tier.status === "active");
  }
}

export const membershipCatalogService = new MembershipCatalogService();
