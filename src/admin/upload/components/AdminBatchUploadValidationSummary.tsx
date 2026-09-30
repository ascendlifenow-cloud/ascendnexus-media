import type { MediaBatchUploadSession } from "../../../models/media";

export function AdminBatchUploadValidationSummary({ session, lastError }: { session: MediaBatchUploadSession | null; lastError?: string | null }) {
  const invalid = session?.files.filter((file) => file.status === "validation_failed" || file.errors?.length) ?? [];
  const warnings = session?.files.flatMap((file) => file.warnings ?? []) ?? [];
  if (!lastError && !invalid.length && !warnings.length) return null;

  return (
    <section className="grid gap-2 rounded-md border border-anm-gold/25 bg-anm-gold/8 p-3 text-sm" aria-live="polite">
      {lastError ? <p className="font-semibold text-anm-pink">{lastError}</p> : null}
      {invalid.length ? (
        <div>
          <p className="font-semibold text-anm-pink">{invalid.length} file{invalid.length === 1 ? "" : "s"} need attention before upload.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/68">
            {invalid.slice(0, 4).map((file) => (
              <li key={file.batchFileId}>{file.fileName}: {(file.errors ?? ["Validation failed."])[0]}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length ? <p className="text-anm-gold">{[...new Set(warnings)].slice(0, 2).join(" ")}</p> : null}
    </section>
  );
}
