import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { memberAuthApiService } from "../../services/member/MemberAuthApiService";
import { PublicPageLoader } from "../../components/loading";
import { memberDashboardApiService } from "../services/MemberDashboardApiService";
import type { MemberDashboardResponse, MemberPortalSession } from "../services/memberPortalTypes";
import { MemberPortalContext } from "../contexts/MemberPortalContext";
import { MemberApiError } from "../../services/member/MemberApiError";
import { Button } from "../../components/ui/Button";
import { authShellChangedEvent } from "../../services/auth/AuthenticationShellService";

const isSafeReturnPath = (path: string) => path.startsWith("/member") && !path.startsWith("//") && !path.includes("://");

export function MemberRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [session, setSession] = useState<MemberPortalSession | null>(null);
  const [dashboard, setDashboard] = useState<MemberDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<"auth" | "suspended" | "disabled" | "unavailable" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const refreshSequence = useRef(0);

  const refreshDashboard = useCallback(async () => {
    const current = generation.current;
    const sequence = ++refreshSequence.current;
    try {
      const next = await memberDashboardApiService.dashboard();
      if (current === generation.current && sequence === refreshSequence.current) setDashboard(next);
    } catch (error) {
      if (current === generation.current && sequence === refreshSequence.current && error instanceof MemberApiError && [401, 403].includes(error.status)) {
        setSession(null); setDashboard(null); setBlocked(error.status === 401 ? "auth" : "unavailable");
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const current = ++generation.current;
    setLoading(true);
    setBlocked(null);
    setSession(null);
    setDashboard(null);
    Promise.all([memberAuthApiService.session(), memberDashboardApiService.dashboard()])
      .then(([nextSession, nextDashboard]) => {
        if (!active || current !== generation.current) return;
        setSession(nextSession as MemberPortalSession);
        setDashboard(nextDashboard);
        if (nextSession.member.status === "Suspended") setBlocked("suspended");
        if (nextSession.member.status === "Disabled" || nextSession.member.status === "Deleted") setBlocked("disabled");
      })
      .catch((error: unknown) => active && current === generation.current && setBlocked(error instanceof MemberApiError && error.status === 401 ? "auth" : "unavailable"))
      .finally(() => active && current === generation.current && setLoading(false));
    const changed = () => { generation.current++; setSession(null); setDashboard(null); setLoading(true); setAttempt(value => value + 1); };
    const storage = (event: StorageEvent) => { if (event.key === authShellChangedEvent || event.key === null) changed(); };
    window.addEventListener(authShellChangedEvent, changed);
    window.addEventListener("storage", storage);
    return () => {
      active = false;
      generation.current++;
      window.removeEventListener(authShellChangedEvent, changed);
      window.removeEventListener("storage", storage);
    };
  }, [attempt]);

  if (loading) return <PublicPageLoader />;
  if (blocked === "unavailable") return (
    <main className="mx-auto grid min-h-[60vh] max-w-lg content-center gap-4 px-5 text-white">
      <h1 className="text-2xl font-semibold">Member portal temporarily unavailable</h1>
      <p role="alert">We could not load your account experience. This does not mean your password is incorrect. Please try again.</p>
      <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Try Again</Button>
    </main>
  );
  if (blocked === "auth" || !session || !dashboard) {
    const target = isSafeReturnPath(location.pathname) ? `?returnTo=${encodeURIComponent(location.pathname)}` : "";
    return <Navigate to={`/login${target}`} replace />;
  }
  if (blocked === "suspended") return <Navigate to="/member/suspended" replace />;
  if (blocked === "disabled") return <Navigate to="/login" replace />;

  return (
    <MemberPortalContext.Provider value={{ session, dashboard, refreshDashboard }}>
      {children}
    </MemberPortalContext.Provider>
  );
}
