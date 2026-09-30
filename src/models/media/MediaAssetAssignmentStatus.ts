import type { MediaAssetLink } from "./MediaAssetLink";

export type MediaAssetAssignmentState =
  | "unassigned"
  | "assigned"
  | "multi_assigned"
  | "replaced"
  | "detached"
  | "archived";

export type MediaAssetPublicVisibility = "public" | "not_public" | "admin_only" | "blocked" | "unknown";

export interface MediaAssetAssignmentStatus {
  assetId: string;
  assignmentState: MediaAssetAssignmentState;
  activeLinks: MediaAssetLink[];
  previousLinks: MediaAssetLink[];
  isPubliclyReferenced: boolean;
  publicVisibility: MediaAssetPublicVisibility;
  warnings: string[];
  blockingIssues: string[];
  metadata?: Record<string, string | number | boolean | null>;
}
