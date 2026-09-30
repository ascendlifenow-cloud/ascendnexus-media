import type { MediaBatchUploadSession } from "../../../models/media";

export function AdminBatchUploadResultReport({ session }: { session: MediaBatchUploadSession | null }) {
  if (!session || !["completed", "completed_with_errors", "failed", "canceled"].includes(session.status)) return null;
  const uploaded = session.files.filter((file) => file.uploadResult?.mediaAsset);
  const failed = session.files.filter((file) => file.status === "failed" || file.status === "validation_failed");
  return (
    <section className="rounded-md border border-white/10 bg-black/18 p-4 text-sm text-white/68" aria-label="Batch upload result report">
      <h3 className="text-base font-semibold text-white">Batch Result</h3>
      <p className="mt-2">Status: <span className="font-semibold text-white">{session.status.replace(/_/g, " ")}</span></p>
      <p className="mt-1">{uploaded.length} uploaded asset{uploaded.length === 1 ? "" : "s"} are draft, admin-only or explicitly configured, and unassigned by default.</p>
      {failed.length ? <p className="mt-1 text-anm-gold">{failed.length} file{failed.length === 1 ? "" : "s"} remain available for review or retry.</p> : null}
    </section>
  );
}
