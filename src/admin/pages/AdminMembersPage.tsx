import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Search, ShieldAlert, UserRound } from "lucide-react";
import { adminMemberCrmApiService } from "../services/AdminMemberCrmApiService";

export function AdminMembersPage({ focus = "members" }: { focus?: "members" | "health" | "audit" | "security" | "support" | "risk" | "moderation" | "sessions" | "subscriptions" | "entitlements" | "activity" | "notifications" }) {
  const params = useParams();
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<Array<Record<string, unknown>>>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const activeMemberId = params.memberId ?? String(detail?.member && (detail.member as Record<string, unknown>).memberId || "");

  const load = () => {
    setError("");
    adminMemberCrmApiService.dashboard().then(setDashboard).catch((err) => setError(err instanceof Error ? err.message : "Unable to load CRM dashboard."));
    adminMemberCrmApiService.search(query).then((items) => {
      setMembers(items);
      if (!params.memberId && !detail && items[0]?.memberId) void adminMemberCrmApiService.detail(String(items[0].memberId)).then(setDetail);
    }).catch(() => setMembers([]));
    if (params.memberId) adminMemberCrmApiService.detail(params.memberId).then(setDetail).catch((err) => setError(err instanceof Error ? err.message : "Unable to load member detail."));
  };

  useEffect(load, [params.memberId]);

  const selectMember = (memberId: string) => adminMemberCrmApiService.detail(memberId).then(setDetail);
  const refreshDetail = () => activeMemberId ? adminMemberCrmApiService.detail(activeMemberId).then(setDetail) : Promise.resolve();
  const addSupportNote = async () => {
    if (!activeMemberId) return;
    await adminMemberCrmApiService.supportNote(activeMemberId, { subject: "Support follow-up", body: "Administrative support note created from CRM.", status: "open" });
    await refreshDetail();
  };
  const suspend = async () => {
    if (!activeMemberId) return;
    await adminMemberCrmApiService.moderate(activeMemberId, { action: "suspend", reason: "Administrative CRM suspension test/action." });
    await refreshDetail();
  };
  const restore = async () => {
    if (!activeMemberId) return;
    await adminMemberCrmApiService.moderate(activeMemberId, { action: "restore", reason: "Administrative CRM restore action." });
    await refreshDetail();
  };

  const statKeys = ["totalMembers", "activeMembers", "inactiveMembers", "premiumReady", "supportQueue", "securityAlerts", "suspensions"];
  const member = detail?.member as Record<string, unknown> | undefined;
  const risk = detail?.risk as Record<string, unknown> | undefined;
  const health = detail?.health as Record<string, unknown> | undefined;
  const engagement = detail?.engagement as Record<string, unknown> | undefined;
  const timeline = (detail?.timeline as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <main className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyanGlow">Member CRM</p>
            <h1 className="mt-2 text-3xl font-semibold capitalize text-white">{focus.replace(/-/g, " ")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">Identity operations, member lifecycle, engagement, support, moderation, sessions, risk, and customer success in one administrative view.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={load}><RefreshCw size={16} /> Refresh</button>
        </div>
        {error ? <p className="mt-4 rounded-md border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        {statKeys.map((key) => <div key={key} className="rounded-md border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{key}</p><p className="mt-2 text-2xl font-semibold text-white">{String(dashboard?.[key] ?? 0)}</p></div>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">Member search</label>
            <div className="mt-3 flex gap-2">
              <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email, name, tier, status" />
              <button className="rounded-md border border-white/10 p-2 text-white" onClick={() => adminMemberCrmApiService.search(query).then(setMembers)} aria-label="Search members"><Search size={18} /></button>
            </div>
          </div>
          <div className="max-h-[42rem] overflow-auto rounded-md border border-white/10 bg-white/[0.04]">
            {members.map((item) => <button key={String(item.memberId)} className="block w-full border-b border-white/10 p-4 text-left hover:bg-white/[0.06]" onClick={() => selectMember(String(item.memberId))}><p className="font-semibold text-white">{String(item.displayName)}</p><p className="mt-1 text-xs text-white/52">{String(item.emailRedacted ?? item.email)} · {String(item.status)} · {String(item.membershipTier)}</p></button>)}
            {!members.length ? <p className="p-6 text-sm text-white/50">No members found.</p> : null}
          </div>
        </div>

        <div className="space-y-4">
          {member ? (
            <>
              <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <UserRound className="text-cyanGlow" size={22} />
                    <h2 className="mt-3 text-2xl font-semibold text-white">{String(member.displayName)}</h2>
                    <p className="mt-1 text-sm text-white/56">{String(member.emailRedacted ?? member.email)} · {String(member.memberId)}</p>
                    <p className="mt-1 text-sm text-white/56">{String(member.membershipTier)} · {String(member.status)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={() => adminMemberCrmApiService.grantMembership(String(member.memberId), "premium").then(refreshDetail)}>Grant Premium</button>
                    <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={() => adminMemberCrmApiService.revokeSessions(String(member.memberId)).then(refreshDetail)}>Revoke Sessions</button>
                    <button className="rounded-md border border-amber-300/20 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/10" onClick={suspend}>Suspend</button>
                    <button className="rounded-md border border-cyanGlow/20 px-3 py-2 text-sm text-cyan-50 hover:bg-cyanGlow/10" onClick={restore}>Restore</button>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <InfoPanel title="Health" icon={<RefreshCw size={18} />} data={health} />
                <InfoPanel title="Risk" icon={<ShieldAlert size={18} />} data={risk} />
                <InfoPanel title="Engagement" data={{
                  favorites: Array.isArray(engagement?.favorites) ? engagement?.favorites.length : 0,
                  following: Array.isArray(engagement?.following) ? engagement?.following.length : 0,
                  playlists: Array.isArray(engagement?.playlists) ? engagement?.playlists.length : 0,
                  notifications: Array.isArray(engagement?.notifications) ? engagement?.notifications.length : 0,
                }} />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-xl font-semibold text-white">Support tools</h3>
                  <p className="mt-2 text-sm text-white/58">Create internal notes, escalations, and account follow-up records.</p>
                  <button className="mt-4 rounded-md border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/8" onClick={addSupportNote}>Add Support Note</button>
                  <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/64">{JSON.stringify(detail?.support ?? [], null, 2)}</pre>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-xl font-semibold text-white">Timeline</h3>
                  <div className="mt-4 max-h-80 space-y-3 overflow-auto">
                    {timeline.map((event, index) => <div key={`${String(event.type)}-${index}`} className="rounded-md border border-white/10 bg-black/20 p-3"><p className="font-semibold text-white">{String(event.label)}</p><p className="mt-1 text-xs text-white/42">{String(event.type)} · {String(event.occurredAt)}</p></div>)}
                    {!timeline.length ? <p className="text-sm text-white/50">No timeline events yet.</p> : null}
                  </div>
                </div>
              </section>

              <section className="rounded-md border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-xl font-semibold text-white">Operational profile</h3>
                <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/64">{JSON.stringify(detail, null, 2)}</pre>
              </section>
            </>
          ) : <p className="rounded-md border border-white/10 bg-white/[0.04] p-6 text-white/58">Select a member to view CRM detail.</p>}
        </div>
      </section>
    </main>
  );
}

function InfoPanel({ title, data, icon }: { title: string; data?: Record<string, unknown>; icon?: ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-cyanGlow">{icon}<h3 className="text-lg font-semibold text-white">{title}</h3></div>
      <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-black/30 p-3 text-xs text-white/64">{JSON.stringify(data ?? {}, null, 2)}</pre>
    </div>
  );
}
