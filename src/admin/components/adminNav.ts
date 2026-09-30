import type { ComponentType } from "react";
import { adminNavigationEntries } from "../navigation/AdminNavigationRegistry";

export interface AdminNavItemConfig {
  label: string;
  route: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  enabled: boolean;
  permission?: string;
}

export const adminNavItems: AdminNavItemConfig[] = adminNavigationEntries.map((item) => ({
  label: item.label,
  route: item.path,
  icon: item.icon,
  enabled: item.isEnabled !== false,
  permission: item.requiredPermission,
}));
