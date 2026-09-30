import { createContext } from "react";
import type { MemberDashboardResponse, MemberPortalSession } from "../services/memberPortalTypes";

export interface MemberPortalContextValue {
  session: MemberPortalSession;
  dashboard: MemberDashboardResponse;
  refreshDashboard: () => Promise<void>;
}

export const MemberPortalContext = createContext<MemberPortalContextValue | null>(null);
