import crypto from "node:crypto";
import type { OperationsPipelineStep, ReleaseWorkflowType } from "../../models/operations/OperationsModels";

export const nowIso = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const asString = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
export const asStringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];

const pipelineStepNames = [
  "Validate Content",
  "Verify Media",
  "Verify Metadata",
  "Verify SEO",
  "Verify Images",
  "Verify Audio Preview",
  "Publish",
  "Update Homepage",
  "Update Artist",
  "Update Search",
  "Update Sitemap",
  "Update RSS",
  "Refresh Cache",
  "Generate Social Posts",
  "Queue Newsletter",
  "Verify Public Site",
  "Record Analytics Baseline",
  "Mark Release Complete",
] as const;

export const buildDefaultPipeline = (): OperationsPipelineStep[] => pipelineStepNames.map((name, index) => ({
  stepId: name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  name,
  status: index === 0 ? "pending" : "pending",
  required: !["Generate Social Posts", "Queue Newsletter", "Update RSS"].includes(name),
  blockingIssues: [],
  warnings: [],
}));

export const releaseWorkflowTypes: ReleaseWorkflowType[] = [
  "single",
  "ep",
  "album",
  "music_video",
  "gallery_collection",
  "blog",
  "news_announcement",
  "playlist",
  "featured_collection",
  "artist_launch",
  "seasonal_event",
  "promotional_campaign",
];
