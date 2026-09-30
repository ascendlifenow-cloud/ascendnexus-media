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
  OperationalMetricsSnapshotRecord,
  OperationalReportRecord,
  OptimizationRecommendationRecord,
  MediaTransformationRecord,
  PlatformConnectorRecord,
  PlatformUploadRecord,
  PublishingCalendarEventRecord,
  ReleaseTemplateRecord,
  ReleaseVerificationRecord,
  ReleaseWorkflowRecord,
} from "../../models/operations/OperationsModels";
import { BaseRepository } from "../BaseRepository";

export class ReleaseWorkflowRepository extends BaseRepository<ReleaseWorkflowRecord & Record<string, unknown>> {
  constructor() { super("releaseWorkflows", "workflowId"); }
}

export class PublishingCalendarEventRepository extends BaseRepository<PublishingCalendarEventRecord & Record<string, unknown>> {
  constructor() { super("publishingCalendarEvents", "calendarEventId"); }
}

export class ReleaseTemplateRepository extends BaseRepository<ReleaseTemplateRecord & Record<string, unknown>> {
  constructor() { super("releaseTemplates", "releaseTemplateId"); }
}

export class CampaignScheduleRepository extends BaseRepository<CampaignScheduleRecord & Record<string, unknown>> {
  constructor() { super("campaignSchedules", "campaignId"); }
}

export class ReleaseVerificationRepository extends BaseRepository<ReleaseVerificationRecord & Record<string, unknown>> {
  constructor() { super("releaseVerifications", "verificationId"); }
}

export class ContentLifecycleRepository extends BaseRepository<ContentLifecycleRecord & Record<string, unknown>> {
  constructor() { super("contentLifecycleRecords", "lifecycleId"); }
}

export class OperationalMetricsSnapshotRepository extends BaseRepository<OperationalMetricsSnapshotRecord & Record<string, unknown>> {
  constructor() { super("operationalMetricsSnapshots", "snapshotId"); }
}

export class OptimizationRecommendationRepository extends BaseRepository<OptimizationRecommendationRecord & Record<string, unknown>> {
  constructor() { super("optimizationRecommendations", "recommendationId"); }
}

export class OperationalReportRepository extends BaseRepository<OperationalReportRecord & Record<string, unknown>> {
  constructor() { super("operationalReports", "reportId"); }
}

export class DistributionJobRepository extends BaseRepository<DistributionJobRecord & Record<string, unknown>> {
  constructor() { super("distributionJobs", "distributionJobId"); }
}

export class PlatformConnectorRepository extends BaseRepository<PlatformConnectorRecord & Record<string, unknown>> {
  constructor() { super("platformConnectors", "connectorId"); }
}

export class MediaTransformationRepository extends BaseRepository<MediaTransformationRecord & Record<string, unknown>> {
  constructor() { super("mediaTransformations", "transformationId"); }
}

export class PlatformUploadRepository extends BaseRepository<PlatformUploadRecord & Record<string, unknown>> {
  constructor() { super("platformUploads", "uploadId"); }
}

export class DistributionAnalyticsRepository extends BaseRepository<DistributionAnalyticsRecord & Record<string, unknown>> {
  constructor() { super("distributionAnalytics", "analyticsId"); }
}

export class DistributionAuditEventRepository extends BaseRepository<DistributionAuditEventRecord & Record<string, unknown>> {
  constructor() { super("distributionAuditEvents", "distributionAuditEventId"); }
}

export class ArtistIntelligenceSnapshotRepository extends BaseRepository<ArtistIntelligenceSnapshotRecord & Record<string, unknown>> {
  constructor() { super("artistIntelligenceSnapshots", "intelligenceSnapshotId"); }
}

export class IntelligenceInsightRepository extends BaseRepository<IntelligenceInsightRecord & Record<string, unknown>> {
  constructor() { super("intelligenceInsights", "insightId"); }
}

export class IntelligenceReportRepository extends BaseRepository<IntelligenceReportRecord & Record<string, unknown>> {
  constructor() { super("intelligenceReports", "intelligenceReportId"); }
}

export class GrowthForecastRepository extends BaseRepository<GrowthForecastRecord & Record<string, unknown>> {
  constructor() { super("growthForecasts", "forecastId"); }
}

export const releaseWorkflowRepository = new ReleaseWorkflowRepository();
export const publishingCalendarEventRepository = new PublishingCalendarEventRepository();
export const releaseTemplateRepository = new ReleaseTemplateRepository();
export const campaignScheduleRepository = new CampaignScheduleRepository();
export const releaseVerificationRepository = new ReleaseVerificationRepository();
export const contentLifecycleRepository = new ContentLifecycleRepository();
export const operationalMetricsSnapshotRepository = new OperationalMetricsSnapshotRepository();
export const optimizationRecommendationRepository = new OptimizationRecommendationRepository();
export const operationalReportRepository = new OperationalReportRepository();
export const distributionJobRepository = new DistributionJobRepository();
export const platformConnectorRepository = new PlatformConnectorRepository();
export const mediaTransformationRepository = new MediaTransformationRepository();
export const platformUploadRepository = new PlatformUploadRepository();
export const distributionAnalyticsRepository = new DistributionAnalyticsRepository();
export const distributionAuditEventRepository = new DistributionAuditEventRepository();
export const artistIntelligenceSnapshotRepository = new ArtistIntelligenceSnapshotRepository();
export const intelligenceInsightRepository = new IntelligenceInsightRepository();
export const intelligenceReportRepository = new IntelligenceReportRepository();
export const growthForecastRepository = new GrowthForecastRepository();
