import { AlertTriangle } from "lucide-react";
import type { AdminMetadataRecord } from "../../../models/admin";
import { AdminSectionCard } from "../AdminSectionCard";
import { Badge } from "../../../components/ui/Badge";
import { getMetadataWarnings } from "../../utils/adminMetadataUtils";

interface AdminMetadataWarningPanelProps {
  records: readonly AdminMetadataRecord[];
}

export function AdminMetadataWarningPanel({ records }: AdminMetadataWarningPanelProps) {
  const warnings = getMetadataWarnings(records).slice(0, 12);

  return (
    <AdminSectionCard title="Missing Metadata Warnings" description="Informational scan results for future metadata editor workflows.">
      {warnings.length ? (
        <div className="grid gap-2">
          {warnings.map((warning, index) => (
            <div key={`${warning.metadataRecordId}-${warning.message}-${index}`} className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-black/18 p-3 text-sm text-white/68">
              <AlertTriangle className="h-4 w-4 text-anm-gold" aria-hidden />
              <span className="font-semibold text-white">{warning.entityLabel}</span>
              <span>{warning.message}</span>
              <Badge variant={warning.severity === "warning" ? "sunrise" : "neutral"} className="ml-auto">
                {warning.severity}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/58">No metadata warnings found in the current scan.</p>
      )}
    </AdminSectionCard>
  );
}
