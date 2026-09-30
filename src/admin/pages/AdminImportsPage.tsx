import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Upload } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminImportApiService } from "../services/AdminExportImportApiService";

export function AdminImportsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const refresh = async () => setJobs(Array.isArray((await adminImportApiService.list()).data) ? (await adminImportApiService.list()).data as Record<string, unknown>[] : []);
  useEffect(() => { void refresh(); }, []);
  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Export / Import" title="Governed Imports" status="ready" description="Inspect, dry-run, execute, verify, and roll back .anmexport packages." actions={<div className="flex gap-2"><Button variant="glass" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Refresh</Button><Button onClick={() => navigate("/admin/imports/new")}><Upload className="h-4 w-4" />Upload Package</Button></div>} />
      <AdminSectionCard title="Import Jobs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-white/45"><tr><th className="p-2">Job</th><th className="p-2">Package</th><th className="p-2">Status</th><th className="p-2">Stage</th></tr></thead>
            <tbody className="divide-y divide-white/10">{jobs.map((job) => <tr key={String(job.importJobId)} className="text-white/72"><td className="p-2 font-mono text-xs">{String(job.importJobId)}</td><td className="p-2">{String(job.packageId)}</td><td className="p-2">{String(job.status)}</td><td className="p-2">{String(job.currentStage)}</td></tr>)}</tbody>
          </table>
        </div>
      </AdminSectionCard>
    </div>
  );
}
