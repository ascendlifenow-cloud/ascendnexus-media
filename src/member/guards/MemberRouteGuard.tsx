import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { memberAuthApiService } from "../../services/member/MemberAuthApiService";
import { PublicPageLoader } from "../../components/loading";
import { memberDashboardApiService } from "../services/MemberDashboardApiService";
import type { MemberDashboardResponse, MemberPortalSession } from "../services/memberPortalTypes";
import { MemberPortalContext } from "../contexts/MemberPortalContext";

const isSafeReturnPath = (path: string) => path.startsWith("/member") && !path.startsWith("//") && !path.includes("://");

export function MemberRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [session, setSession] = useState<MemberPortalSession | null>(null);
  const [dashboard, setDashboard] = useState<MemberDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<"auth" | "suspended" | "disabled" | null>(null);

  const refreshDashboard = useCallback(async () => {
    setDashboard(await memberDashboardApiService.dashboard());
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([memberAuthApiService.session(), memberDashboardApiService.dashboard()])
      .then(([nextSession, nextDashboard]) => {
        if (!active) return;
        setSession(nextSession as MemberPortalSession);
        setDashboard(nextDashboard);
        if (nextSession.member.status === "Suspended") setBlocked("suspended");
        if (nextSession.member.status === "Disabled" || nextSession.member.status === "Deleted") setBlocked("disabled");
      })
      .catch(() => active && setBlocked("auth"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (loading) return <PublicPageLoader />;
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
