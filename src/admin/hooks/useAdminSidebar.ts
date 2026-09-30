import { useCallback, useEffect, useState } from "react";
import { adminSidebarPreferenceEvent, adminSidebarPreferenceService } from "../services/AdminSidebarPreferenceService";
import type { AdminSidebarMode, AdminSidebarState } from "../navigation/adminNavigationTypes";

const initialState = (): AdminSidebarState => {
  const mode = adminSidebarPreferenceService.getPreference();
  return {
    mode,
    userPreference: mode,
    temporaryExpansion: false,
    mobileOpen: false,
    lastChangedAt: new Date().toISOString(),
  };
};

export function useAdminSidebar() {
  const [state, setState] = useState<AdminSidebarState>(initialState);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "anm.admin.sidebar.mode") return;
      setState(initialState());
    };
    const handlePreferenceEvent = () => setState(initialState());
    window.addEventListener("storage", handleStorage);
    window.addEventListener(adminSidebarPreferenceEvent, handlePreferenceEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(adminSidebarPreferenceEvent, handlePreferenceEvent);
    };
  }, []);

  const setPreference = useCallback((mode: AdminSidebarMode) => {
    setState(adminSidebarPreferenceService.setPreference(mode));
  }, []);

  const toggle = useCallback(() => {
    setState((current) => adminSidebarPreferenceService.toggle(current.mode));
  }, []);

  return {
    state,
    mode: state.mode,
    expanded: state.mode === "expanded",
    collapsed: state.mode === "collapsed",
    setPreference,
    toggle,
  };
}
