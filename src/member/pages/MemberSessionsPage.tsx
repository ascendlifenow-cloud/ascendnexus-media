import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { memberDashboardApiService } from "../services/MemberDashboardApiService";
import type { MemberSessionResponse } from "../services/memberPortalTypes";
import { PageHeader, Panel } from "./memberPageParts";

export function MemberSessionsPage() {
  const [sessions, setSessions] = useState<MemberSessionResponse[]>([]);
  const [error, setError] = useState("");
  const load = () => memberDashboardApiService.sessions().then(setSessions).catch((err) => setError(err instanceof Error ? err.message : "Unable to load sessions."));
  useEffect(() => {
    void load();
  }, []);
  const revoke = async (sessionId: string) => {
    await memberDashboardApiService.revokeSession(sessionId);
    load();
  };
  const revokeOthers = async () => {
    await memberDashboardApiService.revokeOtherSessions();
    load();
  };
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sessions" title="Active member sessions">Manage only your own member sessions. Device labels are privacy-safe summaries.</PageHeader>
      <Panel>
        <div className="mb-4 flex justify-end"><Button variant="secondary" onClick={revokeOthers}>Revoke Other Sessions</Button></div>
        {error ? <p className="mb-4 text-sm text-rose-100" role="alert">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-white/42"><tr><th className="py-2">Session</th><th>Created</th><th>Last active</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.sessionId} className="border-t border-white/10">
                  <td className="py-3 text-white">{session.deviceLabel ?? "Member session"}{session.current ? <span className="ml-2 rounded-full bg-cyanGlow/15 px-2 py-1 text-xs text-cyan-50">current</span> : null}</td>
                  <td className="text-white/58">{new Date(session.createdAt).toLocaleString()}</td>
                  <td className="text-white/58">{new Date(session.lastActiveAt).toLocaleString()}</td>
                  <td className="text-white/58">{new Date(session.expiresAt).toLocaleString()}</td>
                  <td className="text-right"><Button variant="secondary" size="sm" onClick={() => revoke(session.sessionId)}>Revoke</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
