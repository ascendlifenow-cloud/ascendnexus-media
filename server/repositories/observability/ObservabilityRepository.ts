import type {
  AlertPolicyRecord,
  LaunchCertificationDecisionRecord,
  LaunchCertificationEvidenceRecord,
  PerformanceBaselineRecord,
  ReliabilityIncidentRecord,
  ServiceLevelObjectiveRecord,
  SyntheticCheckRecord,
  SyntheticCheckResultRecord,
} from "../../models/observability/ObservabilityModels";
import { BaseRepository } from "../BaseRepository";

export class SyntheticCheckRepository extends BaseRepository<SyntheticCheckRecord & Record<string, unknown>> {
  constructor() { super("syntheticChecks", "checkId"); }
}
export class SyntheticCheckResultRepository extends BaseRepository<SyntheticCheckResultRecord & Record<string, unknown>> {
  constructor() { super("syntheticCheckResults", "syntheticResultId"); }
}
export class AlertPolicyRepository extends BaseRepository<AlertPolicyRecord & Record<string, unknown>> {
  constructor() { super("alertPolicies", "alertPolicyId"); }
}
export class ServiceLevelObjectiveRepository extends BaseRepository<ServiceLevelObjectiveRecord & Record<string, unknown>> {
  constructor() { super("serviceLevelObjectives", "sloId"); }
}
export class ReliabilityIncidentRepository extends BaseRepository<ReliabilityIncidentRecord & Record<string, unknown>> {
  constructor() { super("reliabilityIncidents", "incidentId"); }
}
export class PerformanceBaselineRepository extends BaseRepository<PerformanceBaselineRecord & Record<string, unknown>> {
  constructor() { super("performanceBaselines", "baselineId"); }
}
export class LaunchCertificationEvidenceRepository extends BaseRepository<LaunchCertificationEvidenceRecord & Record<string, unknown>> {
  constructor() { super("launchCertificationEvidence", "evidenceId"); }
}
export class LaunchCertificationDecisionRepository extends BaseRepository<LaunchCertificationDecisionRecord & Record<string, unknown>> {
  constructor() { super("launchCertificationDecisions", "launchCertificationDecisionId"); }
}

export const syntheticCheckRepository = new SyntheticCheckRepository();
export const syntheticCheckResultRepository = new SyntheticCheckResultRepository();
export const alertPolicyRepository = new AlertPolicyRepository();
export const serviceLevelObjectiveRepository = new ServiceLevelObjectiveRepository();
export const reliabilityIncidentRepository = new ReliabilityIncidentRepository();
export const performanceBaselineRepository = new PerformanceBaselineRepository();
export const launchCertificationEvidenceRepository = new LaunchCertificationEvidenceRepository();
export const launchCertificationDecisionRepository = new LaunchCertificationDecisionRepository();
