import type {
  PublicAssetSyncCheck,
  PublicAssetSyncReport,
  PublicAssetSyncReportStatus,
  PublicAssetSyncSeverity,
  PublicAssetSyncStatus,
} from "../../models/admin";
import { isSafePublicMediaUrl } from "../media/publicSafeUrlUtils";

interface BuildPublicAssetSyncCheckInput extends Omit<PublicAssetSyncCheck, "checkId" | "checkedAt" | "status" | "severity" | "message"> {
  checkId?: string;
  status?: PublicAssetSyncStatus;
  severity?: PublicAssetSyncSeverity;
  message?: string;
}

export const normalizeAssetUrlForComparison = (url: string | null | undefined): string =>
  (url ?? "").trim().replace(/^https?:\/\/localhost:\d+/i, "").replace(/[?#].*$/, "").replace(/\/+$/, "");

export const compareAssetUrls = (expectedUrl: string | null | undefined, actualUrl: string | null | undefined): boolean => {
  const expected = normalizeAssetUrlForComparison(expectedUrl);
  const actual = normalizeAssetUrlForComparison(actualUrl);
  return Boolean(expected && actual && expected === actual);
};

export const isFallbackUrl = (url: string | null | undefined): boolean => {
  const value = (url ?? "").toLowerCase();
  return value.includes("fallback") || value.includes("placeholder") || value.includes("default-cover") || value.includes("default-artist");
};

export const isAssetSyncBlocking = (check: PublicAssetSyncCheck): boolean =>
  check.severity === "blocking" || check.status === "blocked";

export const getExpectedPublicAssetUrl = (url: string | null | undefined): string | undefined =>
  isSafePublicMediaUrl(url) ? url?.trim() : undefined;

export const getActualPublicMappedAssetUrl = (url: string | null | undefined): string | undefined =>
  isSafePublicMediaUrl(url) ? url?.trim() : undefined;

export const formatAssetSyncStatus = (status: PublicAssetSyncStatus): string =>
  status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const buildPublicAssetSyncCheck = (input: BuildPublicAssetSyncCheckInput): PublicAssetSyncCheck => {
  const expectedSafe = !input.expectedUrl || isSafePublicMediaUrl(input.expectedUrl);
  const actualSafe = !input.actualUrl || isSafePublicMediaUrl(input.actualUrl);
  const synced = input.expectedUrl || input.actualUrl ? compareAssetUrls(input.expectedUrl, input.actualUrl) : false;
  const fallback = isFallbackUrl(input.actualUrl) || (!input.actualUrl && isFallbackUrl(input.expectedUrl));
  const status: PublicAssetSyncStatus = input.status ??
    (!expectedSafe || !actualSafe ? "blocked" :
      synced ? "synced" :
        fallback ? "fallback_used" :
          input.expectedUrl && !input.actualUrl ? "missing" :
            input.expectedUrl && input.actualUrl ? "mismatch" :
              "not_applicable");
  const severity: PublicAssetSyncSeverity = input.severity ??
    (status === "blocked" ? "blocking" :
      status === "mismatch" || status === "error" ? "error" :
        status === "missing" || status === "fallback_used" ? "warning" :
          "info");
  const message = input.message ??
    (status === "synced" ? `${input.fieldKey} is synced.` :
      status === "fallback_used" ? `${input.fieldKey} is using a fallback asset.` :
        status === "missing" ? `${input.fieldKey} is missing from public output.` :
          status === "mismatch" ? `${input.fieldKey} public URL does not match expected URL.` :
            status === "blocked" ? `${input.fieldKey} is blocked because an unsafe or private URL would be exposed.` :
              `${input.fieldKey} is not applicable.`);
  return {
    ...input,
    checkId: input.checkId ?? `sync-${input.entityType}-${input.entityId ?? input.publicPath}-${input.fieldKey}`.replace(/[^a-z0-9-_]+/gi, "-"),
    status,
    severity,
    message,
    checkedAt: new Date().toISOString(),
  };
};

export const summarizeAssetSyncChecks = (checks: readonly PublicAssetSyncCheck[]): Omit<PublicAssetSyncReport, "reportId" | "checks" | "createdAt" | "metadata"> => {
  const warningCount = checks.filter((check) => check.severity === "warning").length;
  const errorCount = checks.filter((check) => check.severity === "error").length;
  const blockingCount = checks.filter(isAssetSyncBlocking).length;
  const fallbackCount = checks.filter((check) => check.status === "fallback_used").length;
  const syncedCount = checks.filter((check) => check.status === "synced").length;
  const status: PublicAssetSyncReportStatus = blockingCount
    ? "blocked"
    : errorCount
      ? "failed"
      : warningCount || fallbackCount
        ? "passed_with_warnings"
        : checks.length
          ? "passed"
          : "unknown";
  return {
    status,
    totalChecks: checks.length,
    syncedCount,
    warningCount,
    errorCount,
    blockingCount,
    fallbackCount,
  };
};

