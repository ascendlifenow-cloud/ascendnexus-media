import { useState } from "react";
import { Play, SearchCheck, ShieldCheck, Upload } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminImportApiService } from "../services/AdminExportImportApiService";

export function AdminCreateImportPage() {
  const [text, setText] = useState("");
  const [jobId, setJobId] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | undefined>();
  const upload = async () => {
    const parsed = JSON.parse(text);
    const response = await adminImportApiService.upload(parsed);
    setResult(response.data);
    if (typeof response.data?.importJobId === "string") setJobId(response.data.importJobId);
  };
  const inspect = async () => setResult((await adminImportApiService.inspect(jobId)).data);
  const dryRun = async () => setResult((await adminImportApiService.dryRun(jobId, { mode: "create_only", publicationStrategy: "import_as_draft" })).data);
  const execute = async () => setResult((await adminImportApiService.execute(jobId, { mode: "create_only", publicationStrategy: "import_as_draft" })).data);
  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Import" title="Upload Export Package" status="ready" description="Paste a .anmexport JSON package for quarantine, inspection, dry-run, and controlled draft import." />
      <AdminSectionCard title="Package Payload">
        <textarea className="min-h-72 w-full rounded border border-white/10 bg-black/25 p-3 font-mono text-xs text-white" value={text} onChange={(event) => setText(event.target.value)} placeholder="{ manifest, records, assets, checksums }" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void upload()}><Upload className="h-4 w-4" />Upload</Button>
          <Button variant="glass" disabled={!jobId} onClick={() => void inspect()}><SearchCheck className="h-4 w-4" />Inspect</Button>
          <Button variant="glass" disabled={!jobId} onClick={() => void dryRun()}><ShieldCheck className="h-4 w-4" />Dry Run</Button>
          <Button variant="danger" disabled={!jobId} onClick={() => void execute()}><Play className="h-4 w-4" />Execute Draft Import</Button>
        </div>
      </AdminSectionCard>
      {result ? <AdminSectionCard title="Result"><pre className="max-h-96 overflow-auto rounded bg-black/30 p-4 text-xs text-white/70">{JSON.stringify(result, null, 2)}</pre></AdminSectionCard> : null}
    </div>
  );
}
