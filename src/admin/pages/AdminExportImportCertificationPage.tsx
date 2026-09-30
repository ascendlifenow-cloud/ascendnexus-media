import { useEffect, useState } from "react";
import { BadgeCheck, PlayCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminExportImportCertificationApiService } from "../services/AdminExportImportApiService";

export function AdminExportImportCertificationPage() {
  const [status, setStatus] = useState<Record<string, unknown> | undefined>();
  const refresh = async () => setStatus((await adminExportImportCertificationApiService.status()).data);
  const run = async () => setStatus((await adminExportImportCertificationApiService.run()).data);
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Certification" title="Export / Import Certification" status={String(status?.decision ?? "incomplete") === "approved_with_conditions" ? "planned" : "ready"} description="Evidence-backed certification for streaming archives, signatures, encryption, advanced import modes, rollback, and production-safe verification." />
      <div className="flex justify-end gap-2">
        <Button variant="glass" onClick={refresh}><BadgeCheck className="h-4 w-4" />Refresh</Button>
        <Button onClick={run}><PlayCircle className="h-4 w-4" />Run Certification</Button>
      </div>
      <AdminSectionCard title="Latest Certification Run">
        <pre className="max-h-[36rem] overflow-auto rounded bg-black/30 p-4 text-xs text-white/70">{JSON.stringify(status, null, 2)}</pre>
      </AdminSectionCard>
    </div>
  );
}
