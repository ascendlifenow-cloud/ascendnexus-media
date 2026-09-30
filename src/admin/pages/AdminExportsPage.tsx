import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileArchive, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminExportApiService } from "../services/AdminExportImportApiService";

const asRows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value as Record<string, unknown>[] : [];

export function AdminExportsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [health, setHealth] = useState<Record<string, unknown> | undefined>();
  const [error, setError] = useState<string | undefined>();

  const refresh = async () => {
    const [jobResult, healthResult] = await Promise.all([adminExportApiService.list(), adminExportApiService.health()]);
    setJobs(asRows(jobResult.data));
    setHealth(healthResult.data);
    setError([...(jobResult.errors ?? []), ...(healthResult.errors ?? [])][0]);
  };

  useEffect(() => { void refresh(); }, []);

  const download = async (exportJobId: string) => {
    const result = await adminExportApiService.authorizeDownload(exportJobId);
    const ref = typeof result.data?.downloadReference === "string" ? result.data.downloadReference : "";
    if (!ref) return;
    const base = window.location.origin.includes("localhost") ? "" : "";
    window.open(`${base}/api/admin/exports/download/${encodeURIComponent(ref)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Export / Import"
        title="Governed Exports"
        status={health?.overallStatus === "healthy" ? "ready" : "planned"}
        description="Create private, checksummed .anmexport packages for artists, releases, and media library assets."
        actions={<div className="flex gap-2"><Button variant="glass" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Refresh</Button><Button onClick={() => navigate("/admin/exports/new")}><FileArchive className="h-4 w-4" />New Export</Button></div>}
      />
      {error ? <AdminSectionCard title="API Error"><p className="text-sm text-red-100">{error}</p></AdminSectionCard> : null}
      <AdminSectionCard title="Export Jobs" description="Completed packages are private and require short-lived download authorization.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-white/45"><tr><th className="p-2">Job</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Records</th><th className="p-2">Assets</th><th className="p-2">Action</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {jobs.map((job) => (
                <tr key={String(job.exportJobId)} className="text-white/72">
                  <td className="p-2 font-mono text-xs">{String(job.exportJobId)}</td>
                  <td className="p-2">{String(job.packageType)}</td>
                  <td className="p-2">{String(job.status)}</td>
                  <td className="p-2">{Object.values((job.recordCounts ?? {}) as Record<string, number>).reduce((a, b) => a + Number(b), 0)}</td>
                  <td className="p-2">{Object.values((job.assetCounts ?? {}) as Record<string, number>).reduce((a, b) => a + Number(b), 0)}</td>
                  <td className="p-2"><Button size="sm" variant="glass" disabled={job.status !== "completed"} onClick={() => void download(String(job.exportJobId))}><Download className="h-4 w-4" />Authorize</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!jobs.length ? <p className="p-4 text-sm text-white/55">No exports yet.</p> : null}
        </div>
      </AdminSectionCard>
    </div>
  );
}
