import type { PublicAssetSyncReport } from "../../../models/admin";

interface PublicAssetSyncSummaryCardsProps {
  report: PublicAssetSyncReport;
}

export function PublicAssetSyncSummaryCards({ report }: PublicAssetSyncSummaryCardsProps) {
  const cards = [
    ["Checks", report.totalChecks],
    ["Synced", report.syncedCount],
    ["Warnings", report.warningCount],
    ["Errors", report.errorCount],
    ["Blocking", report.blockingCount],
    ["Fallbacks", report.fallbackCount],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

