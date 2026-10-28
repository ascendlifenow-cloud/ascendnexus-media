import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "../../components/SEOHead";
import { Button } from "../../components/ui/Button";
import {
  agentStatusApiService, agentStatuses, agentTeams,
  type AgentEvidence, type AgentStatus, type AgentTeam,
} from "../services/AgentStatusApiService";

// Report text is untrusted: suppress credentials, URLs and absolute local paths.
function safeText(value: string) {
  return value.replace(/https?:\/\/\S+|file:\/\/\S+|\bBearer\s+\S+|\b(?:sk-|ghp_|github_pat_)[\w-]+|\beyJ[\w.-]+|(?:\b(?:token|secret|password|api[_-]?key)\s*[:=]\s*)\S+|(?:[A-Za-z]:\\)[^\s,;]+|(?<![\w.])\/[^\s,;]+|\b[A-Za-z0-9_-]{40,}\b/gi, "[redacted]");
}
function timestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}
function Status({ value }: { value: AgentStatus }) {
  const tone = value === "completed" ? "text-emerald-200 bg-emerald-400/10" : value === "failed" || value === "blocked" ? "text-red-200 bg-red-400/10" : "text-white/80 bg-white/10";
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs capitalize ${tone}`}>{value}</span>;
}
function Evidence({ items }: { items: AgentEvidence[] }) {
  return <ul className="space-y-1 break-words text-sm text-white/70">{items.map((item, index) => {
    const path = item.path ?? "";
    const internal = /^\/admin\/[a-zA-Z0-9/_-]*$/.test(path) && !path.split("/").includes("..");
    const relative = /^(?:docs|scripts)\/[a-zA-Z0-9._/-]+$/.test(path) && !path.split("/").includes("..");
    return <li key={index}>{internal ? <Link className="text-anm-gold underline" to={path}>{safeText(item.label)}</Link> : safeText(item.label)}{relative ? <span className="ml-2 text-xs text-white/50">{path}</span> : null}</li>;
  })}</ul>;
}
const queryOptions = { gcTime: 0, staleTime: 0, retry: false, refetchOnWindowFocus: false, meta: { persist: false } } as const;

export function AdminAgentStatusPage() {
  const [team, setTeam] = useState<AgentTeam | "">("");
  const [status, setStatus] = useState<AgentStatus | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const overview = useQuery({
    queryKey: ["admin", "agent-status", "overview"],
    queryFn: ({ signal }) => agentStatusApiService.getRuns({}, signal), ...queryOptions,
  });
  const filtered = useQuery({
    queryKey: ["admin", "agent-status", "runs", team, status],
    queryFn: ({ signal }) => agentStatusApiService.getRuns({ team: team || undefined, status: status || undefined }, signal),
    enabled: Boolean(team || status), ...queryOptions,
  });
  const runsQuery = team || status ? filtered : overview;
  const runs = runsQuery.data?.runs ?? [];
  const selected = runs.find((run) => run.runId === selectedId) ?? runs[0];
  const logs = useInfiniteQuery({
    queryKey: ["admin", "agent-status", "logs", selected?.runId, selected?.revision],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => agentStatusApiService.getLogs(selected!.runId, pageParam, signal),
    getNextPageParam: (page, _pages, previous) => page.hasMore && page.nextBeforeRevision !== undefined && (previous === undefined || page.nextBeforeRevision < previous) ? page.nextBeforeRevision : undefined,
    enabled: Boolean(selected), ...queryOptions,
  });
  const detail = logs.data?.pages[0]?.run ?? selected;
  const refreshing = overview.isFetching || runsQuery.isFetching || logs.isFetching;
  const refresh = () => {
    void overview.refetch();
    if (team || status) void filtered.refetch();
    if (selected) void logs.refetch();
  };
  return <div className="space-y-5">
    <SEOHead metadata={{ title: "Agent Status", noIndex: true }} disableSocial />
    <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div><h1 className="text-2xl font-semibold text-white">Agent Status</h1><p className="mt-1 text-sm text-white/60">Last reported assignment status</p></div>
      <Button variant="glass" title="Refresh reports" aria-label="Refresh reports" disabled={refreshing} onClick={refresh}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden /></Button>
    </header>
    <section aria-label="Team summaries" className="grid gap-3 border-b border-white/10 pb-4 sm:grid-cols-3">
      {(["engineering", "creative", "other"] as const).map((group) => {
        const members = (overview.data?.runs ?? []).filter((run) => group === "other" ? run.team === "validation" || run.team === "coordination" : run.team === group);
        return <div key={group}><h2 className="text-sm font-semibold capitalize text-white">{group === "other" ? "Other assignments" : group}</h2><p className="mt-1 text-sm text-white/60">{overview.isError ? "Unavailable" : !overview.data ? "Loading..." : `${members.length} reported · ${members.filter((run) => run.status === "blocked").length} blocked · ${members.filter((run) => run.isStale).length} stale`}</p></div>;
      })}
    </section>
    {overview.isError && (team || status) ? <p role="alert" className="text-sm text-red-200">Team summaries unavailable. <button className="underline" onClick={() => void overview.refetch()}>Retry</button></p> : null}
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-white/60">Team<select className="mt-1 block rounded border border-white/20 bg-black p-2 text-sm text-white" value={team} onChange={(event) => { setTeam(event.target.value as AgentTeam | ""); setSelectedId(null); }}><option value="">All teams</option>{agentTeams.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="text-xs text-white/60">Status<select className="mt-1 block rounded border border-white/20 bg-black p-2 text-sm text-white" value={status} onChange={(event) => { setStatus(event.target.value as AgentStatus | ""); setSelectedId(null); }}><option value="">All statuses</option>{agentStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <p className="pb-2 text-xs text-white/50">{runsQuery.data ? `${runsQuery.data.total} assignments · Snapshot ${timestamp(runsQuery.data.generatedAt)}` : ""}</p>
    </div>
    {runsQuery.isPending ? <p role="status" className="text-sm text-white/60">Loading assignment reports...</p> : null}
    {runsQuery.isError ? <div role="alert" className="flex items-center gap-3 text-sm text-red-200">Unable to load assignment reports.<Button variant="glass" onClick={() => void runsQuery.refetch()}>Retry</Button></div> : null}
    {runsQuery.isSuccess && !runs.length ? <p className="py-6 text-sm text-white/60">No reported assignments match these filters.</p> : null}
    {runs.length > 0 ? <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-label="Assignments" className="min-w-0 divide-y divide-white/10 border-y border-white/10">
        {runs.map((run) => <button key={run.runId} type="button" aria-pressed={selected?.runId === run.runId} onClick={() => setSelectedId(run.runId)} className={`w-full space-y-1 p-3 text-left text-sm focus-visible:outline focus-visible:outline-anm-gold ${selected?.runId === run.runId ? "bg-white/10" : "hover:bg-white/5"}`}>
          <span className="flex flex-wrap items-center justify-between gap-2"><strong className="min-w-0 break-words text-white">{safeText(run.agentName)}</strong><Status value={run.status} /></span>
          <span className="block break-words text-white/80">{safeText(run.assignment)}</span>
          <span className="block text-xs text-white/50">{run.team} · Last report {timestamp(run.lastReportedAt)}{run.isStale ? " · Stale" : ""}</span>
        </button>)}
      </section>
      {detail ? <section aria-label="Selected assignment details" className="min-w-0 space-y-4 break-words text-sm text-white/75">
        <div><h2 className="text-lg font-semibold text-white">{safeText(detail.assignment)}</h2><p className="mt-1">{safeText(detail.agentName)} · {detail.team} · <Status value={detail.status} /></p><p className="mt-2 text-xs text-white/50">Bounded assignment · Revision {detail.revision} · Last report {timestamp(detail.lastReportedAt)}{detail.isStale ? " · Stale" : ""}</p></div>
        <p className="whitespace-pre-wrap">{safeText(detail.summary)}</p>
        <div><h3 className="mb-1 font-semibold text-white">Blockers</h3>{detail.blockers.length ? <ul className="list-inside list-disc">{detail.blockers.map((blocker, index) => <li key={index}>{safeText(blocker)}</li>)}</ul> : <p className="text-white/50">None reported.</p>}</div>
        <div><h3 className="mb-1 font-semibold text-white">Evidence</h3>{detail.evidence.length ? <Evidence items={detail.evidence} /> : <p className="text-white/50">None reported.</p>}</div>
        <div className="border-t border-white/10 pt-3"><h3 className="font-semibold text-white">Report history</h3>
          {logs.isPending ? <p role="status" className="mt-2">Loading reports...</p> : null}
          {logs.isError ? <p role="alert" className="mt-2 text-red-200">Unable to load reports. <button className="underline" onClick={() => void (logs.isFetchNextPageError ? logs.fetchNextPage() : logs.refetch())}>Retry</button></p> : null}
          {logs.isSuccess && !logs.data.pages[0].logs.length ? <p className="mt-2 text-white/50">No report history yet.</p> : null}
          <ol className="divide-y divide-white/10">{logs.data?.pages.flatMap((page) => page.logs).filter((report, index, reports) => reports.findIndex((item) => item.reportId === report.reportId) === index).map((report) => <li key={report.reportId} className="space-y-2 py-3"><div className="flex flex-wrap items-center gap-2"><Status value={report.status} /><span className="text-xs text-white/50">Revision {report.revision} · {timestamp(report.occurredAt)}</span></div><p className="whitespace-pre-wrap">{safeText(report.summary)}</p>{report.blockers.length ? <ul className="list-inside list-disc text-red-200">{report.blockers.map((blocker, index) => <li key={index}>{safeText(blocker)}</li>)}</ul> : null}<Evidence items={report.evidence} /></li>)}</ol>
          {logs.hasNextPage ? <Button variant="glass" disabled={logs.isFetching} onClick={() => void logs.fetchNextPage()}>{logs.isFetchingNextPage ? "Loading..." : "Load older"}</Button> : null}
        </div>
      </section> : null}
    </div> : null}
  </div>;
}
