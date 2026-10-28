import fs from "node:fs/promises";
import path from "node:path";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { databaseCollections } from "../../database/collectionRegistry";
import { databaseConnectionService } from "../../database/DatabaseConnectionService";
import { stripInternalMongoFields, withDatabaseDefaults } from "../../database/databaseSerialization";
import { applySnapshotChanges, planSnapshotChanges } from "../../database/snapshotChanges";
import type {
  AdminAuditEvent,
  MediaAsset,
  MediaAssetLink,
  MediaAssetVersion,
  MediaPublicationStage,
  MediaPublicationLock,
  MediaPublicationOperation,
  MediaProcessingJob,
  MediaStorageObject,
  MediaUploadJob,
  DirectMediaUploadSession,
} from "../../models/mediaModels";
import type { PublishedContentSyncStatus } from "../../models/public/PublishedContentSyncStatusModel";
import type { AdminUser } from "../../models/auth/AdminUserModel";
import type { AdminSession } from "../../models/auth/AdminSessionModel";
import type { AdminRole } from "../../models/auth/AdminRoleModel";
import type { PasswordResetToken } from "../../models/auth/PasswordResetTokenModel";
import type { AdminActivationToken } from "../../models/auth/AdminActivationTokenModel";
import type { AdminBootstrapState } from "../../models/auth/AdminBootstrapStateModel";
import type { ArtistRecord } from "../../models/artists/ArtistModel";
import type { SongReleaseRecord } from "../../models/releases/SongReleaseModel";
import type { GalleryItemRecord } from "../../models/gallery/GalleryItemModel";
import type { HomepageConfigurationRecord } from "../../models/site/HomepageConfigurationModel";
import type { SiteConfigurationRecord } from "../../models/site/SiteConfigurationModel";
import type { SeoMetadataRecord } from "../../models/metadata/SeoMetadataModel";
import type { SocialMetadataRecord } from "../../models/metadata/SocialMetadataModel";
import type { ContactSubmissionRecord } from "../../models/contact/ContactSubmissionModel";
import type { NewsletterSubscriptionRecord } from "../../models/newsletter/NewsletterSubscriptionModel";
import type { EmailDeliveryRecord } from "../../models/email/EmailDeliveryRecordModel";
import type { PublicActionTokenRecord } from "../../models/forms/PublicActionTokenModel";
import type { ConsentPolicyRecord } from "../../models/analytics/ConsentPolicyModel";
import type { VisitorConsentRecord } from "../../models/analytics/VisitorConsentModel";
import type { AnalyticsEventRecord } from "../../models/analytics/AnalyticsEventModel";
import type { DatabaseMigrationRecord } from "../../models/system/DatabaseMigrationModel";
import type { DatabaseMigrationLock } from "../../models/system/DatabaseMigrationLockModel";
import type { SecurityFindingRecord } from "../../models/security/SecurityFindingModel";
import type { SecurityRiskExceptionRecord } from "../../models/security/SecurityRiskExceptionModel";
import type { SecurityEventRecord } from "../../models/security/SecurityEventModel";
import type { SecurityScanRunRecord } from "../../models/security/SecurityScanRunModel";
import type { DeploymentReleaseRecord } from "../../models/deployment/DeploymentReleaseModel";
import type { DeploymentOperationRecord } from "../../models/deployment/DeploymentOperationModel";
import type { DeploymentVerificationRecord } from "../../models/deployment/DeploymentVerificationModel";
import type { BackupVerificationRecord } from "../../models/deployment/BackupVerificationModel";
import type { PublicRedirectRecord } from "../../models/seo/PublicRedirectModel";
import type { PublishedSlugHistoryRecord } from "../../models/seo/PublishedSlugHistoryModel";
import type { SearchEngineVerificationRecord } from "../../models/seo/SearchEngineVerificationModel";
import type { SearchEngineNotificationRecord } from "../../models/seo/SearchEngineNotificationModel";
import type { SeoVerificationRunRecord } from "../../models/seo/SeoVerificationRunModel";
import type { AlertPolicyRecord, LaunchCertificationDecisionRecord, LaunchCertificationEvidenceRecord, PerformanceBaselineRecord, ReliabilityIncidentRecord, ServiceLevelObjectiveRecord, SyntheticCheckRecord, SyntheticCheckResultRecord } from "../../models/observability/ObservabilityModels";
import type { MemberAccount, MemberPasswordResetToken, MemberSession, MemberVerificationToken } from "../../models/members/MemberModels";
import type {
  AccessOverrideRecord,
  ContentAccessPolicyRecord,
  ContentEntitlementRequirementRecord,
  EntitlementDefinitionRecord,
  MemberAccessHistoryRecord,
  MemberEntitlementGrantRecord,
  MemberMembershipAssignmentRecord,
  MembershipPlanRecord,
  MembershipTierRecord,
  ProtectedMediaAuthorizationRecord,
  TierEntitlementGrantRecord,
} from "../../models/membership/MembershipAccessModels";
import type {
  CampaignScheduleRecord,
  ContentLifecycleRecord,
  DistributionAnalyticsRecord,
  DistributionAuditEventRecord,
  DistributionJobRecord,
  ArtistIntelligenceSnapshotRecord,
  GrowthForecastRecord,
  IntelligenceInsightRecord,
  IntelligenceReportRecord,
  MediaTransformationRecord,
  OperationalMetricsSnapshotRecord,
  OperationalReportRecord,
  OptimizationRecommendationRecord,
  PlatformConnectorRecord,
  PlatformUploadRecord,
  PublishingCalendarEventRecord,
  ReleaseTemplateRecord,
  ReleaseVerificationRecord,
  ReleaseWorkflowRecord,
} from "../../models/operations/OperationsModels";
import type {
  MediaDeliveryProfileRecord,
  ProtectedContentTakedownRecord,
  ProtectedMediaResourceRecord,
  ProtectedPlaybackSessionRecord,
} from "../../models/protectedContent/ProtectedContentModels";
import type { MemberAnnouncementRecord, MemberDashboardConfigurationRecord, MemberRecommendationRecord } from "../../models/memberPortal/MemberPortalModels";
import type {
  MemberCollectionItemRecord,
  MemberCollectionRecord,
  MemberFavoriteRecord,
  MemberFollowRecord,
  MemberNotificationRecord,
  MemberPlaybackHistoryRecord,
  MemberPlaylistItemRecord,
  MemberPlaylistRecord,
  MemberRecommendationFeedbackRecord,
  MemberSavedSearchRecord,
  MemberViewingHistoryRecord,
} from "../../models/memberEngagement/MemberEngagementModels";
import type { MemberAccountFlagRecord, MemberCrmReportRecord, MemberModerationRecord, MemberSupportNoteRecord } from "../../models/memberCrm/MemberCrmModels";
import type { BillingPlanRecord, BillingRevenueSnapshotRecord, BillingWebhookEventRecord, CouponRecord, GiftMembershipRecord, InvoiceRecord, MemberSubscriptionRecord, PaymentMethodRecord, PaymentRecord, PromotionRecord, RefundRecord } from "../../models/billing/BillingModels";
import type { DevelopmentSeedRunRecord } from "../../models/seeding/DevelopmentSeedModels";
import type { MediaIntakeRecord } from "../../models/mediaIntake/MediaIntakeModels";

export interface MediaDatabaseShape {
  mediaAssets: MediaAsset[];
  mediaStorageObjects: MediaStorageObject[];
  mediaUploadJobs: MediaUploadJob[];
  mediaProcessingJobs: MediaProcessingJob[];
  mediaAssetLinks: MediaAssetLink[];
  mediaAssetVersions: MediaAssetVersion[];
  mediaPublicationOperations: MediaPublicationOperation[];
  mediaPublicationLocks: MediaPublicationLock[];
  publishedContentSyncStatuses: PublishedContentSyncStatus[];
  directMediaUploadSessions: DirectMediaUploadSession[];
  mediaIntakeRecords: MediaIntakeRecord[];
  adminAuditEvents: AdminAuditEvent[];
  adminUsers: AdminUser[];
  adminSessions: AdminSession[];
  adminRoles: AdminRole[];
  passwordResetTokens: PasswordResetToken[];
  adminActivationTokens: AdminActivationToken[];
  adminBootstrapStates: AdminBootstrapState[];
  artistRecords: ArtistRecord[];
  releaseRecords: SongReleaseRecord[];
  mediaPublicationStages: MediaPublicationStage[];
  galleryItems: GalleryItemRecord[];
  homepageConfigurations: HomepageConfigurationRecord[];
  siteConfigurations: SiteConfigurationRecord[];
  seoMetadataRecords: SeoMetadataRecord[];
  socialMetadataRecords: SocialMetadataRecord[];
  contactSubmissions: ContactSubmissionRecord[];
  newsletterSubscriptions: NewsletterSubscriptionRecord[];
  publicActionTokens: PublicActionTokenRecord[];
  emailDeliveryRecords: EmailDeliveryRecord[];
  consentPolicyRecords: ConsentPolicyRecord[];
  visitorConsentRecords: VisitorConsentRecord[];
  analyticsEventRecords: AnalyticsEventRecord[];
  databaseMigrations: DatabaseMigrationRecord[];
  databaseMigrationLocks: DatabaseMigrationLock[];
  securityFindings: SecurityFindingRecord[];
  securityRiskExceptions: SecurityRiskExceptionRecord[];
  securityEvents: SecurityEventRecord[];
  securityScanRuns: SecurityScanRunRecord[];
  deploymentReleases: DeploymentReleaseRecord[];
  deploymentOperations: DeploymentOperationRecord[];
  deploymentVerifications: DeploymentVerificationRecord[];
  backupVerifications: BackupVerificationRecord[];
  publicRedirects: PublicRedirectRecord[];
  publishedSlugHistory: PublishedSlugHistoryRecord[];
  searchEngineVerifications: SearchEngineVerificationRecord[];
  searchEngineNotifications: SearchEngineNotificationRecord[];
  seoVerificationRuns: SeoVerificationRunRecord[];
  syntheticChecks: SyntheticCheckRecord[];
  syntheticCheckResults: SyntheticCheckResultRecord[];
  alertPolicies: AlertPolicyRecord[];
  serviceLevelObjectives: ServiceLevelObjectiveRecord[];
  reliabilityIncidents: ReliabilityIncidentRecord[];
  performanceBaselines: PerformanceBaselineRecord[];
  launchCertificationEvidence: LaunchCertificationEvidenceRecord[];
  launchCertificationDecisions: LaunchCertificationDecisionRecord[];
  releaseWorkflows: ReleaseWorkflowRecord[];
  publishingCalendarEvents: PublishingCalendarEventRecord[];
  releaseTemplates: ReleaseTemplateRecord[];
  campaignSchedules: CampaignScheduleRecord[];
  releaseVerifications: ReleaseVerificationRecord[];
  contentLifecycleRecords: ContentLifecycleRecord[];
  operationalMetricsSnapshots: OperationalMetricsSnapshotRecord[];
  optimizationRecommendations: OptimizationRecommendationRecord[];
  operationalReports: OperationalReportRecord[];
  distributionJobs: DistributionJobRecord[];
  platformConnectors: PlatformConnectorRecord[];
  mediaTransformations: MediaTransformationRecord[];
  platformUploads: PlatformUploadRecord[];
  distributionAnalytics: DistributionAnalyticsRecord[];
  distributionAuditEvents: DistributionAuditEventRecord[];
  artistIntelligenceSnapshots: ArtistIntelligenceSnapshotRecord[];
  intelligenceInsights: IntelligenceInsightRecord[];
  intelligenceReports: IntelligenceReportRecord[];
  growthForecasts: GrowthForecastRecord[];
  memberAccounts: MemberAccount[];
  memberSessions: MemberSession[];
  memberVerificationTokens: MemberVerificationToken[];
  memberPasswordResetTokens: MemberPasswordResetToken[];
  membershipTiers: MembershipTierRecord[];
  membershipPlans: MembershipPlanRecord[];
  entitlementDefinitions: EntitlementDefinitionRecord[];
  tierEntitlementGrants: TierEntitlementGrantRecord[];
  memberMembershipAssignments: MemberMembershipAssignmentRecord[];
  memberEntitlementGrants: MemberEntitlementGrantRecord[];
  accessOverrides: AccessOverrideRecord[];
  contentAccessPolicies: ContentAccessPolicyRecord[];
  contentEntitlementRequirements: ContentEntitlementRequirementRecord[];
  protectedMediaAuthorizations: ProtectedMediaAuthorizationRecord[];
  memberAccessHistory: MemberAccessHistoryRecord[];
  mediaDeliveryProfiles: MediaDeliveryProfileRecord[];
  protectedMediaResources: ProtectedMediaResourceRecord[];
  protectedPlaybackSessions: ProtectedPlaybackSessionRecord[];
  protectedContentTakedowns: ProtectedContentTakedownRecord[];
  memberDashboardConfigurations: MemberDashboardConfigurationRecord[];
  memberRecommendations: MemberRecommendationRecord[];
  memberAnnouncements: MemberAnnouncementRecord[];
  memberFavorites: MemberFavoriteRecord[];
  memberFollows: MemberFollowRecord[];
  memberPlaylists: MemberPlaylistRecord[];
  memberPlaylistItems: MemberPlaylistItemRecord[];
  memberPlaybackHistory: MemberPlaybackHistoryRecord[];
  memberViewingHistory: MemberViewingHistoryRecord[];
  memberNotifications: MemberNotificationRecord[];
  memberRecommendationFeedback: MemberRecommendationFeedbackRecord[];
  memberSavedSearches: MemberSavedSearchRecord[];
  memberCollections: MemberCollectionRecord[];
  memberCollectionItems: MemberCollectionItemRecord[];
  memberSupportNotes: MemberSupportNoteRecord[];
  memberAccountFlags: MemberAccountFlagRecord[];
  memberModerationRecords: MemberModerationRecord[];
  memberCrmReports: MemberCrmReportRecord[];
  billingPlans: BillingPlanRecord[];
  memberSubscriptions: MemberSubscriptionRecord[];
  paymentMethods: PaymentMethodRecord[];
  paymentRecords: PaymentRecord[];
  invoiceRecords: InvoiceRecord[];
  refundRecords: RefundRecord[];
  couponRecords: CouponRecord[];
  promotionRecords: PromotionRecord[];
  giftMemberships: GiftMembershipRecord[];
  billingWebhookEvents: BillingWebhookEventRecord[];
  billingRevenueSnapshots: BillingRevenueSnapshotRecord[];
  developmentSeedRuns: DevelopmentSeedRunRecord[];
}

type DatabaseCollectionRecord<K extends keyof MediaDatabaseShape> = MediaDatabaseShape[K] extends Array<infer T> ? T : never;

const emptyDatabase = (): MediaDatabaseShape => ({
  mediaAssets: [],
  mediaStorageObjects: [],
  mediaUploadJobs: [],
  mediaProcessingJobs: [],
  mediaAssetLinks: [],
  mediaAssetVersions: [],
  mediaPublicationOperations: [],
  mediaPublicationLocks: [],
  publishedContentSyncStatuses: [],
  directMediaUploadSessions: [],
  mediaIntakeRecords: [],
  adminAuditEvents: [],
  adminUsers: [],
  adminSessions: [],
  adminRoles: [],
  passwordResetTokens: [],
  adminActivationTokens: [],
  adminBootstrapStates: [],
  artistRecords: [],
  releaseRecords: [],
  mediaPublicationStages: [],
  galleryItems: [],
  homepageConfigurations: [],
  siteConfigurations: [],
  seoMetadataRecords: [],
  socialMetadataRecords: [],
  contactSubmissions: [],
  newsletterSubscriptions: [],
  publicActionTokens: [],
  emailDeliveryRecords: [],
  consentPolicyRecords: [],
  visitorConsentRecords: [],
  analyticsEventRecords: [],
  databaseMigrations: [],
  databaseMigrationLocks: [],
  securityFindings: [],
  securityRiskExceptions: [],
  securityEvents: [],
  securityScanRuns: [],
  deploymentReleases: [],
  deploymentOperations: [],
  deploymentVerifications: [],
  backupVerifications: [],
  publicRedirects: [],
  publishedSlugHistory: [],
  searchEngineVerifications: [],
  searchEngineNotifications: [],
  seoVerificationRuns: [],
  syntheticChecks: [],
  syntheticCheckResults: [],
  alertPolicies: [],
  serviceLevelObjectives: [],
  reliabilityIncidents: [],
  performanceBaselines: [],
  launchCertificationEvidence: [],
  launchCertificationDecisions: [],
  releaseWorkflows: [],
  publishingCalendarEvents: [],
  releaseTemplates: [],
  campaignSchedules: [],
  releaseVerifications: [],
  contentLifecycleRecords: [],
  operationalMetricsSnapshots: [],
  optimizationRecommendations: [],
  operationalReports: [],
  distributionJobs: [],
  platformConnectors: [],
  mediaTransformations: [],
  platformUploads: [],
  distributionAnalytics: [],
  distributionAuditEvents: [],
  artistIntelligenceSnapshots: [],
  intelligenceInsights: [],
  intelligenceReports: [],
  growthForecasts: [],
  memberAccounts: [],
  memberSessions: [],
  memberVerificationTokens: [],
  memberPasswordResetTokens: [],
  membershipTiers: [],
  membershipPlans: [],
  entitlementDefinitions: [],
  tierEntitlementGrants: [],
  memberMembershipAssignments: [],
  memberEntitlementGrants: [],
  accessOverrides: [],
  contentAccessPolicies: [],
  contentEntitlementRequirements: [],
  protectedMediaAuthorizations: [],
  memberAccessHistory: [],
  mediaDeliveryProfiles: [],
  protectedMediaResources: [],
  protectedPlaybackSessions: [],
  protectedContentTakedowns: [],
  memberDashboardConfigurations: [],
  memberRecommendations: [],
  memberAnnouncements: [],
  memberFavorites: [],
  memberFollows: [],
  memberPlaylists: [],
  memberPlaylistItems: [],
  memberPlaybackHistory: [],
  memberViewingHistory: [],
  memberNotifications: [],
  memberRecommendationFeedback: [],
  memberSavedSearches: [],
  memberCollections: [],
  memberCollectionItems: [],
  memberSupportNotes: [],
  memberAccountFlags: [],
  memberModerationRecords: [],
  memberCrmReports: [],
  billingPlans: [],
  memberSubscriptions: [],
  paymentMethods: [],
  paymentRecords: [],
  invoiceRecords: [],
  refundRecords: [],
  couponRecords: [],
  promotionRecords: [],
  giftMemberships: [],
  billingWebhookEvents: [],
  billingRevenueSnapshots: [],
  developmentSeedRuns: [],
});

export class JsonDatabase {
  private cache: MediaDatabaseShape | null = null;
  private readonly filePath = path.join(mediaBackendConfig.dataRoot, "media-db.json");
  private readonly useMongo = () => databaseConnectionService.isConfigured();

  async read(): Promise<MediaDatabaseShape> {
    if (this.useMongo()) return this.readMongo();
    if (this.cache) return this.cache;
    await fs.mkdir(mediaBackendConfig.dataRoot, { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.cache = { ...emptyDatabase(), ...JSON.parse(raw) };
    } catch {
      this.cache = emptyDatabase();
      await this.write(this.cache);
    }
    return this.cache;
  }

  async write(data: MediaDatabaseShape): Promise<MediaDatabaseShape> {
    if (this.useMongo()) return this.writeMongo(data);
    await fs.mkdir(mediaBackendConfig.dataRoot, { recursive: true });
    this.cache = data;
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    return data;
  }

  async update(mutator: (data: MediaDatabaseShape) => void | Promise<void>): Promise<MediaDatabaseShape> {
    if (this.useMongo()) {
      const before = await this.readMongo();
      const data = structuredClone(before);
      await mutator(data);
      const changes = planSnapshotChanges(before as never, data as never);
      if (changes.length) {
        const db = await databaseConnectionService.getDb();
        await databaseConnectionService.withSession(async (session) => {
          await session.withTransaction(async () => {
            await applySnapshotChanges(db, session, changes);
          });
        });
      }
      return data;
    }
    const data = await this.read();
    await mutator(data);
    return this.write(data);
  }

  async getPersistenceMode(): Promise<"mongodb" | "local_json"> {
    return this.useMongo() ? "mongodb" : "local_json";
  }

  async listCollection<K extends keyof MediaDatabaseShape>(property: K): Promise<MediaDatabaseShape[K]> {
    if (!this.useMongo()) return (await this.read())[property];
    const definition = databaseCollections.find((item) => item.property === property);
    if (!definition) return [] as unknown as MediaDatabaseShape[K];
    const db = await databaseConnectionService.getDb();
    const records = (await db.collection(definition.collectionName).find({}).toArray()).map(stripInternalMongoFields);
    return records as MediaDatabaseShape[K];
  }

  async findCollectionRecord<K extends keyof MediaDatabaseShape>(property: K, filter: Record<string, unknown>): Promise<DatabaseCollectionRecord<K> | null> {
    if (!this.useMongo()) {
      const records = (await this.read())[property] as DatabaseCollectionRecord<K>[];
      return records.find((record) => Object.entries(filter).every(([key, value]) => (record as Record<string, unknown>)[key] === value)) ?? null;
    }
    const definition = databaseCollections.find((item) => item.property === property);
    if (!definition) return null;
    const db = await databaseConnectionService.getDb();
    const record = await db.collection(definition.collectionName).findOne(filter);
    return record ? stripInternalMongoFields(record) as DatabaseCollectionRecord<K> : null;
  }

  async insertCollectionRecord<K extends keyof MediaDatabaseShape>(property: K, record: DatabaseCollectionRecord<K>): Promise<DatabaseCollectionRecord<K>> {
    if (!this.useMongo()) {
      await this.update((data) => {
        (data[property] as DatabaseCollectionRecord<K>[]).push(record);
      });
      return record;
    }
    const definition = databaseCollections.find((item) => item.property === property);
    if (!definition) throw new Error(`Unknown database collection: ${String(property)}`);
    const db = await databaseConnectionService.getDb();
    const persisted = withDatabaseDefaults(record as Record<string, unknown>);
    await db.collection(definition.collectionName).insertOne(persisted);
    return stripInternalMongoFields(persisted) as DatabaseCollectionRecord<K>;
  }

  async patchCollectionRecord<K extends keyof MediaDatabaseShape>(property: K, filter: Record<string, unknown>, patch: Partial<DatabaseCollectionRecord<K>>): Promise<DatabaseCollectionRecord<K> | null> {
    const patchEntries = Object.entries(patch as Record<string, unknown>);
    const nextPatch = Object.fromEntries(patchEntries.filter(([, value]) => value !== undefined));
    nextPatch.updatedAt = new Date().toISOString();
    const unset = Object.fromEntries(patchEntries.filter(([, value]) => value === undefined).map(([key]) => [key, ""]));
    if (!this.useMongo()) {
      let updated: DatabaseCollectionRecord<K> | null = null;
      await this.update((data) => {
        const records = data[property] as DatabaseCollectionRecord<K>[];
        const record = records.find((item) => Object.entries(filter).every(([key, value]) => (item as Record<string, unknown>)[key] === value));
        if (record) {
          Object.assign(record as Record<string, unknown>, nextPatch);
          for (const key of Object.keys(unset)) delete (record as Record<string, unknown>)[key];
          updated = record;
        }
      });
      return updated;
    }
    const definition = databaseCollections.find((item) => item.property === property);
    if (!definition) return null;
    const db = await databaseConnectionService.getDb();
    const update = Object.keys(unset).length ? { $set: nextPatch, $unset: unset } : { $set: nextPatch };
    const record = await db.collection(definition.collectionName).findOneAndUpdate(filter, update, { returnDocument: "after" });
    return record ? stripInternalMongoFields(record) as DatabaseCollectionRecord<K> : null;
  }

  async patchCollectionRecords<K extends keyof MediaDatabaseShape>(property: K, filter: Record<string, unknown>, patch: Partial<DatabaseCollectionRecord<K>>): Promise<number> {
    const patchEntries = Object.entries(patch as Record<string, unknown>);
    const nextPatch = Object.fromEntries(patchEntries.filter(([, value]) => value !== undefined));
    nextPatch.updatedAt = new Date().toISOString();
    const unset = Object.fromEntries(patchEntries.filter(([, value]) => value === undefined).map(([key]) => [key, ""]));
    if (!this.useMongo()) {
      let count = 0;
      await this.update((data) => {
        for (const record of data[property] as DatabaseCollectionRecord<K>[]) {
          if (Object.entries(filter).every(([key, value]) => (record as Record<string, unknown>)[key] === value)) {
            Object.assign(record as Record<string, unknown>, nextPatch);
            for (const key of Object.keys(unset)) delete (record as Record<string, unknown>)[key];
            count += 1;
          }
        }
      });
      return count;
    }
    const definition = databaseCollections.find((item) => item.property === property);
    if (!definition) return 0;
    const db = await databaseConnectionService.getDb();
    const update = Object.keys(unset).length ? { $set: nextPatch, $unset: unset } : { $set: nextPatch };
    return (await db.collection(definition.collectionName).updateMany(filter, update)).modifiedCount;
  }

  private async readMongo(): Promise<MediaDatabaseShape> {
    const db = await databaseConnectionService.getDb();
    const next = emptyDatabase() as unknown as Record<string, unknown[]>;
    const batchSize = 12;
    for (let index = 0; index < databaseCollections.length; index += batchSize) {
      const batch = databaseCollections.slice(index, index + batchSize);
      const results = await Promise.all(batch.map(async (collectionDef) => ({
        property: collectionDef.property,
        records: (await db.collection(collectionDef.collectionName).find({}).toArray()).map(stripInternalMongoFields),
      })));
      for (const result of results) next[result.property] = result.records;
    }
    return next as unknown as MediaDatabaseShape;
  }

  private async writeMongo(data: MediaDatabaseShape): Promise<MediaDatabaseShape> {
    const db = await databaseConnectionService.getDb();
    for (const collectionDef of databaseCollections) {
      const records = ((data as unknown as Record<string, Array<Record<string, unknown>>>)[collectionDef.property] ?? []).map((record) => withDatabaseDefaults(record));
      const collection = db.collection(collectionDef.collectionName);
      const currentIds = records.map((record) => record[collectionDef.applicationId]).filter(Boolean);
      if (currentIds.length) {
        await collection.deleteMany({ [collectionDef.applicationId]: { $nin: currentIds } });
      } else {
        await collection.deleteMany({});
      }
      if (records.length) {
        await collection.bulkWrite(records.map((record) => ({
          replaceOne: {
            filter: { [collectionDef.applicationId]: record[collectionDef.applicationId] },
            replacement: record,
            upsert: true,
          },
        })), { ordered: true });
      }
    }
    return data;
  }
}

export const jsonDatabase = new JsonDatabase();
