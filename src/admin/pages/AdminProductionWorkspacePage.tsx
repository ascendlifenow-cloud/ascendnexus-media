import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminReleases } from "../../hooks/admin/useAdminContent";
import { adminApiBase } from "../services/AdminAuthApiService";
import { SEOHead } from "../../components/SEOHead";
import { useImageRecovery } from "../../hooks/media/useImageRecovery";
interface ProductionSummary {
  masterPrompt: string;
  styles: string[];
  destinations: { platform: string; copy: string }[];
}

interface Review {
  release: { title: string; lyrics?: string; metadata?: { productionPackage?: ProductionSummary; productionValidation?: { counts: { lyrics: number; styles: number[] } } } };
  assets: { assetId: string; role: string }[];
  bundleHash: string;
  approval: { status: string; blockers: string[]; publicActionsAllowed: boolean };
}

export function AdminProductionWorkspacePage() {
  const { releaseId } = useParams();
  const releases = useAdminReleases();
  const review = useQuery({ queryKey: ["admin-production-review", releaseId], enabled: Boolean(releaseId), queryFn: async (): Promise<Review> => {
    const response = await fetch(`${adminApiBase()}/api/admin/releases/${encodeURIComponent(releaseId!)}/production-preview`, { credentials: "include", cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.errors?.join(" ") || "Production review could not load.");
    return payload.data;
  } });
  const coverId = review.data?.assets.find((asset) => asset.role === "coverArt")?.assetId;
  const coverQuery = useQuery({
    queryKey: ["admin-production-cover", releaseId, coverId, review.data?.bundleHash],
    enabled: Boolean(coverId && releaseId), staleTime: 0, gcTime: 0,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${adminApiBase()}/api/admin/releases/${encodeURIComponent(releaseId!)}/production-cover`, { credentials: "include", cache: "no-store", signal });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: { details?: { check?: string; upstreamStatus?: number } } };
        const check = failure.error?.details?.check;
        const safeCheck = check && ["release", "asset_manifest", "asset_link", "private_storage", "storage_provider", "storage_signing", "storage_read", "checksum"].includes(check) ? ` (${check.replace(/_/g, " ")})` : "";
        throw new Error(`Private cover preview unavailable${safeCheck}.`);
      }
      if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error("Private cover preview unavailable.");
      return response.blob();
    },
  });
  const [coverUrl, setCoverUrl] = useState<string>();
  useEffect(() => {
    setCoverUrl(undefined);
    if (!coverQuery.data) return;
    const url = URL.createObjectURL(coverQuery.data);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverQuery.data]);
  const cover = useImageRecovery(coverUrl);
  const bundle = review.data?.release.metadata?.productionPackage;
  const counts = review.data?.release.metadata?.productionValidation?.counts;
  const rows = releases.data?.ok ? releases.data.data.filter((release) => release.metadata?.productionPackage) : [];
  return <main className="grid gap-6">
    <SEOHead metadata={{ title: "Production Workspace | Ascend Nexus Media", description: "Private production review", type: "custom", noIndex: true }} disableSocial />
    <header><h1 className="text-2xl font-semibold text-white">Production Workspace</h1><Link to="/admin/releases" className="text-anm-blue">Releases</Link></header>
    <div className="grid gap-5 border-y border-white/15 py-5 md:grid-cols-2">
      <section><h2 className="font-semibold text-white">Production assignments</h2><Link to="/admin/agents" className="text-anm-blue">Agent status and report history</Link></section>
      <section><h2 className="font-semibold text-white">Release review</h2><p className="text-white/70">Public execution remains locked. Review each draft for its current validation and approval blockers.</p></section>
    </div>
    {!releaseId ? <section><h2 className="mb-3 text-lg font-semibold text-white">Private Productions</h2>{releases.isLoading ? <p role="status">Loading productions…</p> : releases.isError || releases.data?.ok === false ? <p role="alert">Productions could not load.</p> : rows.length ? <ul className="divide-y divide-white/10">{rows.map((release) => <li key={release.releaseId} className="py-4"><Link className="text-anm-blue" to={`/admin/production/${release.releaseId}`}>{release.title}</Link><span className="ml-3 text-sm text-white/60">Private review</span></li>)}</ul> : <p>No production drafts are available.</p>}</section> : null}
    {review.isLoading && releaseId ? <p role="status">Loading private review…</p> : null}
    {review.error ? <p role="alert" className="text-rose-200">{review.error.message}</p> : null}
    {review.data ? <>
      <section className="grid gap-6 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div>{coverQuery.data && cover.source && !cover.exhausted ? <img key={cover.imageKey} className="aspect-square w-full rounded-md object-cover" src={cover.source} onError={cover.recover} alt={`${review.data.release.title} cover candidate`} /> : <p role="status">{coverQuery.isError ? coverQuery.error.message : cover.exhausted ? "Private cover preview unavailable." : "Loading artwork…"}</p>}</div>
        <div><span className="text-amber-200">Private · Approval pending</span><h2 className="mt-3 text-2xl font-semibold text-white">{review.data.release.title}</h2><p className="mt-3 text-white/70">Lyrics: {counts?.lyrics ?? "Unvalidated"} characters · Styles: {counts?.styles.join(" / ") ?? "Unvalidated"}</p><ul className="mt-4 list-disc pl-5 text-white/70">{review.data.approval.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul><p className="mt-4 text-white/70">Nothing is scheduled for publication. Artwork remains a review candidate.</p><p className="mt-4 break-all text-xs text-white/50">Bundle: {review.data.bundleHash}</p><Link className="mt-4 inline-block text-anm-blue" to={`/admin/releases/${releaseId}/edit`}>Edit release</Link></div>
      </section>
      <section className="border-t border-white/15 pt-5"><h2 className="text-lg font-semibold text-white">Production Documents</h2><details className="py-3"><summary>Lyrics</summary><pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-white/80">{review.data.release.lyrics}</pre></details><details className="py-3"><summary>Master Song Creation Prompt</summary><pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-white/80">{bundle?.masterPrompt}</pre></details>{bundle?.styles.map((style, index) => <details key={index} className="py-3"><summary>Style {index + 1}</summary><p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{style}</p></details>)}</section>
      <section className="border-t border-white/15 pt-5"><h2 className="text-lg font-semibold text-white">Destination Copy · Pending Approval</h2>{bundle?.destinations.map((destination) => <details key={destination.platform} className="py-3"><summary>{destination.platform}</summary><p className="mt-3 whitespace-pre-wrap text-white/75">{destination.copy}</p></details>)}</section>
    </> : null}
  </main>;
}
