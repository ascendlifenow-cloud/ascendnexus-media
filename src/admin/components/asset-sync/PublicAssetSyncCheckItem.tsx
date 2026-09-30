import type { PublicAssetSyncCheck } from "../../../models/admin";
import { PublicAssetSyncStatusBadge } from "./PublicAssetSyncStatusBadge";

interface PublicAssetSyncCheckItemProps {
  check: PublicAssetSyncCheck;
}

export function PublicAssetSyncCheckItem({ check }: PublicAssetSyncCheckItemProps) {
  return (
    <div className="rounded-md border border-white/10 bg-black/18 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{check.fieldKey}</p>
          <p className="mt-1 text-xs text-white/48">{check.entityType} / {check.entitySlug ?? check.entityId ?? check.publicPath}</p>
        </div>
        <PublicAssetSyncStatusBadge status={check.status} />
      </div>
      <p className="mt-2 text-sm leading-6 text-white/62">{check.message}</p>
      {(check.expectedUrl || check.actualUrl) ? (
        <dl className="mt-3 grid gap-2 text-xs text-white/48 md:grid-cols-2">
          <div>
            <dt className="uppercase tracking-[0.16em]">Expected</dt>
            <dd className="mt-1 break-all text-white/62">{check.expectedUrl ?? "None"}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.16em]">Actual</dt>
            <dd className="mt-1 break-all text-white/62">{check.actualUrl ?? "None"}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}

