import type { ComponentType } from "react";

export type AdminNavigationGroupKey =
  | "overview"
  | "content"
  | "media_operations"
  | "publishing"
  | "members"
  | "system";

export interface AdminNavigationGroup {
  groupKey: AdminNavigationGroupKey;
  label: string;
  order: number;
  defaultExpanded: boolean;
}

export interface AdminNavigationEntry {
  navigationKey: string;
  label: string;
  shortLabel?: string;
  path: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  groupKey: AdminNavigationGroupKey;
  order: number;
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
  requiredRole?: string;
  featureFlag?: string;
  badgeSource?: "media_review";
  isVisible?: boolean;
  isEnabled?: boolean;
  activeMatch?: string[];
  description?: string;
}

export type AdminSidebarMode = "expanded" | "collapsed";

export interface AdminSidebarState {
  mode: AdminSidebarMode;
  userPreference: AdminSidebarMode;
  temporaryExpansion: boolean;
  mobileOpen: boolean;
  lastChangedAt: string;
}
