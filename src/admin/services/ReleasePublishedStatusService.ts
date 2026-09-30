import { Archive, AlertTriangle, CheckCircle2, Clock3, CloudUpload, FilePenLine, RefreshCw, Save, ShieldAlert } from "lucide-react";
import type { ComponentType } from "react";
import type { ReleasePublishReadiness, SongReleaseAdminRecord } from "../../models/admin";
import type { ReleasePublishedStatus } from "./releaseEditorTypes";

export interface ReleasePublishedStatusInput {
  release: SongReleaseAdminRecord;
  readiness: ReleasePublishReadiness;
  isDirty: boolean;
  activePublicationAction?: "publish" | "republish" | "archive";
  lastActionSucceeded?: boolean;
}

export type ReleaseStatusSeverity = "neutral" | "info" | "success" | "warning" | "danger";

const getPublicationState = (release: SongReleaseAdminRecord): string | undefined => {
  const value = release.metadata?.publicationState;
  return typeof value === "string" ? value : undefined;
};

const hasRepublishFlag = (release: SongReleaseAdminRecord): boolean =>
  release.metadata?.republishRequired === true || getPublicationState(release) === "ready_to_publish";

const hasPublishedMarker = (release: SongReleaseAdminRecord): boolean =>
  release.status === "published" || release.metadata?.publishedAt !== undefined || getPublicationState(release) === "published";

export class ReleasePublishedStatusService {
  getStatus(input: ReleasePublishedStatusInput): ReleasePublishedStatus {
    const { release, readiness, isDirty, activePublicationAction } = input;
    if (activePublicationAction === "archive") return "archive_pending";
    if (activePublicationAction === "republish") return "republishing";
    if (activePublicationAction === "publish") return "publishing";
    const publicationState = getPublicationState(release);
    if (release.status === "archived" || publicationState === "archived") return "archived";
    if (publicationState === "failed" || release.metadata?.publicationFailed === true) return "publication_failed";
    if (release.metadata?.scheduledAt) return "scheduled";
    if (isDirty && hasPublishedMarker(release)) return "published_with_draft_changes";
    if (isDirty) return "changes_unsaved";
    if (hasRepublishFlag(release)) return "republish_required";
    if (hasPublishedMarker(release)) return "published";
    if (readiness.ready) return "ready_to_publish";
    if (release.status === "draft") return "draft";
    return "changes_saved";
  }

  getDisplayLabel(status: ReleasePublishedStatus): string {
    return {
      draft: "Draft",
      changes_unsaved: "Changes Unsaved",
      changes_saved: "Changes Saved",
      ready_to_publish: "Ready to Publish",
      published: "Published",
      published_with_draft_changes: "Published with Draft Changes",
      scheduled: "Scheduled",
      republish_required: "Republish Required",
      publishing: "Publishing",
      republishing: "Republishing",
      archive_pending: "Archive Pending",
      archived: "Archived",
      publication_failed: "Publication Failed",
      unavailable: "Unavailable",
    }[status];
  }

  getDescription(status: ReleasePublishedStatus): string {
    return {
      draft: "This release is not public yet.",
      changes_unsaved: "Local edits have not been saved.",
      changes_saved: "Latest draft changes are saved.",
      ready_to_publish: "Readiness checks are passing.",
      published: "The current public release is live.",
      published_with_draft_changes: "The public version is live, but this draft has unsaved changes.",
      scheduled: "Publication is scheduled for a future window.",
      republish_required: "Saved draft changes need to be republished.",
      publishing: "Publication is currently running.",
      republishing: "Republishing and verification are in progress.",
      archive_pending: "Archive operation is in progress.",
      archived: "This release is archived and removed from normal public workflows.",
      publication_failed: "The last publication attempt failed.",
      unavailable: "Publication status is unavailable.",
    }[status];
  }

  getStatusIcon(status: ReleasePublishedStatus): ComponentType<{ className?: string; "aria-hidden"?: boolean }> {
    return {
      draft: FilePenLine,
      changes_unsaved: AlertTriangle,
      changes_saved: Save,
      ready_to_publish: CheckCircle2,
      published: CheckCircle2,
      published_with_draft_changes: RefreshCw,
      scheduled: Clock3,
      republish_required: CloudUpload,
      publishing: CloudUpload,
      republishing: RefreshCw,
      archive_pending: Archive,
      archived: Archive,
      publication_failed: ShieldAlert,
      unavailable: AlertTriangle,
    }[status];
  }

  getSeverity(status: ReleasePublishedStatus): ReleaseStatusSeverity {
    if (status === "published" || status === "ready_to_publish" || status === "changes_saved") return "success";
    if (status === "changes_unsaved" || status === "published_with_draft_changes" || status === "republish_required" || status === "scheduled") return "warning";
    if (status === "publication_failed" || status === "unavailable") return "danger";
    if (status === "publishing" || status === "republishing" || status === "archive_pending") return "info";
    return "neutral";
  }

  getAvailableHeaderActions(status: ReleasePublishedStatus): string[] {
    if (status === "archived") return ["open_readiness_panel"];
    if (status === "published" || status === "published_with_draft_changes" || status === "republish_required") return ["open_readiness_panel", "preview"];
    return ["open_readiness_panel"];
  }

  getPublishedAt(release: SongReleaseAdminRecord): string | undefined {
    const value = release.metadata?.publishedAt;
    return typeof value === "string" ? value : undefined;
  }
}

export const releasePublishedStatusService = new ReleasePublishedStatusService();
