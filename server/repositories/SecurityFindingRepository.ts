import type { SecurityFindingRecord } from "../models/security/SecurityFindingModel";
import type { SecurityRiskExceptionRecord } from "../models/security/SecurityRiskExceptionModel";
import type { SecurityEventRecord } from "../models/security/SecurityEventModel";
import type { SecurityScanRunRecord } from "../models/security/SecurityScanRunModel";
import { BaseRepository } from "./BaseRepository";

export class SecurityFindingRepository extends BaseRepository<SecurityFindingRecord & Record<string, unknown>> {
  constructor() { super("securityFindings", "findingId"); }

  async listOpenBySeverity(severity: SecurityFindingRecord["severity"]) {
    return (await this.list({ includeArchived: true })).filter((finding) => finding.severity === severity && !["mitigated", "false_positive", "archived"].includes(finding.status));
  }
}

export class SecurityRiskExceptionRepository extends BaseRepository<SecurityRiskExceptionRecord & Record<string, unknown>> {
  constructor() { super("securityRiskExceptions", "exceptionId"); }

  async listActive() {
    const now = new Date().toISOString();
    return (await this.list({ includeArchived: true })).filter((exception) => exception.status === "approved" && exception.expiresAt > now);
  }
}

export class SecurityEventRepository extends BaseRepository<SecurityEventRecord & Record<string, unknown>> {
  constructor() { super("securityEvents", "securityEventId"); }
}

export class SecurityScanRunRepository extends BaseRepository<SecurityScanRunRecord & Record<string, unknown>> {
  constructor() { super("securityScanRuns", "scanRunId"); }
}

export const securityFindingRepository = new SecurityFindingRepository();
export const securityRiskExceptionRepository = new SecurityRiskExceptionRepository();
export const securityEventRepository = new SecurityEventRepository();
export const securityScanRunRepository = new SecurityScanRunRepository();
