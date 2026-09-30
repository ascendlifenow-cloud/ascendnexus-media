import crypto from "node:crypto";
import type { AnalyticsEventRecord } from "../../models/analytics/AnalyticsEventModel";
import type { DistributionAnalyticsRecord } from "../../models/operations/OperationsModels";

export const nowIso = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const metric = (records: DistributionAnalyticsRecord[], key: keyof DistributionAnalyticsRecord["metrics"]) =>
  records.reduce((sum, record) => sum + (typeof record.metrics[key] === "number" ? record.metrics[key] as number : 0), 0);

export const eventCount = (events: AnalyticsEventRecord[], predicate: (event: AnalyticsEventRecord) => boolean = () => true) =>
  events.filter(predicate).length;

export const scoreRelease = (releaseId: string, events: AnalyticsEventRecord[], analytics: DistributionAnalyticsRecord[]) => {
  const eventScore = eventCount(events, (event) => event.entityId === releaseId) * 2;
  const platformScore = analytics.filter((item) => item.distributionJobId?.includes(releaseId) || item.metadata?.releaseId === releaseId).reduce((sum, item) => sum + metric([item], "views") + metric([item], "streams") * 2 + metric([item], "likes"), 0);
  return eventScore + platformScore;
};

export const trendLabel = (current: number, previous: number) => {
  if (previous === 0 && current > 0) return "new_growth";
  if (current > previous * 1.25) return "growing";
  if (current < previous * 0.75) return "declining";
  return "stable";
};

export const periodRange = (period: "day" | "week" | "month" | "quarter" | "year" | "lifetime" = "week") => {
  const end = new Date();
  const start = new Date(end);
  if (period === "day") start.setDate(start.getDate() - 1);
  else if (period === "month") start.setMonth(start.getMonth() - 1);
  else if (period === "quarter") start.setMonth(start.getMonth() - 3);
  else if (period === "year") start.setFullYear(start.getFullYear() - 1);
  else if (period === "lifetime") start.setFullYear(2000);
  else start.setDate(start.getDate() - 7);
  return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
};
