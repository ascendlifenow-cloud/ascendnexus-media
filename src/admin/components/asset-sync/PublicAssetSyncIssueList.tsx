import type { PublicAssetSyncCheck } from "../../../models/admin";
import { PublicAssetSyncCheckItem } from "./PublicAssetSyncCheckItem";

interface PublicAssetSyncIssueListProps {
  checks: readonly PublicAssetSyncCheck[];
}

export function PublicAssetSyncIssueList({ checks }: PublicAssetSyncIssueListProps) {
  const issues = checks.filter((check) => check.severity === "blocking" || check.severity === "error" || check.severity === "warning");
  if (!issues.length) return <p className="rounded-md border border-anm-success/25 bg-anm-success/10 p-3 text-sm text-white/66">No sync issues detected.</p>;
  return (
    <div className="grid gap-3">
      {issues.slice(0, 8).map((check) => <PublicAssetSyncCheckItem key={check.checkId} check={check} />)}
    </div>
  );
}

