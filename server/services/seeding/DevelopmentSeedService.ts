import crypto from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";
import type { DeploymentEnvironment } from "../../config/environment";
import type { AdminAccountType, AdminUser } from "../../models/auth/AdminUserModel";
import type { BillingPlanRecord, GiftMembershipRecord, InvoiceRecord, MemberSubscriptionRecord, PaymentRecord, RefundRecord } from "../../models/billing/BillingModels";
import type { MemberFavoriteRecord, MemberFollowRecord, MemberNotificationRecord, MemberPlaybackHistoryRecord, MemberPlaylistItemRecord, MemberPlaylistRecord, MemberSavedSearchRecord } from "../../models/memberEngagement/MemberEngagementModels";
import { defaultMemberPreferences, type MemberAccount, type MemberAccountStatus, type MembershipTier } from "../../models/members/MemberModels";
import type { DevelopmentSeedCredentialSummary, DevelopmentSeedEnvironment, DevelopmentSeedPasswordMode, DevelopmentSeedRunRecord, DevelopmentSeedVerificationReport } from "../../models/seeding/DevelopmentSeedModels";
import { passwordService } from "../auth/PasswordService";
import { adminRoleService } from "../auth/AdminRoleService";
import { billingPlanService } from "../billing/BillingServices";
import { membershipCatalogService } from "../membership/MembershipCatalogService";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";

export const developmentSeedVersion = "ANM-WEB-117A.1";
export const developmentSeedResetConfirmation = "RESET_DEVELOPMENT_IDENTITY_SEEDS";

const seedTag = "anm-web-117a";
const systemActor = "development-seed-system";
const nowIso = () => new Date().toISOString();
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const safeHash = (value: string) => crypto.createHash("sha256").update(value).digest("base64url");
const randomPassword = () => `ANM-${crypto.randomBytes(18).toString("base64url")}9a!`;
const idFromEmail = (prefix: string, email: string) => `${prefix}-${normalizeEmail(email).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const seededMetadata = (extra: Record<string, unknown> = {}) => ({ seedTag, seedVersion: developmentSeedVersion, ...extra });

const adminSeedAccounts: Array<{ email: string; displayName: string; accountType: AdminAccountType; roles: string[] }> = [
  { email: "superadmin@ascendnexus.local", displayName: "Development Super Admin", accountType: "super_administrator", roles: ["super_admin"] },
  { email: "admin@ascendnexus.local", displayName: "Development Admin", accountType: "administrator", roles: ["admin"] },
  { email: "content@ascendnexus.local", displayName: "Development Content Manager", accountType: "staff", roles: ["content_manager"] },
  { email: "publisher@ascendnexus.local", displayName: "Development Publisher", accountType: "staff", roles: ["publisher"] },
  { email: "moderator@ascendnexus.local", displayName: "Development Moderator", accountType: "staff", roles: ["editor", "viewer"] },
  { email: "support@ascendnexus.local", displayName: "Development Support", accountType: "staff", roles: ["support"] },
];

const memberSeedAccounts: Array<{
  email: string;
  displayName: string;
  tierKey: "free" | "premium" | "supporter" | "vip";
  membershipTier: MembershipTier;
  status: MemberAccountStatus;
  assignmentStatus: "active" | "trial" | "grace" | "cancelled" | "expired" | "suspended";
  subscriptionState: MemberSubscriptionRecord["state"];
  emailVerified: boolean;
}> = [
  { email: "free@ascendnexus.local", displayName: "Free Seed Member", tierKey: "free", membershipTier: "Free Member", status: "Active", assignmentStatus: "active", subscriptionState: "active", emailVerified: true },
  { email: "premium@ascendnexus.local", displayName: "Premium Seed Member", tierKey: "premium", membershipTier: "Premium Ready", status: "Active", assignmentStatus: "active", subscriptionState: "active", emailVerified: true },
  { email: "supporter@ascendnexus.local", displayName: "Supporter Seed Member", tierKey: "supporter", membershipTier: "Supporter Ready", status: "Active", assignmentStatus: "grace", subscriptionState: "grace", emailVerified: true },
  { email: "vip@ascendnexus.local", displayName: "VIP Seed Member", tierKey: "vip", membershipTier: "VIP Ready", status: "Active", assignmentStatus: "trial", subscriptionState: "trial", emailVerified: true },
  { email: "suspended@ascendnexus.local", displayName: "Suspended Seed Member", tierKey: "premium", membershipTier: "Premium Ready", status: "Suspended", assignmentStatus: "suspended", subscriptionState: "suspended", emailVerified: true },
  { email: "disabled@ascendnexus.local", displayName: "Disabled Seed Member", tierKey: "premium", membershipTier: "Premium Ready", status: "Disabled", assignmentStatus: "cancelled", subscriptionState: "canceled", emailVerified: true },
  { email: "pending@ascendnexus.local", displayName: "Pending Seed Member", tierKey: "free", membershipTier: "Free Member", status: "PendingVerification", assignmentStatus: "active", subscriptionState: "pending", emailVerified: false },
  { email: "expired@ascendnexus.local", displayName: "Expired Seed Member", tierKey: "premium", membershipTier: "Premium Ready", status: "Active", assignmentStatus: "expired", subscriptionState: "expired", emailVerified: true },
];

const seedContent = {
  artistId: "seed-artist-ascend-echo",
  publicReleaseId: "seed-release-public-signal",
  premiumReleaseId: "seed-release-premium-horizon",
  supporterReleaseId: "seed-release-supporter-orbit",
  vipReleaseId: "seed-release-vip-apex",
  previewAssetId: "seed-asset-public-preview",
  premiumAssetId: "seed-asset-premium-full-stream",
};

const upsert = <T>(items: T[], predicate: (item: T) => boolean, build: (existing?: T) => T): "created" | "updated" => {
  const index = items.findIndex(predicate);
  if (index >= 0) {
    items[index] = build(items[index]);
    return "updated";
  }
  items.push(build());
  return "created";
};

export class DevelopmentSeedService {
  private resolveEnvironment(environment?: string): DevelopmentSeedEnvironment {
    const resolved = (environment ?? getBackendConfig().app.environment) as DeploymentEnvironment | "local";
    if (resolved === "production") throw new Error("Development identity seeds are blocked in production.");
    if (resolved === "local" || resolved === "development") return "development";
    if (resolved === "test" || resolved === "staging") return resolved;
    throw new Error(`Unsupported seed environment "${resolved}".`);
  }

  private getPasswordBundle() {
    const configured = process.env.DEVELOPMENT_SEED_PASSWORD ?? process.env.SEED_TEST_PASSWORD;
    const mode: DevelopmentSeedPasswordMode = configured ? "configured" : "generated";
    const sharedPassword = configured || randomPassword();
    return { mode, sharedPassword };
  }

  async seed(options: { environment?: string; includePasswords?: boolean } = {}) {
    const environment = this.resolveEnvironment(options.environment);
    const startedAt = nowIso();
    const { mode, sharedPassword } = this.getPasswordBundle();
    const credentials: DevelopmentSeedCredentialSummary[] = [];
    const created = { admin: 0, members: 0, content: 0, billing: 0, engagement: 0 };
    const warnings: string[] = mode === "configured" ? ["Using configured development seed password from environment."] : ["Generated temporary password; it is returned once and never persisted as plaintext."];
    await adminRoleService.initializeRoles();
    await membershipCatalogService.ensureDefaultCatalog(systemActor);
    await billingPlanService.ensureDefaultPlans(systemActor);

    await jsonDatabase.update((data) => {
      const now = nowIso();
      const passwordHash = passwordService.hashPassword(sharedPassword);

      for (const seed of adminSeedAccounts) {
        const userId = idFromEmail("seed-admin", seed.email);
        const result = upsert(data.adminUsers, (item) => item.userId === userId || item.normalizedEmail === normalizeEmail(seed.email), (existing): AdminUser => ({
          userId,
          email: seed.email,
          normalizedEmail: normalizeEmail(seed.email),
          displayName: seed.displayName,
          accountType: seed.accountType,
          passwordHash,
          status: "active",
          roles: seed.roles,
          directPermissions: [],
          emailVerified: true,
          emailVerifiedAt: existing?.emailVerifiedAt ?? now,
          activatedAt: existing?.activatedAt ?? now,
          passwordChangedAt: now,
          failedLoginCount: 0,
          createdBy: existing?.createdBy ?? systemActor,
          updatedBy: systemActor,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          metadata: seededMetadata({ purpose: "development-admin-login" }),
        }));
        if (result === "created") created.admin += 1;
        credentials.push({ email: seed.email, accountType: "admin", roleOrTier: seed.roles.join(", "), status: "active", passwordMode: mode, temporaryPassword: options.includePasswords ? sharedPassword : undefined });
      }

      for (const seed of memberSeedAccounts) {
        const memberId = idFromEmail("seed-member", seed.email);
        const result = upsert(data.memberAccounts, (item) => item.memberId === memberId || item.normalizedEmail === normalizeEmail(seed.email), (existing): MemberAccount => ({
          memberId,
          email: seed.email,
          normalizedEmail: normalizeEmail(seed.email),
          displayName: seed.displayName,
          username: normalizeEmail(seed.email).split("@")[0],
          avatar: existing?.avatar,
          bio: `${seed.displayName} for development and staging verification.`,
          membershipTier: seed.membershipTier,
          status: seed.status,
          emailVerified: seed.emailVerified,
          emailVerifiedAt: seed.emailVerified ? existing?.emailVerifiedAt ?? now : undefined,
          passwordHash,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          lastPasswordChange: now,
          failedLoginCount: 0,
          preferences: existing?.preferences ?? defaultMemberPreferences(),
          schemaVersion: 1,
          metadata: seededMetadata({ authorizationVersion: 1, scenario: seed.assignmentStatus }),
        }));
        if (result === "created") created.members += 1;
        credentials.push({ email: seed.email, accountType: "member", roleOrTier: seed.tierKey, status: seed.status, passwordMode: mode, temporaryPassword: options.includePasswords ? sharedPassword : undefined });
      }

      this.seedMembershipAssignments(data, now);
      created.content += this.seedContent(data, now);
      created.engagement += this.seedEngagement(data, now);
      created.billing += this.seedBilling(data, now);
      this.recordSeedRun(data, {
        environment,
        status: "completed",
        command: "seed",
        passwordMode: mode,
        startedAt,
        completedAt: now,
        createdAdminUsers: created.admin,
        createdMembers: created.members,
        createdContent: created.content,
        createdBillingScenarios: created.billing,
        createdEngagementRecords: created.engagement,
        warnings,
        errors: [],
        metadataSafe: { passwordReturned: Boolean(options.includePasswords), seedTag },
      });
    });

    const verification = await this.verify({ environment });
    return { seedVersion: developmentSeedVersion, environment, passwordMode: mode, credentials, verification, warnings };
  }

  async listUsers(options: { environment?: string; includePasswords?: boolean } = {}) {
    const environment = this.resolveEnvironment(options.environment);
    const { mode, sharedPassword } = this.getPasswordBundle();
    return {
      seedVersion: developmentSeedVersion,
      environment,
      passwordMode: mode,
      note: mode === "configured" ? "All seed users use DEVELOPMENT_SEED_PASSWORD/SEED_TEST_PASSWORD." : "Run seed:development to generate usable temporary passwords.",
      admins: adminSeedAccounts.map((account) => ({ email: account.email, displayName: account.displayName, roles: account.roles, temporaryPassword: options.includePasswords && mode === "configured" ? sharedPassword : undefined })),
      members: memberSeedAccounts.map((account) => ({ email: account.email, displayName: account.displayName, tier: account.tierKey, status: account.status, scenario: account.assignmentStatus, temporaryPassword: options.includePasswords && mode === "configured" ? sharedPassword : undefined })),
    };
  }

  async verify(options: { environment?: string } = {}): Promise<DevelopmentSeedVerificationReport> {
    let environment = "";
    try {
      environment = this.resolveEnvironment(options.environment);
    } catch (error) {
      return {
        seedVersion: developmentSeedVersion,
        environment: options.environment ?? getBackendConfig().app.environment,
        productionProtected: true,
        status: "blocked",
        adminUsers: { expected: adminSeedAccounts.length, actual: 0, missing: [] },
        memberUsers: { expected: memberSeedAccounts.length, actual: 0, missing: [] },
        membershipAssignments: { expectedMinimum: memberSeedAccounts.length, actual: 0 },
        billingScenarios: { expectedMinimum: 8, actual: 0 },
        engagementRecords: { expectedMinimum: 8, actual: 0 },
        protectedContent: { expectedMinimum: 2, actual: 0 },
        warnings: [],
        errors: [error instanceof Error ? error.message : "Seed verification blocked."],
        checkedAt: nowIso(),
      };
    }
    const data = await jsonDatabase.read();
    const adminMissing = adminSeedAccounts.map((item) => normalizeEmail(item.email)).filter((email) => !data.adminUsers.some((user) => user.normalizedEmail === email && user.metadata?.seedTag === seedTag));
    const memberMissing = memberSeedAccounts.map((item) => normalizeEmail(item.email)).filter((email) => !data.memberAccounts.some((member) => member.normalizedEmail === email && member.metadata?.seedTag === seedTag));
    const memberIds = memberSeedAccounts.map((item) => idFromEmail("seed-member", item.email));
    const assignments = data.memberMembershipAssignments.filter((item) => memberIds.includes(item.memberId) && item.metadata?.seedTag === seedTag).length;
    const billing = data.memberSubscriptions.filter((item) => memberIds.includes(item.memberId) && item.metadataSafe?.seedTag === seedTag).length + data.giftMemberships.filter((item) => item.giftId.startsWith("seed-gift-")).length;
    const engagement = [
      ...data.memberFavorites,
      ...data.memberFollows,
      ...data.memberPlaylists,
      ...data.memberPlaylistItems,
      ...data.memberPlaybackHistory,
      ...data.memberNotifications,
      ...data.memberSavedSearches,
    ].filter((item) => "memberId" in item && memberIds.includes(item.memberId)).length;
    const protectedContent = data.protectedMediaResources.filter((item) => item.protectedMediaResourceId.startsWith("seed-")).length;
    const errors = [
      ...adminMissing.map((email) => `Missing admin seed user ${email}.`),
      ...memberMissing.map((email) => `Missing member seed user ${email}.`),
      ...(assignments < memberSeedAccounts.length ? [`Expected at least ${memberSeedAccounts.length} seeded membership assignments, found ${assignments}.`] : []),
      ...(billing < 8 ? [`Expected at least 8 billing scenarios, found ${billing}.`] : []),
      ...(engagement < 8 ? [`Expected at least 8 engagement records, found ${engagement}.`] : []),
      ...(protectedContent < 2 ? [`Expected protected content seed resources, found ${protectedContent}.`] : []),
    ];
    return {
      seedVersion: developmentSeedVersion,
      environment,
      productionProtected: true,
      status: errors.length ? "fail" : "pass",
      adminUsers: { expected: adminSeedAccounts.length, actual: adminSeedAccounts.length - adminMissing.length, missing: adminMissing },
      memberUsers: { expected: memberSeedAccounts.length, actual: memberSeedAccounts.length - memberMissing.length, missing: memberMissing },
      membershipAssignments: { expectedMinimum: memberSeedAccounts.length, actual: assignments },
      billingScenarios: { expectedMinimum: 8, actual: billing },
      engagementRecords: { expectedMinimum: 8, actual: engagement },
      protectedContent: { expectedMinimum: 2, actual: protectedContent },
      lastRun: data.developmentSeedRuns.filter((item) => item.seedVersion === developmentSeedVersion).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0],
      warnings: [],
      errors,
      checkedAt: nowIso(),
    };
  }

  async reset(options: { environment?: string; confirmation?: string } = {}) {
    const environment = this.resolveEnvironment(options.environment);
    if (options.confirmation !== developmentSeedResetConfirmation) {
      throw new Error(`Seed reset requires confirmation "${developmentSeedResetConfirmation}".`);
    }
    const startedAt = nowIso();
    let removed = 0;
    await jsonDatabase.update((data) => {
      const before = JSON.stringify(data).length;
      const seeded = (item: { metadata?: Record<string, unknown>; metadataSafe?: Record<string, unknown> }) => item.metadata?.seedTag === seedTag || item.metadataSafe?.seedTag === seedTag;
      const seededIds = {
        adminUserIds: new Set(adminSeedAccounts.map((item) => idFromEmail("seed-admin", item.email))),
        memberIds: new Set(memberSeedAccounts.map((item) => idFromEmail("seed-member", item.email))),
      };
      data.adminUsers = data.adminUsers.filter((item) => !seededIds.adminUserIds.has(item.userId) && !seeded(item));
      data.memberAccounts = data.memberAccounts.filter((item) => !seededIds.memberIds.has(item.memberId) && !seeded(item));
      data.memberMembershipAssignments = data.memberMembershipAssignments.filter((item) => !seededIds.memberIds.has(item.memberId) && !seeded(item));
      data.memberEntitlementGrants = data.memberEntitlementGrants.filter((item) => !seededIds.memberIds.has(item.memberId) && !seeded(item));
      data.memberFavorites = data.memberFavorites.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberFollows = data.memberFollows.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberPlaylists = data.memberPlaylists.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberPlaylistItems = data.memberPlaylistItems.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberPlaybackHistory = data.memberPlaybackHistory.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberViewingHistory = data.memberViewingHistory.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberNotifications = data.memberNotifications.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberRecommendationFeedback = data.memberRecommendationFeedback.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberSavedSearches = data.memberSavedSearches.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberCollections = data.memberCollections.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberCollectionItems = data.memberCollectionItems.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.memberSubscriptions = data.memberSubscriptions.filter((item) => !seededIds.memberIds.has(item.memberId) && item.metadataSafe?.seedTag !== seedTag);
      data.paymentMethods = data.paymentMethods.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.paymentRecords = data.paymentRecords.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.invoiceRecords = data.invoiceRecords.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.refundRecords = data.refundRecords.filter((item) => !seededIds.memberIds.has(item.memberId));
      data.couponRecords = data.couponRecords.filter((item) => item.couponId !== "seed-coupon-launch50");
      data.promotionRecords = data.promotionRecords.filter((item) => item.promotionId !== "seed-promotion-launch");
      data.giftMemberships = data.giftMemberships.filter((item) => !item.giftId.startsWith("seed-gift-"));
      data.artistRecords = data.artistRecords.filter((item) => item.metadata?.seedTag !== seedTag);
      data.releaseRecords = data.releaseRecords.filter((item) => item.metadata?.seedTag !== seedTag);
      data.mediaAssets = data.mediaAssets.filter((item) => item.metadata?.seedTag !== seedTag);
      data.mediaStorageObjects = data.mediaStorageObjects.filter((item) => item.metadata?.seedTag !== seedTag);
      data.mediaDeliveryProfiles = data.mediaDeliveryProfiles.filter((item) => !item.deliveryProfileId.startsWith("seed-"));
      data.protectedMediaResources = data.protectedMediaResources.filter((item) => !item.protectedMediaResourceId.startsWith("seed-"));
      data.contentEntitlementRequirements = data.contentEntitlementRequirements.filter((item) => !item.requirementId.startsWith("seed-"));
      removed = Math.max(0, before - JSON.stringify(data).length);
      this.recordSeedRun(data, {
        environment,
        status: "completed",
        command: "reset",
        passwordMode: "generated",
        startedAt,
        completedAt: nowIso(),
        createdAdminUsers: 0,
        createdMembers: 0,
        createdContent: 0,
        createdBillingScenarios: 0,
        createdEngagementRecords: 0,
        warnings: [],
        errors: [],
        metadataSafe: { removedApproximateBytes: removed, seedTag },
      });
    });
    return { seedVersion: developmentSeedVersion, environment, reset: true, removedApproximateBytes: removed };
  }

  private seedMembershipAssignments(data: MediaDatabaseShape, now: string) {
    for (const seed of memberSeedAccounts) {
      const memberId = idFromEmail("seed-member", seed.email);
      const tier = data.membershipTiers.find((item) => item.tierKey === seed.tierKey);
      if (!tier) continue;
      const status = seed.assignmentStatus === "trial" ? "active" : seed.assignmentStatus;
      upsert(data.memberMembershipAssignments, (item) => item.assignmentId === `seed-assignment-${seed.tierKey}-${memberId}`, (existing) => ({
        assignmentId: `seed-assignment-${seed.tierKey}-${memberId}`,
        memberId,
        tierId: tier.tierId,
        planId: `plan-${seed.tierKey}`,
        source: seed.subscriptionState === "active" ? "subscription" : "admin_grant",
        status,
        startsAt: existing?.startsAt ?? daysFromNow(seed.assignmentStatus === "expired" ? -90 : -14),
        endsAt: seed.assignmentStatus === "expired" ? daysFromNow(-1) : seed.assignmentStatus === "cancelled" ? daysFromNow(14) : daysFromNow(365),
        graceEndsAt: seed.assignmentStatus === "grace" ? daysFromNow(7) : undefined,
        cancelledAt: seed.assignmentStatus === "cancelled" ? now : undefined,
        suspendedAt: seed.assignmentStatus === "suspended" ? now : undefined,
        metadata: seededMetadata({ scenario: seed.assignmentStatus }),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        schemaVersion: 1,
      }));
    }
  }

  private seedContent(data: MediaDatabaseShape, now: string) {
    let count = 0;
    const artistResult = upsert(data.artistRecords, (item) => item.artistId === seedContent.artistId, (existing) => ({
      artistId: seedContent.artistId,
      name: "Ascend Echo",
      displayName: "Ascend Echo",
      slug: "ascend-echo",
      shortBio: "Development seed artist for member, billing, and protected-content flows.",
      bio: "Ascend Echo is a seeded AI artist used only in development and staging verification.",
      status: "active",
      genres: ["Electronic", "Cinematic"],
      styleTags: ["seed", "test"],
      profileImage: "/assets/seed/ascend-echo-profile.jpg",
      sortOrder: 1,
      featured: true,
      externalLinks: {},
      publicationState: "published",
      publicVisibility: true,
      createdBy: systemActor,
      updatedBy: systemActor,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: seededMetadata(),
      schemaVersion: 1,
    }));
    if (artistResult === "created") count += 1;

    upsert(data.contentAccessPolicies, (item) => item.policyId === "policy-default-membership-access", (existing) => ({
      policyId: "policy-default-membership-access",
      policyKey: "default-membership-access",
      name: "Default Membership Access",
      description: "Development seed policy for public, premium, supporter, and VIP content.",
      status: "published",
      version: 1,
      defaultEffect: "deny",
      rules: [
        { ruleId: "seed-public-allow", priority: 10, effect: "allow", requiredEntitlements: ["content.public.view"], requiredPublicationStatus: ["published"], reasonCode: "PUBLIC_CONTENT_ALLOWED", enabled: true },
        { ruleId: "seed-premium-allow", priority: 20, effect: "allow", requiredEntitlements: ["content.premium.view"], requiredAccountStatus: ["Active"], requiredMembershipStatus: ["active"], requiredPublicationStatus: ["published"], reasonCode: "PREMIUM_CONTENT_ALLOWED", enabled: true },
        { ruleId: "seed-supporter-allow", priority: 30, effect: "allow", requiredEntitlements: ["content.supporter.view"], requiredAccountStatus: ["Active"], requiredMembershipStatus: ["active"], requiredPublicationStatus: ["published"], reasonCode: "SUPPORTER_CONTENT_ALLOWED", enabled: true },
        { ruleId: "seed-vip-allow", priority: 40, effect: "allow", requiredEntitlements: ["content.vip.view"], requiredAccountStatus: ["Active"], requiredMembershipStatus: ["active"], requiredPublicationStatus: ["published"], reasonCode: "VIP_CONTENT_ALLOWED", enabled: true },
      ],
      teaserPolicy: { teaserFields: ["title", "artist", "coverArtUrl", "description"] },
      previewPolicy: { previewAssetRequired: true },
      streamPolicy: { authorizationRequired: true, ttlSeconds: 300 },
      downloadPolicy: { enabled: false },
      createdBy: systemActor,
      updatedBy: systemActor,
      publishedAt: existing?.publishedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      schemaVersion: 1,
    }));

    const releases = [
      { releaseId: seedContent.publicReleaseId, songId: "seed-song-public-signal", title: "Public Signal", slug: "public-signal", required: ["content.public.view"], classification: "public", featured: true },
      { releaseId: seedContent.premiumReleaseId, songId: "seed-song-premium-horizon", title: "Premium Horizon", slug: "premium-horizon", required: ["content.premium.view", "audio.stream.full"], classification: "premium_member", featured: true },
      { releaseId: seedContent.supporterReleaseId, songId: "seed-song-supporter-orbit", title: "Supporter Orbit", slug: "supporter-orbit", required: ["content.supporter.view", "audio.stream.full"], classification: "supporter", featured: false },
      { releaseId: seedContent.vipReleaseId, songId: "seed-song-vip-apex", title: "VIP Apex", slug: "vip-apex", required: ["content.vip.view", "audio.stream.full"], classification: "vip", featured: false },
    ] as const;
    for (const release of releases) {
      if (upsert(data.releaseRecords, (item) => item.releaseId === release.releaseId, (existing) => ({
        releaseId: release.releaseId,
        songId: release.songId,
        artistId: seedContent.artistId,
        title: release.title,
        slug: release.slug,
        description: `${release.title} is seeded ${release.classification} content for development verification.`,
        releaseDate: daysFromNow(-7),
        genre: "Electronic",
        styleTags: ["seed", release.classification],
        status: "published",
        publicationState: "published",
        publicVisibility: release.classification === "public",
        featured: release.featured,
        coverArtUrl: `/assets/seed/${release.slug}.jpg`,
        audioPreviewUrl: `/media/previews/${release.slug}.mp3`,
        externalLinks: {},
        sortOrder: release.featured ? 1 : 20,
        createdBy: systemActor,
        updatedBy: systemActor,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        metadata: seededMetadata({ accessClassification: release.classification }),
        schemaVersion: 1,
      })) === "created") count += 1;
      upsert(data.contentEntitlementRequirements, (item) => item.requirementId === `seed-requirement-${release.releaseId}`, (existing) => ({
        requirementId: `seed-requirement-${release.releaseId}`,
        contentType: "release",
        contentId: release.releaseId,
        policyId: "policy-default-membership-access",
        requiredEntitlementKeys: [...release.required],
        accessClassification: release.classification,
        teaserEnabled: release.classification !== "public",
        teaserFields: ["title", "artist", "coverArtUrl", "description"],
        previewAssetId: seedContent.previewAssetId,
        streamAssetId: release.classification === "public" ? undefined : seedContent.premiumAssetId,
        status: "active",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        schemaVersion: 1,
      }));
    }
    upsert(data.mediaAssets, (item) => item.assetId === seedContent.previewAssetId, (existing) => ({
      assetId: seedContent.previewAssetId,
      ownerType: "release",
      ownerId: seedContent.publicReleaseId,
      assetType: "audio_preview",
      title: "Seed Public Preview",
      url: "/media/previews/seed-public-preview.mp3",
      status: "published",
      assignmentStatus: "assigned",
      createdBy: systemActor,
      updatedBy: systemActor,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: seededMetadata({ publicPreview: true }),
    }));
    upsert(data.mediaAssets, (item) => item.assetId === seedContent.premiumAssetId, (existing) => ({
      assetId: seedContent.premiumAssetId,
      ownerType: "release",
      ownerId: seedContent.premiumReleaseId,
      assetType: "full_song_stream",
      title: "Seed Protected Full Stream",
      status: "published",
      assignmentStatus: "assigned",
      createdBy: systemActor,
      updatedBy: systemActor,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      metadata: seededMetadata({ protectedStream: true }),
    }));
    upsert(data.mediaDeliveryProfiles, (item) => item.deliveryProfileId === "seed-profile-protected-audio", (existing) => ({
      deliveryProfileId: "seed-profile-protected-audio",
      profileKey: "seed-protected-audio",
      name: "Seed Protected Audio",
      mediaType: "audio",
      accessClassification: "protected_stream",
      deliveryMode: "protected_gateway",
      requiredEntitlementKey: "audio.stream.full",
      allowedActions: ["stream", "preview"],
      tokenTtlSeconds: 300,
      maxUses: 3,
      rangeRequestsAllowed: true,
      downloadAllowed: false,
      publicCacheAllowed: false,
      privateCacheAllowed: true,
      cdnAllowed: false,
      sessionBindingRequired: true,
      memberBindingRequired: true,
      watermarkingReadiness: "disabled",
      status: "active",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      schemaVersion: 1,
    }));
    upsert(data.protectedMediaResources, (item) => item.protectedMediaResourceId === "seed-protected-premium-full-stream", (existing) => ({
      protectedMediaResourceId: "seed-protected-premium-full-stream",
      mediaAssetId: seedContent.premiumAssetId,
      contentType: "release",
      contentId: seedContent.premiumReleaseId,
      mediaType: "audio",
      deliveryProfileId: "seed-profile-protected-audio",
      storageProvider: "local",
      privateObjectKey: "private/seed/premium-horizon-stream.mp3",
      publicPreviewAssetId: seedContent.previewAssetId,
      mimeType: "audio/mpeg",
      fileSize: 4200000,
      duration: 214,
      checksum: safeHash("premium-horizon-stream"),
      status: "ready",
      publicationVersion: developmentSeedVersion,
      accessPolicyId: "policy-default-membership-access",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      schemaVersion: 1,
    }));
    upsert(data.protectedMediaResources, (item) => item.protectedMediaResourceId === "seed-protected-vip-full-stream", (existing) => ({
      protectedMediaResourceId: "seed-protected-vip-full-stream",
      mediaAssetId: seedContent.premiumAssetId,
      contentType: "release",
      contentId: seedContent.vipReleaseId,
      mediaType: "audio",
      deliveryProfileId: "seed-profile-protected-audio",
      storageProvider: "local",
      privateObjectKey: "private/seed/vip-apex-stream.mp3",
      publicPreviewAssetId: seedContent.previewAssetId,
      mimeType: "audio/mpeg",
      fileSize: 5000000,
      duration: 241,
      checksum: safeHash("vip-apex-stream"),
      status: "ready",
      publicationVersion: developmentSeedVersion,
      accessPolicyId: "policy-default-membership-access",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      schemaVersion: 1,
    }));
    return count + 3;
  }

  private seedEngagement(data: MediaDatabaseShape, now: string) {
    let count = 0;
    const activeMembers = memberSeedAccounts.filter((member) => member.status === "Active").map((member) => idFromEmail("seed-member", member.email));
    for (const memberId of activeMembers) {
      const ref = { resourceType: "release" as const, resourceId: seedContent.publicReleaseId, title: "Public Signal", slug: "public-signal", imageUrl: "/assets/seed/public-signal.jpg", metadataSafe: { seedTag } };
      if (upsert(data.memberFavorites, (item) => item.favoriteId === `seed-favorite-${memberId}`, (existing): MemberFavoriteRecord => ({ favoriteId: `seed-favorite-${memberId}`, memberId, resource: ref, status: "active", createdAt: existing?.createdAt ?? now, updatedAt: now, schemaVersion: 1 })) === "created") count += 1;
      if (upsert(data.memberFollows, (item) => item.followId === `seed-follow-${memberId}`, (existing): MemberFollowRecord => ({ followId: `seed-follow-${memberId}`, memberId, resource: { resourceType: "artist", resourceId: seedContent.artistId, title: "Ascend Echo", slug: "ascend-echo", metadataSafe: { seedTag } }, status: "active", createdAt: existing?.createdAt ?? now, updatedAt: now, schemaVersion: 1 })) === "created") count += 1;
      if (upsert(data.memberPlaylists, (item) => item.playlistId === `seed-playlist-${memberId}`, (existing): MemberPlaylistRecord => ({ playlistId: `seed-playlist-${memberId}`, memberId, name: "Seed Listening Queue", description: "Development playlist seeded for member flows.", visibility: "private", status: "active", createdAt: existing?.createdAt ?? now, updatedAt: now, schemaVersion: 1 })) === "created") count += 1;
      upsert(data.memberPlaylistItems, (item) => item.playlistItemId === `seed-playlist-item-${memberId}`, (): MemberPlaylistItemRecord => ({ playlistItemId: `seed-playlist-item-${memberId}`, playlistId: `seed-playlist-${memberId}`, memberId, resource: ref, position: 1, addedAt: now, schemaVersion: 1 }));
      upsert(data.memberPlaybackHistory, (item) => item.historyId === `seed-playback-${memberId}`, (): MemberPlaybackHistoryRecord => ({ historyId: `seed-playback-${memberId}`, memberId, resource: ref, eventType: "resumed", lastPositionSeconds: 42, durationSeconds: 214, listenedSeconds: 42, playbackDevice: "web", occurredAt: now, metadataSafe: { seedTag, continueListening: true }, schemaVersion: 1 }));
      upsert(data.memberNotifications, (item) => item.notificationId === `seed-notification-${memberId}`, (): MemberNotificationRecord => ({ notificationId: `seed-notification-${memberId}`, memberId, type: "exclusive_content", title: "Seed exclusive content is ready", body: "Use this notification to test member messaging.", resource: ref, delivery: { inApp: true, emailReady: true, pushReady: false, digestReady: true }, status: "unread", createdAt: now, schemaVersion: 1 }));
      upsert(data.memberSavedSearches, (item) => item.savedSearchId === `seed-search-${memberId}`, (existing): MemberSavedSearchRecord => ({ savedSearchId: `seed-search-${memberId}`, memberId, name: "Seed electronic releases", query: "electronic", filters: { genre: "Electronic" }, status: "active", createdAt: existing?.createdAt ?? now, updatedAt: now, schemaVersion: 1 }));
    }
    return count + activeMembers.length * 4;
  }

  private seedBilling(data: MediaDatabaseShape, now: string) {
    let count = 0;
    const plansByKey = new Map(data.billingPlans.map((plan) => [plan.planKey, plan]));
    const planFor = (tierKey: string): BillingPlanRecord => plansByKey.get(tierKey === "vip" ? "vip-monthly" : tierKey === "supporter" ? "supporter-monthly" : tierKey === "premium" ? "premium-monthly" : "free") ?? data.billingPlans[0];
    for (const seed of memberSeedAccounts) {
      const memberId = idFromEmail("seed-member", seed.email);
      const plan = planFor(seed.tierKey);
      const subscriptionId = `seed-subscription-${memberId}`;
      if (upsert(data.memberSubscriptions, (item) => item.subscriptionId === subscriptionId, (existing): MemberSubscriptionRecord => ({
        subscriptionId,
        memberId,
        billingPlanId: plan.billingPlanId,
        planKey: plan.planKey,
        provider: "test",
        providerCustomerId: `cus_seed_${safeHash(memberId).slice(0, 12)}`,
        providerSubscriptionId: `sub_seed_${safeHash(subscriptionId).slice(0, 12)}`,
        state: seed.subscriptionState,
        currentPeriodStart: daysFromNow(-15),
        currentPeriodEnd: seed.subscriptionState === "expired" ? daysFromNow(-1) : daysFromNow(15),
        trialEndsAt: seed.subscriptionState === "trial" ? daysFromNow(7) : undefined,
        graceEndsAt: seed.subscriptionState === "grace" ? daysFromNow(5) : undefined,
        canceledAt: seed.subscriptionState === "canceled" ? now : undefined,
        latestInvoiceId: `seed-invoice-${memberId}`,
        couponCode: seed.email === "supporter@ascendnexus.local" ? "SEED50" : undefined,
        metadataSafe: seededMetadata({ billingScenario: seed.subscriptionState }),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        schemaVersion: 1,
      })) === "created") count += 1;
      upsert(data.invoiceRecords, (item) => item.invoiceId === `seed-invoice-${memberId}`, (): InvoiceRecord => ({ invoiceId: `seed-invoice-${memberId}`, invoiceNumber: `SEED-${safeHash(memberId).slice(0, 8).toUpperCase()}`, memberId, subscriptionId, provider: "test", providerInvoiceId: `in_seed_${safeHash(memberId).slice(0, 12)}`, status: seed.subscriptionState === "past_due" ? "failed" : seed.subscriptionState === "expired" ? "void" : "paid", subtotalCents: plan.amountCents, discountCents: seed.email === "supporter@ascendnexus.local" ? Math.floor(plan.amountCents / 2) : 0, taxCents: 0, totalCents: seed.email === "supporter@ascendnexus.local" ? Math.ceil(plan.amountCents / 2) : plan.amountCents, amountPaidCents: seed.subscriptionState === "past_due" ? 0 : plan.amountCents, currency: "USD", issuedAt: daysFromNow(-3), paidAt: seed.subscriptionState === "past_due" ? undefined : daysFromNow(-3), lineItems: [{ description: `${plan.name} seed scenario`, amountCents: plan.amountCents, quantity: 1 }], metadataSafe: seededMetadata(), schemaVersion: 1 }));
      upsert(data.paymentRecords, (item) => item.paymentId === `seed-payment-${memberId}`, (): PaymentRecord => ({ paymentId: `seed-payment-${memberId}`, memberId, subscriptionId, invoiceId: `seed-invoice-${memberId}`, provider: "test", providerPaymentId: `pay_seed_${safeHash(memberId).slice(0, 12)}`, amountCents: plan.amountCents, currency: "USD", status: seed.subscriptionState === "past_due" ? "failed" : seed.subscriptionState === "refunded" ? "refunded" : "succeeded", failureCode: seed.subscriptionState === "past_due" ? "seed_failed_payment" : undefined, failureMessageSafe: seed.subscriptionState === "past_due" ? "Seed failed payment scenario." : undefined, createdAt: daysFromNow(-3), updatedAt: now, schemaVersion: 1 }));
    }
    const failedMemberId = idFromEmail("seed-member", "suspended@ascendnexus.local");
    upsert(data.paymentRecords, (item) => item.paymentId === "seed-payment-failed-card", (): PaymentRecord => ({ paymentId: "seed-payment-failed-card", memberId: failedMemberId, subscriptionId: `seed-subscription-${failedMemberId}`, invoiceId: `seed-invoice-${failedMemberId}`, provider: "test", providerPaymentId: "pay_seed_failed_card", amountCents: 999, currency: "USD", status: "failed", failureCode: "seed_card_declined", failureMessageSafe: "Seed failed-payment scenario.", createdAt: daysFromNow(-1), updatedAt: now, schemaVersion: 1 }));
    upsert(data.couponRecords, (item) => item.couponId === "seed-coupon-launch50", (existing) => ({ couponId: "seed-coupon-launch50", code: "SEED50", discountType: "percentage", percentOff: 50, duration: "one_time", status: "active", usageLimit: 100, usedCount: 1, startsAt: existing?.startsAt ?? daysFromNow(-30), expiresAt: daysFromNow(30), createdAt: existing?.createdAt ?? now, updatedAt: now, schemaVersion: 1 }));
    upsert(data.refundRecords, (item) => item.refundId === "seed-refund-premium", (existing): RefundRecord => ({ refundId: "seed-refund-premium", memberId: idFromEmail("seed-member", "premium@ascendnexus.local"), paymentId: `seed-payment-${idFromEmail("seed-member", "premium@ascendnexus.local")}`, subscriptionId: `seed-subscription-${idFromEmail("seed-member", "premium@ascendnexus.local")}`, provider: "test", providerRefundId: "refund_seed_premium", amountCents: 999, currency: "USD", status: "succeeded", reason: "Seed refunded payment scenario.", createdBy: systemActor, createdAt: existing?.createdAt ?? now, updatedAt: now, schemaVersion: 1 }));
    upsert(data.giftMemberships, (item) => item.giftId === "seed-gift-vip", (): GiftMembershipRecord => ({ giftId: "seed-gift-vip", purchaserMemberId: idFromEmail("seed-member", "vip@ascendnexus.local"), recipientEmailHash: safeHash("gift-recipient@ascendnexus.local"), billingPlanId: planFor("vip").billingPlanId, redemptionCodeHash: safeHash("seed-gift-redemption"), status: "purchased", purchasedAt: now, expiresAt: daysFromNow(60), schemaVersion: 1 }));
    return count + 4;
  }

  private recordSeedRun(data: MediaDatabaseShape, input: Omit<DevelopmentSeedRunRecord, "seedRunId" | "seedVersion" | "schemaVersion">) {
    data.developmentSeedRuns.push({
      seedRunId: `seed-run-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      seedVersion: developmentSeedVersion,
      schemaVersion: 1,
      ...input,
    });
  }
}

export const developmentSeedService = new DevelopmentSeedService();
