export function MediaReviewBulkActions({
  selectedCount,
  onBulkKeep,
  onBulkArchive,
}: {
  selectedCount: number;
  onBulkKeep: () => void;
  onBulkArchive: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-black/18 p-3">
      <span className="text-sm text-white/58">{selectedCount} selected</span>
      <button type="button" className="min-h-10 rounded-md border border-white/12 px-3 text-sm font-semibold text-white disabled:opacity-40" disabled={!selectedCount} onClick={onBulkKeep}>Keep Unassigned</button>
      <button type="button" className="min-h-10 rounded-md border border-white/12 px-3 text-sm font-semibold text-white disabled:opacity-40" disabled={!selectedCount} onClick={onBulkArchive}>Archive Selected</button>
      <button type="button" className="min-h-10 rounded-md border border-white/12 px-3 text-sm font-semibold text-white opacity-60" disabled>Bulk Assign</button>
    </div>
  );
}
