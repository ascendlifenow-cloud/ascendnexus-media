import { useState } from "react";
import { Calculator, FileArchive } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { AdminPageHeader, AdminSectionCard } from "../components";
import { adminExportApiService } from "../services/AdminExportImportApiService";

export function AdminCreateExportPage() {
  const [artistIds, setArtistIds] = useState("");
  const [releaseIds, setReleaseIds] = useState("");
  const [mediaAssetIds, setMediaAssetIds] = useState("");
  const [allMedia, setAllMedia] = useState(false);
  const [includeProtected, setIncludeProtected] = useState(false);
  const [encryptPackage, setEncryptPackage] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | undefined>();
  const ids = (value: string) => value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  const body = () => ({
    selection: { artistIds: ids(artistIds), releaseIds: ids(releaseIds), mediaAssetIds: ids(mediaAssetIds), allMedia },
    options: {
      preset: "custom",
      packageVersion: "2.0.0",
      archiveFormat: "tar",
      signPackage: true,
      encryptPackage: encryptPackage || includeProtected,
      encryptionMode: "server_managed_key",
      includeMedia: true,
      includeOriginals: true,
      includeAssignments: true,
      includeReleases: true,
      exportProtectedMedia: includeProtected,
    },
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Export" title="Create Export Package" status="ready" description="Select artists, releases, or media assets. Leave IDs blank and choose full media when backing up the library." />
      <AdminSectionCard title="Selection">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm text-white/70">Artist IDs<textarea className="min-h-28 w-full rounded border border-white/10 bg-black/25 p-3 text-white" value={artistIds} onChange={(event) => setArtistIds(event.target.value)} /></label>
          <label className="space-y-2 text-sm text-white/70">Release IDs<textarea className="min-h-28 w-full rounded border border-white/10 bg-black/25 p-3 text-white" value={releaseIds} onChange={(event) => setReleaseIds(event.target.value)} /></label>
          <label className="space-y-2 text-sm text-white/70">Media Asset IDs<textarea className="min-h-28 w-full rounded border border-white/10 bg-black/25 p-3 text-white" value={mediaAssetIds} onChange={(event) => setMediaAssetIds(event.target.value)} /></label>
        </div>
        <div className="mt-4 rounded border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          Package Version 2 · TAR archive · separate binary entries · Ed25519 signature · AES-256-GCM encryption when protected media is included.
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
          <label><input type="checkbox" checked={allMedia} onChange={(event) => setAllMedia(event.target.checked)} /> Export complete Media Library</label>
          <label><input type="checkbox" checked={includeProtected} onChange={(event) => setIncludeProtected(event.target.checked)} /> Include protected/private binaries</label>
          <label><input type="checkbox" checked={encryptPackage || includeProtected} disabled={includeProtected} onChange={(event) => setEncryptPackage(event.target.checked)} /> Encrypt package</label>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="glass" onClick={async () => setResult((await adminExportApiService.estimate(body())).data)}><Calculator className="h-4 w-4" />Estimate</Button>
          <Button onClick={async () => setResult((await adminExportApiService.create(body())).data)}><FileArchive className="h-4 w-4" />Start Export</Button>
        </div>
      </AdminSectionCard>
      {result ? <AdminSectionCard title="Result"><pre className="max-h-96 overflow-auto rounded bg-black/30 p-4 text-xs text-white/70">{JSON.stringify(result, null, 2)}</pre></AdminSectionCard> : null}
    </div>
  );
}
