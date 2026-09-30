import { AlertTriangle } from "lucide-react";
import type { AdminSettingsViewModel } from "../../../models/admin";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { Badge } from "../../../components/ui/Badge";

interface AdminSettingsWarningListProps {
  settings: AdminSettingsViewModel;
}

export function AdminSettingsWarningList({ settings }: AdminSettingsWarningListProps) {
  return (
    <AdminSettingsPanel title="Missing Settings Warnings" description="Readiness warnings for future settings editor workflows.">
      {settings.warnings.length ? (
        <div className="grid gap-2">
          {settings.warnings.slice(0, 16).map((warning) => (
            <div key={warning} className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-black/18 p-3 text-sm text-white/68">
              <AlertTriangle className="h-4 w-4 text-anm-gold" aria-hidden />
              <span>{warning}</span>
              <Badge variant="sunrise" className="ml-auto">warning</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/58">No settings warnings found.</p>
      )}
    </AdminSettingsPanel>
  );
}
