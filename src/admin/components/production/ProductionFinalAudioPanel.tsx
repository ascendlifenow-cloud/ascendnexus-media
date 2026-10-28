import { useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderSearch, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { adminMediaKeys, adminReleasesKeys } from "../../../utils/admin/adminQueryKeys";
import { adminApiBase } from "../../services/AdminAuthApiService";
import { AdminRightShelf } from "../AdminRightShelf";
import { dispatchMediaAssignmentChanged } from "../../../services/media/MediaAssignmentEvents";

interface Props {
  releaseId: string;
  bundleHash: string;
  onSaved: () => void;
}

interface Candidate {
  assetId: string;
  title: string;
  mimeType: string;
  fileSizeBytes: number;
}

async function readData(response: Response, message: string): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.success !== true || !payload.data) {
    throw new Error(message);
  }
  return payload.data;
}

function isCandidate(value: unknown): value is Candidate {
  if (!value || typeof value !== "object") return false;
  const item = value as Candidate;
  return typeof item.assetId === "string" && typeof item.title === "string"
    && typeof item.mimeType === "string" && typeof item.fileSizeBytes === "number"
    && Number.isFinite(item.fileSizeBytes) && item.fileSizeBytes >= 0;
}

export function ProductionFinalAudioPanel(props: Props) {
  return <FinalAudioPanel key={props.releaseId} {...props} />;
}

function FinalAudioPanel({ releaseId, bundleHash, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [savedRevision, setSavedRevision] = useState<number>();
  const searchId = useId();
  const attempt = useRef<{ assetId: string; bundleHash: string; requestId: string } | undefined>(undefined);
  const queryClient = useQueryClient();
  const endpoint = `${adminApiBase()}/api/admin/releases/${encodeURIComponent(releaseId)}`;
  const candidates = useQuery({
    queryKey: [...adminReleasesKeys.detail(releaseId), "production-audio-candidates", bundleHash],
    enabled: open,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    meta: { persist: false },
    queryFn: async ({ signal }): Promise<Candidate[]> => {
      const message = "Audio candidates could not load. Please retry.";
      const response = await fetch(`${endpoint}/production-audio-candidates`, {
        credentials: "include", cache: "no-store", signal,
      });
      const data = await readData(response, message) as { items?: unknown; limit?: unknown };
      if (!Array.isArray(data.items) || data.limit !== 100 || !data.items.every(isCandidate)) {
        throw new Error(message);
      }
      return data.items;
    },
  });
  const save = useMutation({
    retry: false,
    mutationFn: async (assetId: string): Promise<number> => {
      const message = "Audio candidate could not be saved. Please retry or refresh the release review.";
      if (attempt.current?.assetId !== assetId || attempt.current.bundleHash !== bundleHash) attempt.current = { assetId, bundleHash, requestId: crypto.randomUUID() };
      const response = await fetch(`${endpoint}/production-final-audio`, {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, expectedBundleHash: bundleHash, requestId: attempt.current.requestId }),
      });
      const data = await readData(response, message) as { revision?: unknown; reused?: unknown };
      if (typeof data.revision !== "number" || !Number.isSafeInteger(data.revision)
        || data.revision < 0 || typeof data.reused !== "boolean") throw new Error(message);
      return data.revision;
    },
    onSuccess: (revision, assetId) => {
      setSavedRevision(revision);
      setOpen(false);
      setSelectedId(undefined);
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
      dispatchMediaAssignmentChanged({ assetId, entityType: "release", entityId: releaseId, fieldKey: "fullSongUrl", source: "system" });
      onSaved();
    },
  });
  const matches = (candidates.data ?? []).filter((item) =>
    `${item.title} ${item.mimeType}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const canSave = !candidates.isFetching && !candidates.isError
    && matches.some((item) => item.assetId === selectedId) && !save.isPending;
  const buttonClass = "anm-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 hover:border-anm-gold/45 disabled:cursor-not-allowed disabled:opacity-50";

  return <section className="border-t border-white/15 py-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-white">Private final audio candidate</h2>
      <button type="button" title="Choose audio candidate" aria-label="Choose audio candidate"
        className={`${buttonClass} h-10 w-10 shrink-0 p-0`} onClick={() => {
          save.reset(); setFilter(""); setSelectedId(undefined); setOpen(true);
        }}>
        <FolderSearch className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
    {savedRevision !== undefined ? <p role="status" className="mt-2 text-sm text-emerald-200">Audio candidate saved. Revision {savedRevision}.</p> : null}
    <Link to="/admin/media" className="anm-focus mt-2 inline-block text-sm text-anm-blue underline">Upload in Media Library</Link>
    {open ? <AdminRightShelf open={open} title="Private final audio candidate"
      onClose={() => { if (!save.isPending) setOpen(false); }}>
      <div className="grid gap-4">
        <Link to="/admin/media" className={`anm-focus text-sm text-anm-blue underline ${save.isPending ? "pointer-events-none" : ""}`}
          aria-disabled={save.isPending} tabIndex={save.isPending ? -1 : undefined}>Upload in Media Library</Link>
        <div className="grid gap-2">
          <label htmlFor={searchId} className="text-sm text-white/75">Filter audio candidates</label>
          <input id={searchId} type="search" value={filter} disabled={save.isPending}
            onChange={(event) => setFilter(event.target.value)}
            className="anm-focus min-h-11 w-full rounded-md border border-white/15 bg-white/[0.055] px-3 text-sm text-white" />
        </div>
        {candidates.isFetching ? <p role="status" className="flex items-center gap-2 text-sm text-white/70"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading audio candidates...</p>
          : candidates.isError ? <div className="grid gap-2"><p role="alert" className="text-sm text-rose-200">Audio candidates could not load.</p><button type="button" className={buttonClass} onClick={() => { void candidates.refetch(); }}>Retry</button></div>
          : <>
            <p className="text-xs text-white/55">{candidates.data?.length ?? 0} candidates returned (limit 100).</p>
            <div className="grid gap-2" aria-label="Audio candidates">
              {matches.map((item) => <button key={item.assetId} type="button" disabled={save.isPending}
                aria-pressed={selectedId === item.assetId} onClick={() => { setSelectedId(item.assetId); save.reset(); }}
                className={`anm-focus min-w-0 rounded-md border p-3 text-left disabled:opacity-50 ${selectedId === item.assetId ? "border-anm-gold/55 bg-anm-gold/10" : "border-white/10 bg-white/[0.035] hover:border-white/30"}`}>
                <span className="block break-words text-sm font-semibold text-white">{item.title || "Untitled audio candidate"}</span>
                <span className="mt-1 block break-words text-xs text-white/55">{item.mimeType} · {item.fileSizeBytes.toLocaleString()} bytes</span>
              </button>)}
              {!matches.length ? <p className="text-sm text-white/65">{candidates.data?.length ? "No candidates match this filter." : "No audio candidates are available."}</p> : null}
            </div>
          </>}
        {save.isError ? <p role="alert" className="text-sm text-rose-200">Audio candidate could not be saved. Please retry or refresh the release review.</p> : null}
        <button type="button" className={buttonClass} disabled={!canSave}
          onClick={() => { if (canSave && selectedId) save.mutate(selectedId); }}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {save.isPending ? "Saving audio candidate..." : "Use audio candidate"}
        </button>
      </div>
    </AdminRightShelf> : null}
  </section>;
}
