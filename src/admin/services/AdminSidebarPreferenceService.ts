import type { AdminSidebarMode, AdminSidebarState } from "../navigation/adminNavigationTypes";

const preferenceKey = "anm.admin.sidebar.mode";
const preferenceEvent = "anm-admin-sidebar-mode-change";

const nowIso = () => new Date().toISOString();

const isMode = (value: string | null): value is AdminSidebarMode => value === "expanded" || value === "collapsed";

export const adminSidebarPreferenceService = {
  getPreference(): AdminSidebarMode {
    if (typeof window === "undefined") return "expanded";
    const value = window.localStorage.getItem(preferenceKey);
    return isMode(value) ? value : "expanded";
  },

  setPreference(mode: AdminSidebarMode): AdminSidebarState {
    if (typeof window !== "undefined") window.localStorage.setItem(preferenceKey, mode);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(preferenceEvent, { detail: { mode } }));
    return {
      mode,
      userPreference: mode,
      temporaryExpansion: false,
      mobileOpen: false,
      lastChangedAt: nowIso(),
    };
  },

  toggle(current: AdminSidebarMode): AdminSidebarState {
    return this.setPreference(current === "expanded" ? "collapsed" : "expanded");
  },
};

export const adminSidebarPreferenceEvent = preferenceEvent;
