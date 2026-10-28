import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { adminReleasesKeys } from "../../../utils/admin/adminQueryKeys";
import { adminApiBase } from "../../services/AdminAuthApiService";
import { useAdminAuth } from "../../hooks/useAdminAuth";

interface Props {
  releaseId: string;
  bundleHash: string;
  onApproved: () => void;
}

interface ApprovalSummary {
  bundleHash: string;
  revision: number | null;
  title: string;
  songId: string;
  artist: { name: string; profileVersion: string; expectedProfileVersion: string };
  assets: Array<{ assetId: string; role: string; revision: string; sha256: string }>;
  websiteVisibility: string;
  scheduledFor: string | null;
  destinations: Array<{ platform: string; copy: string; assetIds: string[]; readiness: "export_only" }>;
  references: Array<{ source: string; version: string; approval: string }>;
  metadata: { description: string; releaseDate: string; genre: string; styleTags: string[]; externalLinks: Record<string, string> };
  blockers: string[];
  ownerConfigured: boolean;
  isOwner: boolean;
  approved: boolean;
  approvedAt: string | null;
  canApprove: boolean;
  generation: number;
  approvalId: string | null;
  canWithdraw: boolean;
  executionStatus: "locked_pending_transactional_executor";
}

async function readData(response: Response): Promise<unknown> {
  const payload = await response.json();
  if (!response.ok || payload?.success !== true || !payload.data) throw new Error("Request failed");
  return payload.data;
}

export function ProductionApprovalPanel(props: Props) {
  const { session, status } = useAdminAuth();
  if (status !== "authenticated" || !session) return null;
  return <ApprovalPanel key={JSON.stringify([props.releaseId, props.bundleHash, session.user.userId])} actorId={session.user.userId} {...props} />;
}

function ApprovalPanel({ releaseId, bundleHash, onApproved, actorId }: Props & { actorId: string }) {
  const endpoint = `${adminApiBase()}/api/admin/releases/${encodeURIComponent(releaseId)}`;
  const summary = useQuery({
    queryKey: [...adminReleasesKeys.detail(releaseId), "production-approval-summary", bundleHash, actorId],
    gcTime: 0,
    staleTime: 0,
    retry: false,
    meta: { persist: false },
    queryFn: async ({ signal }) => await readData(await fetch(`${endpoint}/production-approval-summary`, {
      credentials: "include", cache: "no-store", signal,
    })) as ApprovalSummary,
  });
  const buttonClass = "anm-focus inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 hover:border-anm-gold/45 disabled:cursor-not-allowed disabled:opacity-50";
  return <section className="min-w-0 border-t border-white/15 py-5 text-sm text-white/75 [overflow-wrap:anywhere]" aria-label="Production approval" aria-busy={summary.isFetching}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-white">Production approval</h2>
      <button type="button" className={`${buttonClass} h-10 w-10 shrink-0 p-0`} title="Refresh approval summary" aria-label="Refresh approval summary"
        disabled={summary.isFetching} onClick={() => { void summary.refetch(); }}>
        <RefreshCw className={`h-4 w-4 ${summary.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
      </button>
    </div>
    {summary.isPending ? <p role="status" className="mt-3">Loading approval summary...</p> : null}
    {summary.isError ? <p role="alert" className="mt-3 text-rose-200">Approval summary could not load. Please refresh and review again.</p> : null}
    {summary.data ? <ApprovalDetails key={JSON.stringify([summary.data.bundleHash, summary.data.generation, summary.data.approvalId])} data={summary.data} bundleHash={bundleHash}
      endpoint={endpoint} unavailable={summary.isFetching || summary.isError} onApproved={() => { void summary.refetch(); onApproved(); }} /> : null}
  </section>;
}

function ApprovalDetails({ data, bundleHash, endpoint, unavailable, onApproved }: {
  data: ApprovalSummary;
  bundleHash: string;
  endpoint: string;
  unavailable: boolean;
  onApproved: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [withdrawConfirmed, setWithdrawConfirmed] = useState(false);
  const checkboxId = useId();
  const matches = data.bundleHash === bundleHash;
  const approve = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async () => {
      const result = await readData(await fetch(`${endpoint}/production-approve`, {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleHash: data.bundleHash, confirmed: true, generation: data.generation }),
      })) as { approved?: unknown; reused?: unknown };
      if (result.approved !== true || typeof result.reused !== "boolean") throw new Error("Request failed");
      return result;
    },
    onSuccess: () => { setConfirmed(false); onApproved(); },
    onError: () => { setConfirmed(false); },
  });
  const withdraw = useMutation({
    retry: false, gcTime: 0,
    mutationFn: async () => {
      const result = await readData(await fetch(`${endpoint}/production-withdraw-approval`, {
        method: "POST", credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId: data.approvalId, confirmed: true }),
      })) as { withdrawn?: boolean };
      if (result.withdrawn !== true) throw new Error("Withdrawal not confirmed");
    },
    onSuccess: () => { setWithdrawConfirmed(false); onApproved(); },
    onError: () => { setWithdrawConfirmed(false); },
  });
  const approved = !withdraw.isSuccess && (data.approved || approve.isSuccess);
  const eligible = matches && data.ownerConfigured && data.isOwner && data.canApprove
    && !data.blockers.length && !approved && !unavailable && !approve.isPending && !withdraw.isPending;
  return <div className="mt-3 grid min-w-0 gap-4">
    <dl className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)]">
      <dt>Title</dt><dd>{data.title}</dd>
      <dt>Song ID</dt><dd>{data.songId}</dd>
      <dt>Revision</dt><dd>{data.revision ?? "Not assigned"}</dd>
      <dt>Bundle SHA-256</dt><dd className="min-w-0 break-all font-mono text-xs">{data.bundleHash}</dd>
      <dt>Artist</dt><dd>{data.artist.name}</dd>
      <dt>Recorded profile version</dt><dd>{data.artist.profileVersion}</dd>
      <dt>Required profile version</dt><dd>{data.artist.expectedProfileVersion}</dd>
      <dt>Website visibility</dt><dd>{data.websiteVisibility}</dd>
      <dt>Schedule</dt><dd>{data.scheduledFor ?? "Not scheduled"}</dd>
    </dl>
    <div><h3 className="font-semibold text-white">Release metadata</h3>
      <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)]">
        <dt>Release date</dt><dd>{data.metadata.releaseDate}</dd>
        <dt>Genre</dt><dd>{data.metadata.genre}</dd>
        <dt>Style tags</dt><dd>{data.metadata.styleTags.join(", ") || "None"}</dd>
        <dt>Description</dt><dd className="whitespace-pre-wrap">{data.metadata.description || "None"}</dd>
      </dl>
      <ul className="mt-2 grid gap-1">{Object.entries(data.metadata.externalLinks).map(([platform, link]) => <li key={platform}>{platform}: {link}</li>)}</ul>
    </div>
    <div><h3 className="font-semibold text-white">Assets and checksums</h3>
      {data.assets.length ? <ul className="mt-2 grid gap-2">{data.assets.map((asset, index) => <li key={index}>
        <p>{asset.role}: {asset.assetId} · Revision {asset.revision}</p>
        <p className="break-all font-mono text-xs">SHA-256: {asset.sha256}</p>
      </li>)}</ul> : <p>No assets.</p>}
    </div>
    <div><h3 className="font-semibold text-white">References</h3>
      {data.references.length ? <ul className="mt-2 grid gap-2">{data.references.map((reference, index) => <li key={index}>
        {reference.source} · Version {reference.version} · Approval {reference.approval}
      </li>)}</ul> : <p>No references.</p>}
    </div>
    <div><h3 className="font-semibold text-white">Destinations</h3>
      {data.destinations.length ? data.destinations.map((destination, index) => <details open key={index} className="mt-2 min-w-0 border-t border-white/10 pt-2">
        <summary className="anm-focus cursor-pointer font-medium">{destination.platform} · Export only</summary>
        <p className="mt-2 whitespace-pre-wrap">{destination.copy || "No destination copy."}</p>
        <p className="mt-2">Asset IDs: {destination.assetIds.join(", ") || "None"}</p>
      </details>) : <p>No destinations.</p>}
    </div>
    <div><h3 className="font-semibold text-white">Blockers</h3>
      {data.blockers.length ? <ul className="mt-2 list-inside list-disc text-rose-200">{data.blockers.map((blocker, index) => <li key={index}>{blocker}</li>)}</ul> : <p>No blockers reported.</p>}
    </div>
    {!matches ? <p role="alert" className="text-amber-200">The bundle has changed. Refresh the release and review the changed bundle before approving.</p> : null}
    <p role="status">{!data.ownerConfigured ? "Owner approval not configured" : !data.isOwner
      ? "Only configured owner can approve this exact bundle." : approved ? "Owner approval recorded for this exact bundle."
        : data.canApprove ? "Awaiting owner approval." : "This bundle cannot be approved yet."}</p>
    {data.approvedAt ? <p>Approved at: {data.approvedAt}</p> : null}
    <p>Execution locked pending transactional executor.</p>
    <form className="grid min-w-0 gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (eligible && confirmed) approve.mutate();
    }}>
      <label htmlFor={checkboxId} className="flex items-start gap-2">
        <input id={checkboxId} type="checkbox" className="anm-focus mt-1 shrink-0" checked={confirmed} disabled={!eligible}
          onChange={(event) => setConfirmed(event.target.checked)} />
        I approve this exact audio, artwork, metadata, references, destinations, visibility and schedule
      </label>
      <button type="submit" disabled={!eligible || !confirmed}
        className="anm-focus inline-flex min-h-10 max-w-full items-center justify-center gap-2 justify-self-start rounded-md border border-white/15 px-3 py-2 font-semibold text-white/80 disabled:cursor-not-allowed disabled:opacity-50">
        {approve.isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {approve.isPending ? "Recording approval..." : "Approve exact bundle"}
      </button>
    </form>
    {approve.isPending ? <p role="status">Recording owner approval...</p> : null}
    {approve.isSuccess ? <p role="status" className="text-emerald-200">Owner approval confirmed. Execution remains locked.</p> : null}
    {approve.isError ? <p role="alert" className="text-rose-200">Approval could not be confirmed. Refresh and review the bundle before retrying.</p> : null}
    {data.canWithdraw && !withdraw.isSuccess ? <div className="grid gap-3 border-t border-white/15 pt-4">
      <label className="flex items-start gap-2"><input type="checkbox" checked={withdrawConfirmed}
        disabled={unavailable || approve.isPending || withdraw.isPending} onChange={(event) => setWithdrawConfirmed(event.target.checked)} />
        Withdraw the recorded approval, including if this bundle has since changed.</label>
      <button type="button" className="anm-focus min-h-10 justify-self-start rounded-md border border-rose-300/40 px-3 py-2"
        disabled={!withdrawConfirmed || unavailable || approve.isPending || withdraw.isPending} onClick={() => withdraw.mutate()}>
        {withdraw.isPending ? "Withdrawing approval..." : "Withdraw approval"}</button>
    </div> : null}
    {withdraw.isSuccess ? <p role="status">Approval withdrawn. A new explicit approval is required. Publication remains locked.</p> : null}
    {withdraw.isError ? <p role="alert">Withdrawal could not be confirmed. Refresh before retrying.</p> : null}
  </div>;
}
