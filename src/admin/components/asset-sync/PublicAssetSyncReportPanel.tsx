import { useState } from "react";
import type { PublicAssetSyncReport } from "../../../models/admin";
import { Card } from "../../../components/ui/Card";
import { publicAssetSyncVerificationService } from "../../../services/admin";
import { PublicAssetSyncCheckList } from "./PublicAssetSyncCheckList";
import { PublicAssetSyncIssueList } from "./PublicAssetSyncIssueList";
import { PublicAssetSyncRunButton } from "./PublicAssetSyncRunButton";
import { PublicAssetSyncStatusBadge } from "./PublicAssetSyncStatusBadge";
import { PublicAssetSyncSummaryCards } from "./PublicAssetSyncSummaryCards";

export function PublicAssetSyncReportPanel() {
  const [report, setReport] = useState<PublicAssetSyncReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runReport = async () => {
    setIsRunning(true);
    const nextReport = await publicAssetSyncVerificationService.runFullPublicAssetSyncCheck();
    setReport(nextReport);
    setIsRunning(false);
  };

  return (
    <Card as="section" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Public Asset Sync Verification</h2>
          <p className="mt-1 text-sm leading-6 text-white/54">Verify public-safe uploaded assets across homepage, artists, releases, gallery, metadata, and site branding.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report ? <PublicAssetSyncStatusBadge status={report.blockingCount ? "blocked" : report.errorCount ? "error" : report.warningCount ? "fallback_used" : "synced"} /> : null}
          <PublicAssetSyncRunButton isRunning={isRunning} onRun={() => void runReport()} />
        </div>
      </div>
      {report ? (
        <div className="mt-5 grid gap-5">
          <PublicAssetSyncSummaryCards report={report} />
          <div>
            <h3 className="text-base font-semibold text-white">Issues</h3>
            <div className="mt-3">
              <PublicAssetSyncIssueList checks={report.checks} />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">All Checks</h3>
            <div className="mt-3">
              <PublicAssetSyncCheckList checks={report.checks} />
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-white/10 bg-black/18 p-3 text-sm text-white/56">Run a verification report to compare expected uploaded assets against public mapped URLs.</p>
      )}
    </Card>
  );
}

